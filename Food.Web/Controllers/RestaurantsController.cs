using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Endpoints for browsing restaurants, searching, and managing restaurant records and images.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class RestaurantsController : ControllerBase
    {
        private readonly IRestaurantService _restaurantService;
        private readonly IMenuService _menuService;
        private readonly IImageUploadService _imageUploadService;

        public RestaurantsController(
            IRestaurantService restaurantService,
            IMenuService menuService,
            IImageUploadService imageUploadService)
        {
            _restaurantService = restaurantService;
            _menuService = menuService;
            _imageUploadService = imageUploadService;
        }

        /// <summary>
        /// Retrieves a paginated list of restaurants with optional keyword search and category filtering.
        /// </summary>
        /// <param name="search">Optional search keyword matching restaurant name or address.</param>
        /// <param name="categoryId">Optional category ID to filter restaurants serving dishes in that category.</param>
        /// <param name="page">The page number to retrieve (default is 1).</param>
        /// <param name="pageSize">The number of restaurants per page (default is 50, max is 100).</param>
        /// <returns>A filtered and paginated list of restaurants.</returns>
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
        /// Retrieves a specific restaurant and its menu items by restaurant ID.
        /// </summary>
        /// <param name="id">The unique identifier of the restaurant.</param>
        /// <returns>The requested restaurant details and menu catalog.</returns>
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
        /// <param name="q">The search query term.</param>
        /// <returns>A list of restaurants matching the search term.</returns>
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
        /// Retrieves the full menu for a specific restaurant.
        /// </summary>
        /// <param name="id">The unique identifier of the restaurant.</param>
        /// <returns>A list of menu items belonging to the specified restaurant.</returns>
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
            return Ok(ApiResponse<List<MenuItemDTO>>.OkResponse(restaurant.MenuItems ?? new List<MenuItemDTO>(), "Menu retrieved successfully."));
        }

        // --- ADMIN RESTAURANT ENDPOINTS ---

        /// <summary>
        /// Creates a new restaurant in the platform catalog (Admin only).
        /// </summary>
        /// <param name="dto">The restaurant creation details (name, address, optional image path, and active status).</param>
        /// <returns>The newly created restaurant ID.</returns>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> CreateRestaurant([FromBody] CreateRestaurantDTO dto)
        {
            var id = await _restaurantService.AddRestaurantAsync(dto);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.OkResponse(new { RestaurantId = id }, "Restaurant created successfully."));
        }

        /// <summary>
        /// Updates an existing restaurant's name, address, image path, and active status (Admin only).
        /// </summary>
        /// <param name="id">The restaurant ID to update.</param>
        /// <param name="dto">The updated restaurant details.</param>
        /// <returns>A confirmation response indicating the update succeeded.</returns>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateRestaurant(int id, [FromBody] UpdateRestaurantDTO dto)
        {
            if (dto.Id == 0) dto.Id = id;
            else if (id != dto.Id) return BadRequest(ApiResponse<object>.FailResponse("Restaurant ID mismatch"));

            var success = await _restaurantService.UpdateRestaurantAsync(dto);
            if (!success) return NotFound(ApiResponse<object>.FailResponse("Restaurant not found."));

            return Ok(ApiResponse<object>.OkResponse(null, "Restaurant updated successfully."));
        }

        /// <summary>
        /// Deletes a restaurant by ID if it has no historical customer orders (Admin only).
        /// </summary>
        /// <param name="id">The restaurant ID to delete.</param>
        /// <returns>A confirmation response indicating the deletion succeeded.</returns>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteRestaurant(int id)
        {
            var success = await _restaurantService.DeleteRestaurantAsync(id);
            if (!success) return NotFound(ApiResponse<object>.FailResponse("Restaurant not found."));

            return Ok(ApiResponse<object>.OkResponse(null, "Restaurant deleted successfully."));
        }

        /// <summary>
        /// Adds a new menu item directly to a specific restaurant's menu (Admin only).
        /// </summary>
        /// <param name="id">The target restaurant ID.</param>
        /// <param name="dto">The menu item details (name, price, category ID, and availability).</param>
        /// <returns>The newly created menu item ID.</returns>
        [HttpPost("{id}/menu")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AddMenuItemToRestaurant(int id, [FromBody] CreateMenuItemDTO dto)
        {
            dto.RestaurantId = id;
            var menuItemId = await _menuService.AddMenuItemAsync(dto);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.OkResponse(new { MenuItemId = menuItemId }, "Menu item added successfully."));
        }

        /// <summary>
        /// Uploads and attaches a cover image to a restaurant (Admin only).
        /// </summary>
        /// <param name="id">The target restaurant ID.</param>
        /// <param name="image">The image file to upload.</param>
        /// <returns>The relative path to the uploaded restaurant cover image.</returns>
        [HttpPost("{id}/image")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadRestaurantImage(int id, IFormFile image)
        {
            if (image == null || image.Length == 0) return BadRequest(ApiResponse<object>.FailResponse("No image file provided"));

            using var validationStream = image.OpenReadStream();
            var validationResult = _imageUploadService.ValidateImage(validationStream, image.FileName, image.ContentType);
            if (!validationResult.IsValid) return BadRequest(ApiResponse<object>.FailResponse(validationResult.Message));

            using var saveStream = image.OpenReadStream();
            var relativePath = await _imageUploadService.SaveImageAsync(saveStream, image.FileName, "restaurants");

            var success = await _restaurantService.UpdateRestaurantImageAsync(id, relativePath);
            if (!success)
            {
                _imageUploadService.DeleteImage(relativePath);
                return NotFound(ApiResponse<object>.FailResponse("Restaurant not found."));
            }

            return Ok(ApiResponse<object>.OkResponse(new { ImagePath = relativePath }, "Restaurant image uploaded successfully."));
        }
    }
}