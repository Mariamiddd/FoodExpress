using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Interfaces
{
    public interface IRestaurantService
    {
        Task<IEnumerable<RestaurantDTO>> GetAllRestaurantsAsync(string? search = null, int? categoryId = null, int page = 1, int pageSize = 50);
        Task<RestaurantDTO?> GetRestaurantByIdAsync(int id);
        Task<IEnumerable<RestaurantDTO>> SearchRestaurantsAsync(string searchTerm);
    }
}
