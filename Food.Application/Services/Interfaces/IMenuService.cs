using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Interfaces
{
    public interface IMenuService
    {
        Task<IEnumerable<MenuItemDTO>> GetMenuByRestaurantAsync(int restaurantId);
        Task<MenuItemDTO> GetMenuItemByIdAsync(int id);
        Task<IEnumerable<MenuItemDTO>> GetMenuByCategoryAsync(int categoryId);
        Task<IEnumerable<MenuItemDTO>> SearchMenuItemsAsync(string searchTerm, int? restaurantId = null);
    }
}
