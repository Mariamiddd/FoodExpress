using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Interfaces
{
    public interface IRestaurantService
    {
        Task<IEnumerable<RestaurantDTO>> GetAllRestaurantsAsync();
        Task<RestaurantDTO> GetRestaurantByIdAsync(int id);
        Task<IEnumerable<RestaurantDTO>> SearchRestaurantsAsync(string searchTerm);
    }
}
