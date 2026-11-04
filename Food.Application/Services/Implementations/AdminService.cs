using AutoMapper;
using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Domain.Models.Identity;
using Food.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Implementations
{
    public class AdminService : IAdminService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ILogger<AdminService> _logger;

        public AdminService(
            IUnitOfWork unitOfWork,
            IMapper mapper,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ILogger<AdminService> logger)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _userManager = userManager;
            _roleManager = roleManager;
            _logger = logger;
        }

        public async Task<int> AddRestaurantAsync(CreateRestaurantDTO dto)
        {
            var restaurant = _mapper.Map<Restaurant>(dto);
            await _unitOfWork.Restaurants.AddAsync(restaurant);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Admin created restaurant {RestaurantName} with ID {RestaurantId}", restaurant.Name, restaurant.Id);
            return restaurant.Id;
        }

        public async Task<bool> UpdateRestaurantAsync(UpdateRestaurantDTO dto)
        {
            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(dto.Id);
            if (restaurant == null) return false;

            restaurant.Name = dto.Name.Trim();
            restaurant.Address = dto.Address.Trim();
            if (!string.IsNullOrWhiteSpace(dto.ImagePath))
            {
                restaurant.ImagePath = dto.ImagePath;
            }

            await _unitOfWork.Restaurants.UpdateAsync(restaurant);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Admin updated restaurant {RestaurantId}", restaurant.Id);
            return true;
        }

        public async Task<bool> DeleteRestaurantAsync(int id)
        {
            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(id);
            if (restaurant == null) return false;

            await _unitOfWork.Restaurants.DeleteAsync(id);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Admin deleted restaurant {RestaurantId}", id);
            return true;
        }

        public async Task<int> AddMenuItemAsync(CreateMenuItemDTO dto)
        {
            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(dto.RestaurantId)
                ?? throw new KeyNotFoundException(ErrorMessages.RestaurantNotFound);

            var category = await _unitOfWork.Menu.GetCategoryByIdAsync(dto.CategoryId)
                ?? throw new KeyNotFoundException(ErrorMessages.CategoryNotFound);

            var menuItem = _mapper.Map<MenuItem>(dto);
            menuItem.RestaurantId = restaurant.Id;
            menuItem.CategoryId = category.Id;

            await _unitOfWork.Menu.AddAsync(menuItem);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Admin added menu item {MenuItemName} (ID: {MenuItemId}) to restaurant {RestaurantId}", menuItem.Name, menuItem.Id, restaurant.Id);
            return menuItem.Id;
        }

        public async Task<bool> UpdateMenuItemAsync(UpdateMenuItemDTO dto)
        {
            var menuItem = await _unitOfWork.Menu.GetByIdAsync(dto.Id);
            if (menuItem == null) return false;

            var category = await _unitOfWork.Menu.GetCategoryByIdAsync(dto.CategoryId)
                ?? throw new KeyNotFoundException(ErrorMessages.CategoryNotFound);

            menuItem.Name = dto.Name.Trim();
            menuItem.Price = dto.Price;
            menuItem.IsAvailable = dto.IsAvailable;
            menuItem.CategoryId = category.Id;

            if (dto.RestaurantId > 0)
            {
                var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(dto.RestaurantId)
                    ?? throw new KeyNotFoundException(ErrorMessages.RestaurantNotFound);
                menuItem.RestaurantId = restaurant.Id;
            }

            if (!string.IsNullOrWhiteSpace(dto.ImagePath))
            {
                menuItem.ImagePath = dto.ImagePath;
            }

            await _unitOfWork.Menu.UpdateAsync(menuItem);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Admin updated menu item {MenuItemId}", menuItem.Id);
            return true;
        }

        public async Task<bool> DeleteMenuItemAsync(int id)
        {
            var menuItem = await _unitOfWork.Menu.GetByIdAsync(id);
            if (menuItem == null) return false;

            await _unitOfWork.Menu.DeleteAsync(id);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Admin deleted menu item {MenuItemId}", id);
            return true;
        }

        public async Task<int> AddCategoryAsync(CreateCategoryDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Category name is required.");

            var existingCategories = await _unitOfWork.Menu.GetAllCategoriesAsync();
            if (existingCategories.Any(c => c.Name.Equals(dto.Name.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException(ErrorMessages.CategoryAlreadyExists);
            }

            var category = new Category { Name = dto.Name.Trim() };
            await _unitOfWork.Menu.AddCategoryAsync(category);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Admin created category {CategoryName} with ID {CategoryId}", category.Name, category.Id);
            return category.Id;
        }

        public async Task<IEnumerable<object>> GetAllCategoriesAsync()
        {
            var categories = await _unitOfWork.Menu.GetAllCategoriesAsync();
            return categories.Select(c => new { c.Id, c.Name });
        }

        public async Task<bool> UpdateRestaurantImageAsync(int restaurantId, string imagePath)
        {
            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(restaurantId);
            if (restaurant == null) return false;

            restaurant.ImagePath = imagePath;
            await _unitOfWork.Restaurants.UpdateAsync(restaurant);
            await _unitOfWork.SaveAsync();
            return true;
        }

        public async Task<bool> UpdateMenuItemImageAsync(int menuItemId, string imagePath)
        {
            var menuItem = await _unitOfWork.Menu.GetByIdAsync(menuItemId);
            if (menuItem == null) return false;

            menuItem.ImagePath = imagePath;
            await _unitOfWork.Menu.UpdateAsync(menuItem);
            await _unitOfWork.SaveAsync();
            return true;
        }

        public async Task<bool> PromoteUserToAdminAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("User email is required.");

            var user = await _userManager.FindByEmailAsync(email.Trim())
                ?? throw new KeyNotFoundException($"No user found with email '{email}'.");

            if (!await _roleManager.RoleExistsAsync("Admin"))
            {
                await _roleManager.CreateAsync(new IdentityRole("Admin"));
            }

            if (await _userManager.IsInRoleAsync(user, "Admin"))
            {
                throw new InvalidOperationException($"User '{email}' is already an Admin.");
            }

            var result = await _userManager.AddToRoleAsync(user, "Admin");
            if (!result.Succeeded)
            {
                throw new InvalidOperationException("Failed to assign Admin role.");
            }

            _logger.LogInformation("User {Email} was promoted to Admin", email);
            return true;
        }
    }
}