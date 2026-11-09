using Food.Application.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Food.Application.Services.Interfaces
{
    public interface IRestaurantService
    {
        Task<IEnumerable<RestaurantDTO>> GetAllRestaurantsAsync(string? search = null, int? categoryId = null, int page = 1, int pageSize = 50);
        Task<RestaurantDTO?> GetRestaurantByIdAsync(int id);
        Task<IEnumerable<RestaurantDTO>> SearchRestaurantsAsync(string searchTerm);
        Task<int> AddRestaurantAsync(CreateRestaurantDTO dto);
        Task<bool> UpdateRestaurantAsync(UpdateRestaurantDTO dto);
        Task<bool> DeleteRestaurantAsync(int id);
        Task<bool> UpdateRestaurantImageAsync(int restaurantId, string imagePath);
    }
}