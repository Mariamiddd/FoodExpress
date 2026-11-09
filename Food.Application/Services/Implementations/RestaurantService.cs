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
    public class RestaurantService : IRestaurantService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ILogger<RestaurantService> _logger;

        public RestaurantService(
            IUnitOfWork unitOfWork,
            IMapper mapper,
            ILogger<RestaurantService> logger)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<IEnumerable<RestaurantDTO>> GetAllRestaurantsAsync(
            string? search = null,
            int? categoryId = null,
            int page = 1,
            int pageSize = 50)
        {
            var restaurants = string.IsNullOrWhiteSpace(search)
                ? await _unitOfWork.Restaurants.GetAllAsync()
                : await _unitOfWork.Restaurants.SearchAsync(search);

            if (categoryId.HasValue && categoryId.Value > 0)
            {
                restaurants = restaurants.Where(r =>
                    r.MenuItems != null &&
                    r.MenuItems.Any(m => m.CategoryId == categoryId.Value));
            }

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var paged = restaurants
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return _mapper.Map<IEnumerable<RestaurantDTO>>(paged);
        }

        public async Task<RestaurantDTO?> GetRestaurantByIdAsync(int id)
        {
            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(id);
            return restaurant == null ? null : _mapper.Map<RestaurantDTO>(restaurant);
        }

        public async Task<IEnumerable<RestaurantDTO>> SearchRestaurantsAsync(string searchTerm)
        {
            var restaurants = await _unitOfWork.Restaurants.SearchAsync(searchTerm);
            return _mapper.Map<IEnumerable<RestaurantDTO>>(restaurants);
        }

        public async Task<int> AddRestaurantAsync(CreateRestaurantDTO dto)
        {
            var normalizedName = dto.Name.Trim();
            var existingRestaurants = await _unitOfWork.Restaurants.GetAllAsync();
            if (existingRestaurants.Any(r => r.Name.Equals(normalizedName, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException(ErrorMessages.RestaurantAlreadyExists);
            }

            var restaurant = _mapper.Map<Restaurant>(dto);
            restaurant.Name = normalizedName;
            restaurant.Address = dto.Address.Trim();

            await _unitOfWork.Restaurants.AddAsync(restaurant);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Created restaurant {RestaurantName} with ID {RestaurantId}", restaurant.Name, restaurant.Id);
            return restaurant.Id;
        }

        public async Task<bool> UpdateRestaurantAsync(UpdateRestaurantDTO dto)
        {
            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(dto.Id);
            if (restaurant == null) return false;

            var normalizedName = dto.Name.Trim();
            var existingRestaurants = await _unitOfWork.Restaurants.GetAllAsync();
            if (existingRestaurants.Any(r => r.Id != dto.Id && r.Name.Equals(normalizedName, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException(ErrorMessages.RestaurantAlreadyExists);
            }

            restaurant.Name = normalizedName;
            restaurant.Address = dto.Address.Trim();
            restaurant.IsActive = dto.IsActive;
            if (!string.IsNullOrWhiteSpace(dto.ImagePath))
            {
                restaurant.ImagePath = dto.ImagePath;
            }

            await _unitOfWork.Restaurants.UpdateAsync(restaurant);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Updated restaurant {RestaurantId} (IsActive={IsActive})", restaurant.Id, restaurant.IsActive);
            return true;
        }

        public async Task<bool> DeleteRestaurantAsync(int id)
        {
            var restaurant = await _unitOfWork.Restaurants.GetByIdAsync(id);
            if (restaurant == null) return false;

            await _unitOfWork.Restaurants.DeleteAsync(id);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Deleted restaurant {RestaurantId}", id);
            return true;
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
    }
}