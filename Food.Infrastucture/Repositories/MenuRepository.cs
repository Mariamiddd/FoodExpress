using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Infrastructure.Repositories
{
    public class MenuRepository : IMenuRepository
    {
        private readonly FoodDbContext _context;

        public MenuRepository(FoodDbContext context)
        {
            _context = context;
        }

        public async Task<MenuItem> GetByIdAsync(int id)
        {
            return await _context.MenuItems.FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<IEnumerable<MenuItem>> GetAllAsync()
        {
            return await _context.MenuItems
                   .Include(m => m.Restaurant)
                   .Include(m => m.Category)
                   .ToListAsync();
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
            var menuItem = await GetByIdAsync(id);
            if (menuItem != null)
            {
                _context.MenuItems.Remove(menuItem);
            }
        }
    }
}
