using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;

namespace Food.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MenuController : ControllerBase
    {
        private readonly IMenuService _menuService;

        public MenuController(IMenuService menuService)
        {
            _menuService = menuService;
        }

        [HttpGet("restaurant/{restaurantId}")]
        public async Task<IActionResult> GetMenuByRestaurant(int restaurantId)
        {
            var menuItems = await _menuService.GetMenuByRestaurantAsync(restaurantId);

            return Ok(new
            {
                Success = true,
                Message = "Menu items retrieved successfully.",
                Data = menuItems,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetMenuItemById(int id)
        {
            var menuItem = await _menuService.GetMenuItemByIdAsync(id);

            if (menuItem == null)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Menu item not found.",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Menu item retrieved successfully.",
                Data = menuItem,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetMenuByCategory(int categoryId)
        {
            var menuItems = await _menuService.GetMenuByCategoryAsync(categoryId);

            return Ok(new
            {
                Success = true,
                Message = "Menu items retrieved successfully.",
                Data = menuItems,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchMenuItems([FromQuery] string q, [FromQuery] int? restaurantId = null)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Search term is required.",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            var menuItems = await _menuService.SearchMenuItemsAsync(q, restaurantId);

            return Ok(new
            {
                Success = true,
                Message = "Search completed successfully.",
                Data = menuItems,
                Errors = (Dictionary<string, string[]>?)null
            });
        }
    }
}