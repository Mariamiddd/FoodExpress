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
    public class MenuRepository : IMenuRepository
    {
        private readonly FoodDbContext _context;

        public MenuRepository(FoodDbContext context)
        {
            _context = context;
        }

        public async Task<MenuItem?> GetByIdAsync(int id)
        {
            return await _context.MenuItems
                .Include(m => m.Restaurant)
                .Include(m => m.Category)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<IEnumerable<MenuItem>> GetAllAsync()
        {
            return await _context.MenuItems
                .AsNoTracking()
                .Include(m => m.Restaurant)
                .Include(m => m.Category)
                .ToListAsync();
        }

        public async Task<IEnumerable<MenuItem>> GetByRestaurantIdAsync(int restaurantId)
        {
            return await _context.MenuItems
                .AsNoTracking()
                .Include(m => m.Restaurant)
                .Include(m => m.Category)
                .Where(m => m.RestaurantId == restaurantId)
                .ToListAsync();
        }

        public async Task<IEnumerable<MenuItem>> GetByCategoryIdAsync(int categoryId)
        {
            return await _context.MenuItems
                .AsNoTracking()
                .Include(m => m.Restaurant)
                .Include(m => m.Category)
                .Where(m => m.CategoryId == categoryId)
                .ToListAsync();
        }

        public async Task<IEnumerable<MenuItem>> SearchAsync(string searchTerm, int? restaurantId = null)
        {
            var query = _context.MenuItems
                .AsNoTracking()
                .Include(m => m.Restaurant)
                .Include(m => m.Category)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var normalized = searchTerm.Trim().ToLower();
                query = query.Where(m =>
                    m.Name.ToLower().Contains(normalized) ||
                    m.Category.Name.ToLower().Contains(normalized));
            }

            if (restaurantId.HasValue)
            {
                query = query.Where(m => m.RestaurantId == restaurantId.Value);
            }

            return await query.ToListAsync();
        }

        public async Task AddAsync(MenuItem menuItem)
        {
            await _context.MenuItems.AddAsync(menuItem);
        }

        public Task UpdateAsync(MenuItem menuItem)
        {
            _context.MenuItems.Update(menuItem);
            return Task.CompletedTask;
        }

        public async Task DeleteAsync(int id)
        {
            var menuItem = await _context.MenuItems.FindAsync(id);
            if (menuItem == null)
                return;

            var isUsedInOrders = await _context.OrderItems.AnyAsync(oi => oi.MenuItemId == id);
            if (isUsedInOrders)
            {
                throw new InvalidOperationException(
                    "Cannot delete this menu item because it is part of existing customer orders. Mark it as Unavailable instead.");
            }

            var cartItems = await _context.CartItems
                .Where(ci => ci.MenuItemId == id)
                .ToListAsync();

            if (cartItems.Count > 0)
            {
                _context.CartItems.RemoveRange(cartItems);
            }

            _context.MenuItems.Remove(menuItem);
        }

        public async Task<IEnumerable<Category>> GetAllCategoriesAsync()
        {
            return await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.Id)
                .ToListAsync();
        }

        public async Task<Category?> GetCategoryByIdAsync(int id)
        {
            return await _context.Categories.FindAsync(id);
        }

        public async Task AddCategoryAsync(Category category)
        {
            await _context.Categories.AddAsync(category);
        }
    }
}