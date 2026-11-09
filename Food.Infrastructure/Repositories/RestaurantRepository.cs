using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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
                .AsNoTracking()
                .Include(r => r.MenuItems)
                    .ThenInclude(m => m.Category)
                .ToListAsync();
        }

        public async Task<Restaurant?> GetByIdAsync(int id)
        {
            return await _context.Restaurants
                .Include(r => r.MenuItems)
                    .ThenInclude(m => m.Category)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<Restaurant>> SearchAsync(string searchTerm)
        {
            var query = _context.Restaurants
                .AsNoTracking()
                .Include(r => r.MenuItems)
                    .ThenInclude(m => m.Category)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var normalized = searchTerm.Trim().ToLower();
                query = query.Where(r =>
                    r.Name.ToLower().Contains(normalized) ||
                    r.Address.ToLower().Contains(normalized));
            }

            return await query.ToListAsync();
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
            var restaurant = await _context.Restaurants
                .Include(r => r.MenuItems)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (restaurant == null)
                return;

            var hasOrders = await _context.Orders.AnyAsync(o => o.RestaurantId == id) ||
                            await _context.OrderItems.AnyAsync(oi => oi.MenuItem.RestaurantId == id);

            if (hasOrders)
            {
                throw new InvalidOperationException(
                    "Cannot delete this restaurant because it has existing customer orders. Mark it as Closed (Inactive) instead.");
            }

            var menuItemIds = restaurant.MenuItems.Select(m => m.Id).ToList();
            if (menuItemIds.Count > 0)
            {
                var cartItems = await _context.CartItems
                    .Where(ci => menuItemIds.Contains(ci.MenuItemId))
                    .ToListAsync();

                if (cartItems.Count > 0)
                {
                    _context.CartItems.RemoveRange(cartItems);
                }
            }

            _context.Restaurants.Remove(restaurant);
        }
    }
}