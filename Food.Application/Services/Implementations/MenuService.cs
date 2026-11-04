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
            var menuItems = await _menuRepository.GetByRestaurantIdAsync(restaurantId);
            return _mapper.Map<IEnumerable<MenuItemDTO>>(menuItems);
        }

        public async Task<MenuItemDTO> GetMenuItemByIdAsync(int id)
        {
            var menuItem = await _menuRepository.GetByIdAsync(id);
            return _mapper.Map<MenuItemDTO>(menuItem);
        }

        public async Task<IEnumerable<MenuItemDTO>> GetMenuByCategoryAsync(int categoryId)
        {
            var menuItems = await _menuRepository.GetByCategoryIdAsync(categoryId);
            return _mapper.Map<IEnumerable<MenuItemDTO>>(menuItems);
        }

        public async Task<IEnumerable<MenuItemDTO>> SearchMenuItemsAsync(string searchTerm, int? restaurantId = null)
        {
            var menuItems = await _menuRepository.SearchAsync(searchTerm, restaurantId);
            return _mapper.Map<IEnumerable<MenuItemDTO>>(menuItems);
        }
    }
}