using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Interfaces
{
    public interface IAdminService
    {
        // Restaurant operations
        Task<int> AddRestaurantAsync(CreateRestaurantDTO dto);
        Task<bool> UpdateRestaurantAsync(UpdateRestaurantDTO dto);
        Task<bool> DeleteRestaurantAsync(int id);

        // Menu Item operations
        Task<int> AddMenuItemAsync(CreateMenuItemDTO dto);
        Task<bool> UpdateMenuItemAsync(UpdateMenuItemDTO dto);
        Task<bool> DeleteMenuItemAsync(int id);

        // Category operations
        Task<int> AddCategoryAsync(CreateCategoryDTO dto);
        Task<IEnumerable<object>> GetAllCategoriesAsync();

        // Image operations
        Task<bool> UpdateRestaurantImageAsync(int restaurantId, string imagePath);
        Task<bool> UpdateMenuItemImageAsync(int menuItemId, string imagePath);

        // Role Management operations
        Task<bool> PromoteUserToAdminAsync(string email);
    }
}