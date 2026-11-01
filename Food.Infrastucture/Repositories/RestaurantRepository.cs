using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Infrastructure.Repositories
{
    public class RestaurantRepository : IRestaurantRepository
    {
        public Task AddAsync(Restaurant restaurant)
        {
            throw new NotImplementedException();
        }

        public Task DeleteAsync(int id)
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<Restaurant>> GetAllAsync()
        {
            throw new NotImplementedException();
        }

        public Task<Restaurant> GetByIdAsync(int id)
        {
            throw new NotImplementedException();
        }

        public Task<IEnumerable<Restaurant>> SearchAsync(string searchTerm)
        {
            throw new NotImplementedException();
        }

        public Task UpdateAsync(Restaurant restaurant)
        {
            throw new NotImplementedException();
        }
    }
}
