using AutoMapper;
using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;

namespace Food.Application.Services
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

        public async Task<OrderDTO> GetOrderByIdAsync(int id)
        {
            var order = await _unitOfWork.Orders.GetOrderByIdAsync(id);

            if (order == null) return null;

            return _mapper.Map<OrderDTO>(order);
        }

        public async Task<IEnumerable<OrderDTO>> GetAllOrdersAsync()
        {

            var orders = await _unitOfWork.Orders.GetAllAsync();

            return _mapper.Map<IEnumerable<OrderDTO>>(orders);
        }

        // ახალი მეთოდი შეკვეთის შესაქმნელად

        public async Task<OrderDTO> CreateOrderAsync(int userId, int addressId)
        {
            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);

            // ვალიდაცია: კალათა ცარიელი არ უნდა იყოს
            if (cart == null || !cart.CartItems.Any())
                throw new InvalidOperationException("კალათა ცარიელი არ უნდა იყოს.");

            // ვალიდაცია: რაოდენობა და ხელმისაწვდომობა
            if (cart.CartItems.Any(ci => ci.Quantity <= 0 || !ci.MenuItem.IsAvailable))
                throw new InvalidOperationException("კალათაში არის მიუწვდომელი ან არასწორი რაოდენობის პროდუქტი.");

            // ვალიდაცია: ერთი რესტორნის წესი
            var restaurantIds = cart.CartItems.Select(ci => ci.MenuItem.RestaurantId).Distinct().ToList();
            if (restaurantIds.Count > 1)
                throw new InvalidOperationException("ერთ შეკვეთაში კერძები მხოლოდ ერთი რესტორნიდან უნდა იყოს.");

            // შეკვეთის ინიციალიზაცია
            var order = new Order
            {
                UserId = userId,
                RestaurantId = restaurantIds.First(),
                AddressId = addressId,
                CreatedAt = DateTime.UtcNow
                // Status ავტომატურად იქნება OrderState.Created (default)
            };

            decimal totalPrice = 0;

            // კალათის ნივთების გადატანა შეკვეთაში
            foreach (var item in cart.CartItems)
            {
                var orderItem = new OrderItem
                {
                    MenuItemId = item.MenuItemId,
                    Name = item.MenuItem.Name,
                    Quantity = item.Quantity,
                    PriceAtTimeOfOrder = item.MenuItem.Price // ფიქსირდება მიმდინარე ფასი
                };

                totalPrice += orderItem.LineTotal;
                order.OrderItems.Add(orderItem);
            }

            order.TotalPrice = totalPrice;

            // შენახვა და კალათის გასუფთავება ერთ ტრანზაქციაში
            await _unitOfWork.Orders.AddAsync(order);
            _unitOfWork.Carts.ClearCart(cart);

            await _unitOfWork.SaveAsync();

            return new OrderDTO
            {
                Id = order.Id,
                OrderDate = order.CreatedAt,
                TotalAmount = order.TotalPrice,
                Status = order.Status.ToString()
            };
        }

        public async Task<bool> UpdateOrderStatusAsync(int orderId, string newStatus)
        {
            var order = await _unitOfWork.Orders.GetOrderByIdAsync(orderId);
            if (order == null)
                return false;

            // სტატუსის ცვლილება Domain ლოგიკის გამოყენებით
            switch (newStatus.ToUpper())
            {
                case "CONFIRMED":
                    order.Confirm();
                    break;
                case "PREPARING":
                    order.StartPreparing();
                    break;
                case "ONTHEWAY":
                    order.SendForDelivery();
                    break;
                case "DELIVERED":
                    order.MarkAsDelivered();
                    break;
                case "CANCELLED":
                    // ვალიდაცია: შეკვეთის გაუქმება მხოლოდ CREATED ან CONFIRMED სტატუსშია შესაძლებელი
                    if (order.Status.ToString().ToUpper() != "CREATED" && order.Status.ToString().ToUpper() != "CONFIRMED")
                    {
                        throw new InvalidOperationException($"შეკვეთის გაუქმება ამ ეტაპზე ({order.Status}) შეუძლებელია.");
                    }
                    order.Cancel();
                    break;
                default:
                    // ვალიდაცია: არასწორი სტატუსი
                    throw new ArgumentException("არასწორი სტატუსი.");
            }

            await _unitOfWork.Orders.UpdateAsync(order);
            await _unitOfWork.SaveAsync();

            return true;
        }


    }
}