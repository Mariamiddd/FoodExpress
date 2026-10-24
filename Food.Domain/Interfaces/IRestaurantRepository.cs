using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Interfaces
{
    public interface IRestaurantRepository
    {
        Task<IEnumerable<Restaurant>> GetAllAsync();
        Task<Restaurant> GetByIdAsync(int id);
        Task<IEnumerable<Restaurant>> SearchAsync(string searchTerm);
        Task AddAsync(Restaurant restaurant);
        Task UpdateAsync(Restaurant restaurant);
        Task DeleteAsync(int id);
    }
}
