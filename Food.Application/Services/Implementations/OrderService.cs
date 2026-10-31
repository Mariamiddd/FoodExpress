using AutoMapper;
using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;

namespace Food.Application.Services.Implementations
{
    public class OrderService : IOrderService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public OrderService(IUnitOfWork unitOfWork, IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<IEnumerable<OrderDTO>> GetAllOrdersAsync()
        {
            var orders = await _unitOfWork.Orders.GetAllAsync();
            return _mapper.Map<IEnumerable<OrderDTO>>(orders);
        }

        public async Task<OrderDTO> GetOrderByIdAsync(int orderId)
        {
            var order = await _unitOfWork.Orders.GetOrderByIdAsync(orderId);
            return _mapper.Map<OrderDTO>(order);
        }

        public async Task<IEnumerable<OrderDTO>> GetUserOrdersAsync(string userId)
        {
            var orders = await _unitOfWork.Orders.GetAllAsync();
            var userOrders = orders.Where(o => o.UserId == userId);
            return _mapper.Map<IEnumerable<OrderDTO>>(userOrders);
        }

        public async Task<OrderDTO> CreateOrderAsync(string userId, int addressId)
        {
            var addresses = await _unitOfWork.Addresses.GetAddressesByUserIdAsync(userId);

            if (!addresses.Any(a => a.Id == addressId))
            {
                throw new UnauthorizedAccessException(
                    "The selected address does not belong to this user.");
            }

            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);

            if (cart == null || !cart.CartItems.Any())
                throw new Exception("კალათა ცარი ელია. შეკვეთა ვერ შეიქმნება.");

            // validation all items in the cart belong to the same restaurant
            var restaurantIds = cart.CartItems.Select(ci => ci.MenuItem.RestaurantId).Distinct().ToList();
            if (restaurantIds.Count > 1)
                throw new Exception("ერთ შეკვეთაში კერძები მხოლოდ ერთი რესტორნიდან უნდა იყოს.");

            var order = new Order
            {
                UserId = userId,
                AddressId = addressId,
                RestaurantId = restaurantIds.First(),
                CreatedAt = DateTime.UtcNow
            };

            decimal total = 0;
            foreach (var cartItem in cart.CartItems)
            {
                // UnitPrice is set to the current price of the MenuItem at the time of order creation
                var unitPrice = cartItem.MenuItem.Price;
                order.OrderItems.Add(new OrderItem
                {
                    MenuItemId = cartItem.MenuItemId,
                    Quantity = cartItem.Quantity,
                    UnitPrice = unitPrice,
                    Name = cartItem.MenuItem.Name
                });
                total += (unitPrice * cartItem.Quantity);
            }

            order.TotalPrice = total;

            await _unitOfWork.Orders.AddAsync(order);
            _unitOfWork.Carts.ClearCart(cart); // კალათის გასუფთავება შეკვეთის შემდეგ
            await _unitOfWork.SaveAsync();

            return _mapper.Map<OrderDTO>(order);
        }

        public async Task<bool> UpdateOrderStatusAsync(int orderId, OrderState newStatus)
        {
            var order = await _unitOfWork.Orders.GetOrderByIdAsync(orderId);
            if (order == null) return false;

            // if the order is already delivered or cancelled, we cannot change its status
            if (newStatus == OrderState.Cancelled && (order.Status != OrderState.Created && order.Status != OrderState.Confirmed))
            {
                throw new Exception("გაუქმება დაშვებული მხოლოდ Created ან Confirmed სტატუსიდან.");
            }

            // Validate the status transition
            if (newStatus == OrderState.Confirmed && order.Status != OrderState.Created)
                throw new Exception("შეკვეთა დასტურდება მხოლოდ Created სტატუსიდან.");
            if (newStatus == OrderState.Preparing && order.Status != OrderState.Confirmed)
                throw new Exception("მომზადება დაიწყება მხოლოდ Confirmed სტატუსიდან.");
            if (newStatus == OrderState.OnTheWay && order.Status != OrderState.Preparing)
                throw new Exception("დელივერი დაიწყება მხოლოდ Preparing სტატუსიდან.");
            if (newStatus == OrderState.Delivered && order.Status != OrderState.OnTheWay)
                throw new Exception("მიტანა დასრულდება მხოლოდ OnTheWay სტატუსიდან.");

            order.Status = newStatus;
            await _unitOfWork.Orders.UpdateAsync(order);
            await _unitOfWork.SaveAsync();

            return true;
        }
    }
}
