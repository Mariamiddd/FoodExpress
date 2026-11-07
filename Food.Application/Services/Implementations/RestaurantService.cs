using AutoMapper;
using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Food.Application.Services.Implementations
{
    public class RestaurantService : IRestaurantService
    {
        private readonly IRestaurantRepository _restaurantRepository;
        private readonly IMapper _mapper;

        public RestaurantService(IRestaurantRepository restaurantRepository, IMapper mapper)
        {
            _restaurantRepository = restaurantRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<RestaurantDTO>> GetAllRestaurantsAsync(
            string? search = null,
            int? categoryId = null,
            int page = 1,
            int pageSize = 50)
        {
            var restaurants = string.IsNullOrWhiteSpace(search)
                ? await _restaurantRepository.GetAllAsync()
                : await _restaurantRepository.SearchAsync(search);

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
            var restaurant = await _restaurantRepository.GetByIdAsync(id);
            return restaurant == null ? null : _mapper.Map<RestaurantDTO>(restaurant);
        }

        public async Task<IEnumerable<RestaurantDTO>> SearchRestaurantsAsync(string searchTerm)
        {
            var restaurants = await _restaurantRepository.SearchAsync(searchTerm);
            return _mapper.Map<IEnumerable<RestaurantDTO>>(restaurants);
        }
    }
}