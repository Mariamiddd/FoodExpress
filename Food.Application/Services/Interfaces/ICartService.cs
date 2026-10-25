using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Interfaces
{
    public interface ICartService
    {
        Task<object> GetCartAsync(int userId);
        Task AddToCartAsync(int userId, AddToCartDTO dto);
        Task UpdateCartItemAsync(int userId, int menuItemId, int quantity);
        Task RemoveFromCartAsync(int userId, int menuItemId);
    }
}