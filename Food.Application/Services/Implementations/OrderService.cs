using AutoMapper;
using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Application.Validators;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Food.Application.Services.Implementations
{
    public class OrderService : IOrderService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ILogger<OrderService> _logger;

        public OrderService(IUnitOfWork unitOfWork, IMapper mapper, ILogger<OrderService> logger)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<IEnumerable<OrderDTO>> GetAllOrdersAsync()
        {
            _logger.LogInformation("Retrieving all orders");
            var orders = await _unitOfWork.Orders.GetAllAsync();
            return _mapper.Map<IEnumerable<OrderDTO>>(orders);
        }

        public async Task<OrderDTO?> GetOrderByIdAsync(int orderId)
        {
            _logger.LogInformation("Retrieving order with ID: {OrderId}", orderId);
            var order = await _unitOfWork.Orders.GetOrderByIdAsync(orderId);
            return order == null ? null : _mapper.Map<OrderDTO>(order);
        }

        public async Task<IEnumerable<OrderDTO>> GetUserOrdersAsync(string userId)
        {
            _logger.LogInformation("Retrieving orders for user: {UserId}", userId);
            var orders = await _unitOfWork.Orders.GetOrdersByUserIdAsync(userId);
            return _mapper.Map<IEnumerable<OrderDTO>>(orders);
        }

        public async Task<OrderDTO> CreateOrderAsync(string userId, int addressId)
        {
            _logger.LogInformation("Creating order for user: {UserId} with address: {AddressId}", userId, addressId);

            var addresses = await _unitOfWork.Addresses.GetAddressesByUserIdAsync(userId);
            BusinessRulesValidator.ValidateUserAddressOwnership(addresses, addressId);

            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            BusinessRulesValidator.ValidateCartForCheckout(cart);

            var restaurantId = cart!.CartItems.First().MenuItem.RestaurantId;
            var restaurant = cart.CartItems.First().MenuItem.Restaurant;
            if (restaurant == null && _unitOfWork.Restaurants != null)
            {
                restaurant = await _unitOfWork.Restaurants.GetByIdAsync(restaurantId);
            }

            if (restaurant != null && !restaurant.IsActive)
            {
                throw new InvalidOperationException(ErrorMessages.RestaurantClosed);
            }

            var order = new Order
            {
                UserId = userId,
                AddressId = addressId,
                RestaurantId = restaurantId,
                CreatedAt = DateTime.UtcNow,
                Status = OrderState.Created
            };

            decimal total = 0m;
            foreach (var cartItem in cart.CartItems)
            {
                // Server-side pricing computation using current database price
                var unitPrice = cartItem.MenuItem.Price;
                var orderItem = new OrderItem
                {
                    MenuItemId = cartItem.MenuItemId,
                    Quantity = cartItem.Quantity,
                    UnitPrice = unitPrice,
                    PriceAtTimeOfOrder = unitPrice,
                    Name = cartItem.MenuItem.Name
                };
                order.OrderItems.Add(orderItem);
                total += unitPrice * cartItem.Quantity;
            }

            order.TotalPrice = total;

            await _unitOfWork.Orders.AddAsync(order);
            _unitOfWork.Carts.ClearCart(cart);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Order created successfully with ID: {OrderId} for user: {UserId}", order.Id, userId);

            var savedOrder = await _unitOfWork.Orders.GetOrderByIdAsync(order.Id) ?? order;
            return _mapper.Map<OrderDTO>(savedOrder);
        }

        public async Task<bool> UpdateOrderStatusAsync(int orderId, OrderState newStatus)
        {
            _logger.LogInformation("Updating order {OrderId} status to {NewStatus}", orderId, newStatus);

            var order = await _unitOfWork.Orders.GetOrderByIdAsync(orderId)
                ?? throw new KeyNotFoundException(ErrorMessages.OrderNotFound);

            switch (newStatus)
            {
                case OrderState.Confirmed:
                    order.Confirm();
                    break;
                case OrderState.Preparing:
                    order.StartPreparing();
                    break;
                case OrderState.OnTheWay:
                    order.SendForDelivery();
                    break;
                case OrderState.Delivered:
                    order.MarkAsDelivered();
                    break;
                case OrderState.Cancelled:
                    order.Cancel();
                    break;
                default:
                    _logger.LogError("Invalid status transition to {NewStatus} for order {OrderId}", newStatus, orderId);
                    throw new InvalidOperationException($"State transition to {newStatus} is not supported.");
            }

            await _unitOfWork.Orders.UpdateAsync(order);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Order {OrderId} status updated to {NewStatus}", orderId, newStatus);
            return true;
        }

        public async Task<bool> CancelOrderAsync(int orderId, string userId, bool isAdmin)
        {
            var order = await _unitOfWork.Orders.GetOrderByIdAsync(orderId)
                ?? throw new KeyNotFoundException(ErrorMessages.OrderNotFound);

            if (!isAdmin && order.UserId != userId)
            {
                throw new UnauthorizedAccessException(ErrorMessages.OwnershipRequired);
            }

            order.Cancel();

            await _unitOfWork.Orders.UpdateAsync(order);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Order {OrderId} cancelled by user {UserId}", orderId, userId);
            return true;
        }
    }
}