using AutoMapper;
using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

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

        public async Task<IEnumerable<RestaurantDTO>> GetAllRestaurantsAsync()
        {
            var restaurants = await _restaurantRepository.GetAllAsync();
            return _mapper.Map<IEnumerable<RestaurantDTO>>(restaurants);
        }

        public async Task<RestaurantDTO> GetRestaurantByIdAsync(int id)
        {
            var restaurant = await _restaurantRepository.GetByIdAsync(id);
            return _mapper.Map<RestaurantDTO>(restaurant);
        }

        public async Task<IEnumerable<RestaurantDTO>> SearchRestaurantsAsync(string searchTerm)
        {
            var restaurants = await _restaurantRepository.SearchAsync(searchTerm);
            return _mapper.Map<IEnumerable<RestaurantDTO>>(restaurants);
        }
    }
}
