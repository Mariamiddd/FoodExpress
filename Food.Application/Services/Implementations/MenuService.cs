using AutoMapper;
using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Food.Application.Services.Implementations
{
    public class MenuService : IMenuService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ILogger<MenuService> _logger;

        public MenuService(
            IUnitOfWork unitOfWork,
            IMapper mapper,
            ILogger<MenuService> logger)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<IEnumerable<MenuItemDTO>> GetMenuByRestaurantAsync(int restaurantId)
        {
            var menuItems = await _unitOfWork.Menu.GetByRestaurantIdAsync(restaurantId);
            return _mapper.Map<IEnumerable<MenuItemDTO>>(menuItems);
        }

        public async Task<MenuItemDTO?> GetMenuItemByIdAsync(int id)
        {
            var menuItem = await _unitOfWork.Menu.GetByIdAsync(id);
            return menuItem == null ? null : _mapper.Map<MenuItemDTO>(menuItem);
        }

        public async Task<IEnumerable<MenuItemDTO>> GetMenuByCategoryAsync(int categoryId)
        {
            var menuItems = await _unitOfWork.Menu.GetByCategoryIdAsync(categoryId);
            return _mapper.Map<IEnumerable<MenuItemDTO>>(menuItems);
        }

        public async Task<IEnumerable<MenuItemDTO>> SearchMenuItemsAsync(string searchTerm, int? restaurantId = null)
        {
            var menuItems = await _unitOfWork.Menu.SearchAsync(searchTerm, restaurantId);
            return _mapper.Map<IEnumerable<MenuItemDTO>>(menuItems);
        }

        public async Task<int> AddMenuItemAsync(CreateMenuItemDTO dto)
        {
            if (dto.Price <= 0)
            {
                throw new ArgumentException(ErrorMessages.MenuItemPriceInvalid);
            }

            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(dto.RestaurantId)
                ?? throw new KeyNotFoundException(ErrorMessages.RestaurantNotFound);

            var category = await _unitOfWork.Menu.GetCategoryByIdAsync(dto.CategoryId)
                ?? throw new KeyNotFoundException(ErrorMessages.CategoryNotFound);

            var normalizedName = dto.Name.Trim();
            var existingItems = await _unitOfWork.Menu.GetByRestaurantIdAsync(dto.RestaurantId);
            if (existingItems.Any(m => m.Name.Equals(normalizedName, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException(ErrorMessages.MenuItemAlreadyExists);
            }

            var menuItem = _mapper.Map<MenuItem>(dto);
            menuItem.Name = normalizedName;
            menuItem.RestaurantId = restaurant.Id;
            menuItem.CategoryId = category.Id;

            await _unitOfWork.Menu.AddAsync(menuItem);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Added menu item {MenuItemName} (ID: {MenuItemId}) to restaurant {RestaurantId}", menuItem.Name, menuItem.Id, restaurant.Id);
            return menuItem.Id;
        }

        public async Task<bool> UpdateMenuItemAsync(UpdateMenuItemDTO dto)
        {
            if (dto.Price <= 0)
            {
                throw new ArgumentException(ErrorMessages.MenuItemPriceInvalid);
            }

            var menuItem = await _unitOfWork.Menu.GetByIdAsync(dto.Id);
            if (menuItem == null) return false;

            var category = await _unitOfWork.Menu.GetCategoryByIdAsync(dto.CategoryId)
                ?? throw new KeyNotFoundException(ErrorMessages.CategoryNotFound);

            var targetRestaurantId = dto.RestaurantId > 0 ? dto.RestaurantId : menuItem.RestaurantId;
            var restaurantItems = await _unitOfWork.Menu.GetByRestaurantIdAsync(targetRestaurantId);
            var normalizedName = dto.Name.Trim();

            if (restaurantItems.Any(m => m.Id != dto.Id && m.Name.Equals(normalizedName, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException(ErrorMessages.MenuItemAlreadyExists);
            }

            menuItem.Name = normalizedName;
            menuItem.Price = dto.Price;
            menuItem.IsAvailable = dto.IsAvailable;
            menuItem.CategoryId = category.Id;
            menuItem.Category = category;

            if (dto.RestaurantId > 0 && dto.RestaurantId != menuItem.RestaurantId)
            {
                var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(dto.RestaurantId)
                    ?? throw new KeyNotFoundException(ErrorMessages.RestaurantNotFound);
                menuItem.RestaurantId = restaurant.Id;
                menuItem.Restaurant = restaurant;
            }

            if (!string.IsNullOrWhiteSpace(dto.ImagePath))
            {
                menuItem.ImagePath = dto.ImagePath;
            }

            await _unitOfWork.Menu.UpdateAsync(menuItem);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Updated menu item {MenuItemId}", menuItem.Id);
            return true;
        }

        public async Task<bool> DeleteMenuItemAsync(int id)
        {
            var menuItem = await _unitOfWork.Menu.GetByIdAsync(id);
            if (menuItem == null) return false;

            await _unitOfWork.Menu.DeleteAsync(id);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Deleted menu item {MenuItemId}", id);
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

            _logger.LogInformation("Created category {CategoryName} with ID {CategoryId}", category.Name, category.Id);
            return category.Id;
        }

        public async Task<IEnumerable<object>> GetAllCategoriesAsync()
        {
            var categories = await _unitOfWork.Menu.GetAllCategoriesAsync();
            return categories.Select(c => new { c.Id, c.Name });
        }
    }
}