using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Endpoints for querying menu items by restaurant, category, or search keyword.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class MenuController : ControllerBase
    {
        private readonly IMenuService _menuService;
        private readonly IAdminService _adminService;

        public MenuController(IMenuService menuService, IAdminService adminService)
        {
            _menuService = menuService;
            _adminService = adminService;
        }

        /// <summary>
        /// Retrieves all available food categories.
        /// </summary>
        [HttpGet("categories")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<object>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _adminService.GetAllCategoriesAsync();
            return Ok(ApiResponse<IEnumerable<object>>.OkResponse(categories, "Categories retrieved successfully."));
        }

        /// <summary>
        /// Retrieves all menu items belonging to a specific restaurant.
        /// </summary>
        /// <param name="restaurantId">The restaurant ID.</param>
        [HttpGet("restaurant/{restaurantId}")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMenuByRestaurant(int restaurantId)
        {
            var menuItems = await _menuService.GetMenuByRestaurantAsync(restaurantId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Menu items retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a single menu item by its unique ID.
        /// </summary>
        /// <param name="id">The menu item ID.</param>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<MenuItemDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<MenuItemDTO>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMenuItemById(int id)
        {
            var menuItem = await _menuService.GetMenuItemByIdAsync(id);
            if (menuItem == null)
            {
                return NotFound(ApiResponse<MenuItemDTO>.FailResponse("Menu item not found."));
            }

            return Ok(ApiResponse<MenuItemDTO>.OkResponse(menuItem, "Menu item retrieved successfully."));
        }

        /// <summary>
        /// Retrieves all menu items belonging to a specific category.
        /// </summary>
        /// <param name="categoryId">The category ID.</param>
        [HttpGet("category/{categoryId}")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMenuByCategory(int categoryId)
        {
            var menuItems = await _menuService.GetMenuByCategoryAsync(categoryId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Menu items retrieved successfully."));
        }

        /// <summary>
        /// Searches menu items by name or category across all or a specific restaurant.
        /// </summary>
        /// <param name="q">Search term.</param>
        /// <param name="restaurantId">Optional restaurant ID filter.</param>
        [HttpGet("search")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SearchMenuItems([FromQuery] string q, [FromQuery] int? restaurantId = null)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(ApiResponse<object>.FailResponse("Search term is required."));
            }

            var menuItems = await _menuService.SearchMenuItemsAsync(q, restaurantId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Search completed successfully."));
        }
    }
}