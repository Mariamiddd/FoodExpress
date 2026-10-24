using AutoMapper;
using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Food.Application.Services.Implementations
{
    public class MenuService : IMenuService
    {
        private readonly IMenuRepository _menuRepository;
        private readonly IMapper _mapper;

        public MenuService(IMenuRepository menuRepository, IMapper mapper)
        {
            _menuRepository = menuRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<MenuItemDTO>> GetMenuByRestaurantAsync(int restaurantId)
        {
            var menuItems = await _menuRepository.GetAllAsync();
            var filtered = menuItems.Where(m => m.RestaurantId == restaurantId).ToList();
            return _mapper.Map<IEnumerable<MenuItemDTO>>(filtered);
        }

        public async Task<MenuItemDTO> GetMenuItemByIdAsync(int id)
        {
            var menuItem = await _menuRepository.GetByIdAsync(id);
            return _mapper.Map<MenuItemDTO>(menuItem);
        }

        public async Task<IEnumerable<MenuItemDTO>> GetMenuByCategoryAsync(int categoryId)
        {
            var menuItems = await _menuRepository.GetAllAsync();
            var filtered = menuItems.Where(m => m.CategoryId == categoryId).ToList();
            return _mapper.Map<IEnumerable<MenuItemDTO>>(filtered);
        }

        public async Task<IEnumerable<MenuItemDTO>> SearchMenuItemsAsync(string searchTerm, int? restaurantId = null)
        {
            var menuItems = await _menuRepository.GetAllAsync();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                searchTerm = searchTerm.ToLower();
                menuItems = menuItems.Where(m => m.Name.ToLower().Contains(searchTerm)).ToList();
            }

            if (restaurantId.HasValue)
            {
                menuItems = menuItems.Where(m => m.RestaurantId == restaurantId.Value).ToList();
            }

            return _mapper.Map<IEnumerable<MenuItemDTO>>(menuItems);
        }
    }
}
