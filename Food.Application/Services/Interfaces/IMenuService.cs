using Food.Application.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Food.Application.Services.Interfaces
{
    public interface IMenuService
    {
        Task<IEnumerable<MenuItemDTO>> GetMenuByRestaurantAsync(int restaurantId);
        Task<MenuItemDTO?> GetMenuItemByIdAsync(int id);
        Task<IEnumerable<MenuItemDTO>> GetMenuByCategoryAsync(int categoryId);
        Task<IEnumerable<MenuItemDTO>> SearchMenuItemsAsync(string searchTerm, int? restaurantId = null);
        Task<int> AddMenuItemAsync(CreateMenuItemDTO dto);
        Task<bool> UpdateMenuItemAsync(UpdateMenuItemDTO dto);
        Task<bool> DeleteMenuItemAsync(int id);
        Task<bool> UpdateMenuItemImageAsync(int menuItemId, string imagePath);
        Task<int> AddCategoryAsync(CreateCategoryDTO dto);
        Task<IEnumerable<object>> GetAllCategoriesAsync();
    }
}