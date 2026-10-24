using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Food.Infrastructure.Repositories
{
    public class RestaurantRepository : IRestaurantRepository
    {
        private readonly FoodDbContext _context;

        public RestaurantRepository(FoodDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Restaurant>> GetAllAsync()
        {
            return await _context.Restaurants
                .Include(r => r.MenuItems)
                .ThenInclude(m => m.Category)
                .ToListAsync();
        }

        public async Task<Restaurant> GetByIdAsync(int id)
        {
            return await _context.Restaurants
                .Include(r => r.MenuItems)
                .ThenInclude(m => m.Category)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<Restaurant>> SearchAsync(string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return await GetAllAsync();

            searchTerm = searchTerm.ToLower();
            return await _context.Restaurants
                .Include(r => r.MenuItems)
                .ThenInclude(m => m.Category)
                .Where(r => r.Name.ToLower().Contains(searchTerm) || 
                           r.Address.ToLower().Contains(searchTerm))
                .ToListAsync();
        }

        public async Task AddAsync(Restaurant restaurant)
        {
            await _context.Restaurants.AddAsync(restaurant);
        }

        public Task UpdateAsync(Restaurant restaurant)
        {
            _context.Restaurants.Update(restaurant);
            return Task.CompletedTask;
        }

        public async Task DeleteAsync(int id)
        {
            var restaurant = await GetByIdAsync(id);
            if (restaurant != null)
            {
                _context.Restaurants.Remove(restaurant);
            }
        }
    }
}
