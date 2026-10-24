using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Interfaces
{
    public interface ICartService
    {
        Task<object> GetCartAsync(string userId);
        Task AddToCartAsync(string userId, AddToCartDTO dto);
        Task UpdateCartItemAsync(string userId, int menuItemId, int quantity);
        Task RemoveFromCartAsync(string userId, int menuItemId);
    }
}