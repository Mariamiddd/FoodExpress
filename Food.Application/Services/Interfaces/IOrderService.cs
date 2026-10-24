using Food.Application.DTOs;
using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Interfaces
{
    public interface IOrderService
    {
        Task<IEnumerable<OrderDTO>> GetAllOrdersAsync();
        Task<OrderDTO> GetOrderByIdAsync(int orderId);
        Task<OrderDTO> GetUserOrdersAsync(string userId);
        Task<OrderDTO> CreateOrderAsync(string userId, int addressId);
        Task<bool> UpdateOrderStatusAsync(int orderId, OrderState newStatus);
    }
}
