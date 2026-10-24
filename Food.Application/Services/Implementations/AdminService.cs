using AutoMapper;
using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Domain.Models.Entities;
using Food.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class AdminService : IAdminService
    {
        private readonly FoodDbContext _context;
        private readonly IMapper _mapper;

        public AdminService(FoodDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // Restaurant operations
        public async Task<int> AddRestaurantAsync(CreateRestaurantDTO dto)
        {
            var restaurant = _mapper.Map<Restaurant>(dto);
            await _context.Restaurants.AddAsync(restaurant);
            await _context.SaveChangesAsync();
            return restaurant.Id;
        }

        public async Task<bool> UpdateRestaurantAsync(UpdateRestaurantDTO dto)
        {
            var restaurant = await _context.Restaurants.FindAsync(dto.Id);
            if (restaurant == null) return false;

            restaurant.Name = dto.Name;
            restaurant.Address = dto.Address;
            _context.Restaurants.Update(restaurant);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteRestaurantAsync(int id)
        {
            var restaurant = await _context.Restaurants.FindAsync(id);
            if (restaurant == null) return false;

            _context.Restaurants.Remove(restaurant);
            await _context.SaveChangesAsync();
            return true;
        }

        // Menu Item operations
        public async Task<int> AddMenuItemAsync(CreateMenuItemDTO dto)
        {
            var menuItem = _mapper.Map<MenuItem>(dto);
            await _context.MenuItems.AddAsync(menuItem);
            await _context.SaveChangesAsync();
            return menuItem.Id;
        }

        public async Task<bool> UpdateMenuItemAsync(UpdateMenuItemDTO dto)
        {
            var menuItem = await _context.MenuItems.FindAsync(dto.Id);
            if (menuItem == null) return false;

            menuItem.Name = dto.Name;
            menuItem.Price = dto.Price;
            menuItem.IsAvailable = dto.IsAvailable;
            menuItem.CategoryId = dto.CategoryId;
            _context.MenuItems.Update(menuItem);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteMenuItemAsync(int id)
        {
            var menuItem = await _context.MenuItems.FindAsync(id);
            if (menuItem == null) return false;

            _context.MenuItems.Remove(menuItem);
            await _context.SaveChangesAsync();
            return true;
        }

        // Category operations
        public async Task<int> AddCategoryAsync(CreateCategoryDTO dto)
        {
            var category = _mapper.Map<Category>(dto);
            await _context.Categories.AddAsync(category);
            await _context.SaveChangesAsync();
            return category.Id;
        }
    }
}
