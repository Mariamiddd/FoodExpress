using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Endpoints for browsing restaurants, searching, and viewing restaurant menus.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class RestaurantsController : ControllerBase
    {
        private readonly IRestaurantService _restaurantService;
        private readonly IAdminService _adminService;

        public RestaurantsController(IRestaurantService restaurantService, IAdminService adminService)
        {
            _restaurantService = restaurantService;
            _adminService = adminService;
        }

        /// <summary>
        /// Retrieves all restaurants with optional search, category filtering, and pagination.
        /// </summary>
        /// <param name="search">Optional search keyword matching restaurant name or address.</param>
        /// <param name="categoryId">Optional category ID to filter restaurants serving that category.</param>
        /// <param name="page">Page number (default: 1).</param>
        /// <param name="pageSize">Items per page (default: 50, max: 100).</param>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<RestaurantDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllRestaurants(
            [FromQuery] string? search = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var restaurants = await _restaurantService.GetAllRestaurantsAsync(search, categoryId, page, pageSize);
            return Ok(ApiResponse<IEnumerable<RestaurantDTO>>.OkResponse(restaurants, "Restaurants retrieved successfully."));
        }

        /// <summary>
        /// Retrieves details and menu items for a specific restaurant by ID.
        /// </summary>
        /// <param name="id">The unique identifier of the restaurant.</param>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<RestaurantDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<RestaurantDTO>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRestaurantById(int id)
        {
            var restaurant = await _restaurantService.GetRestaurantByIdAsync(id);
            if (restaurant == null)
            {
                return NotFound(ApiResponse<RestaurantDTO>.FailResponse("Restaurant not found."));
            }

            return Ok(ApiResponse<RestaurantDTO>.OkResponse(restaurant, "Restaurant retrieved successfully."));
        }

        /// <summary>
        /// Searches restaurants by name or street address.
        /// </summary>
        /// <param name="q">Search query string.</param>
        [HttpGet("search")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<RestaurantDTO>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SearchRestaurants([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(ApiResponse<object>.FailResponse("Search term is required."));
            }

            var restaurants = await _restaurantService.SearchRestaurantsAsync(q);
            return Ok(ApiResponse<IEnumerable<RestaurantDTO>>.OkResponse(restaurants, "Search completed successfully."));
        }

        /// <summary>
        /// Retrieves all menu items for a specific restaurant.
        /// </summary>
        /// <param name="id">The restaurant ID.</param>
        [HttpGet("{id}/menu")]
        [ProducesResponseType(typeof(ApiResponse<List<MenuItemDTO>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRestaurantMenu(int id)
        {
            var restaurant = await _restaurantService.GetRestaurantByIdAsync(id);
            if (restaurant == null)
            {
                return NotFound(ApiResponse<object>.FailResponse("Restaurant not found."));
            }

            return Ok(ApiResponse<List<MenuItemDTO>>.OkResponse(
                restaurant.MenuItems ?? new List<MenuItemDTO>(),
                "Menu retrieved successfully."));
        }

        /// <summary>
        /// Creates a new restaurant (Admin only).
        /// </summary>
        /// <param name="dto">Restaurant name and address.</param>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> CreateRestaurant([FromBody] CreateRestaurantDTO dto)
        {
            var id = await _adminService.AddRestaurantAsync(dto);
            return CreatedAtAction(
                nameof(GetRestaurantById),
                new { id },
                ApiResponse<object>.OkResponse(new { RestaurantId = id }, "Restaurant created successfully."));
        }

        /// <summary>
        /// Adds a new menu item to the specified restaurant (Admin only).
        /// </summary>
        /// <param name="id">The target restaurant ID.</param>
        /// <param name="dto">Menu item details and price.</param>
        [HttpPost("{id}/menu")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> AddMenuItemToRestaurant(int id, [FromBody] CreateMenuItemDTO dto)
        {
            dto.RestaurantId = id;
            var menuItemId = await _adminService.AddMenuItemAsync(dto);
            return CreatedAtAction(
                nameof(GetRestaurantMenu),
                new { id },
                ApiResponse<object>.OkResponse(new { MenuItemId = menuItemId }, "Menu item added to restaurant successfully."));
        }
    }
}