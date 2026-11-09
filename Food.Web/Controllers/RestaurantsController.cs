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

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        public async Task<IActionResult> CreateRestaurant([FromBody] CreateRestaurantDTO dto)
        {
            var id = await _restaurantService.AddRestaurantAsync(dto);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.OkResponse(new { RestaurantId = id }, "Restaurant created successfully."));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateRestaurant(int id, [FromBody] UpdateRestaurantDTO dto)
        {
            if (dto.Id == 0) dto.Id = id;
            else if (id != dto.Id) return BadRequest(ApiResponse<object>.FailResponse("Restaurant ID mismatch"));

            var success = await _restaurantService.UpdateRestaurantAsync(dto);
            if (!success) return NotFound(ApiResponse<object>.FailResponse("Restaurant not found."));

            return Ok(ApiResponse<object>.OkResponse(null, "Restaurant updated successfully."));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteRestaurant(int id)
        {
            var success = await _restaurantService.DeleteRestaurantAsync(id);
            if (!success) return NotFound(ApiResponse<object>.FailResponse("Restaurant not found."));

            return Ok(ApiResponse<object>.OkResponse(null, "Restaurant deleted successfully."));
        }

        [HttpPost("{id}/menu")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        public async Task<IActionResult> AddMenuItemToRestaurant(int id, [FromBody] CreateMenuItemDTO dto)
        {
            dto.RestaurantId = id;
            var menuItemId = await _menuService.AddMenuItemAsync(dto);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.OkResponse(new { MenuItemId = menuItemId }, "Menu item added successfully."));
        }

        [HttpPost("{id}/image")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
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