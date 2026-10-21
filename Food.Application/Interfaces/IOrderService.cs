using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Interfaces
{
    public interface IOrderService
    {
        Task<OrderDTO> GetOrderByIdAsync(int id);
        Task<IEnumerable<OrderDTO>> GetAllOrdersAsync();

        // ახალი მეთოდები
        Task<bool> UpdateOrderStatusAsync(int orderId, string newStatus);

        Task<OrderDTO> CreateOrderAsync(int userId, int addressId);
    }
}