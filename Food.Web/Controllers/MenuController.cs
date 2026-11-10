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
    /// Endpoints for browsing and managing menu items and culinary categories.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class MenuController : ControllerBase
    {
        private readonly IMenuService _menuService;
        private readonly IImageUploadService _imageUploadService;

        public MenuController(IMenuService menuService, IImageUploadService imageUploadService)
        {
            _menuService = menuService;
            _imageUploadService = imageUploadService;
        }

        /// <summary>
        /// Retrieves all available menu categories.
        /// </summary>
        /// <returns>A list of all menu categories.</returns>
        [HttpGet("categories")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<object>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _menuService.GetAllCategoriesAsync();
            return Ok(ApiResponse<IEnumerable<object>>.OkResponse(categories, "Categories retrieved successfully."));
        }

        /// <summary>
        /// Creates a new menu category (Admin only).
        /// </summary>
        /// <param name="dto">The category creation details (category name).</param>
        /// <returns>The newly created category ID.</returns>
        [HttpPost("categories")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> AddCategory([FromBody] CreateCategoryDTO dto)
        {
            var id = await _menuService.AddCategoryAsync(dto);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.OkResponse(new { CategoryId = id }, "Category created successfully."));
        }

        /// <summary>
        /// Retrieves all menu items belonging to a specific restaurant.
        /// </summary>
        /// <param name="restaurantId">The restaurant ID.</param>
        /// <returns>A list of menu items for the specified restaurant.</returns>
        [HttpGet("restaurant/{restaurantId}")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMenuByRestaurant(int restaurantId)
        {
            var menuItems = await _menuService.GetMenuByRestaurantAsync(restaurantId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Menu items retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a specific menu item by its ID.
        /// </summary>
        /// <param name="id">The menu item ID.</param>
        /// <returns>The requested menu item details.</returns>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<MenuItemDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<MenuItemDTO>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMenuItemById(int id)
        {
            var menuItem = await _menuService.GetMenuItemByIdAsync(id);
            if (menuItem == null) return NotFound(ApiResponse<MenuItemDTO>.FailResponse("Menu item not found."));
            return Ok(ApiResponse<MenuItemDTO>.OkResponse(menuItem, "Menu item retrieved successfully."));
        }

        /// <summary>
        /// Creates a new menu item and assigns it to a restaurant and category (Admin only).
        /// </summary>
        /// <param name="dto">The menu item creation details (name, price, availability, restaurant ID, and category ID).</param>
        /// <returns>The newly created menu item ID.</returns>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemDTO dto)
        {
            var id = await _menuService.AddMenuItemAsync(dto);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.OkResponse(new { MenuItemId = id }, "Menu item created successfully."));
        }

        /// <summary>
        /// Updates an existing menu item's name, price, category, or availability (Admin only).
        /// </summary>
        /// <param name="id">The menu item ID to update.</param>
        /// <param name="dto">The updated menu item details.</param>
        /// <returns>A confirmation response indicating the update succeeded.</returns>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateMenuItem(int id, [FromBody] UpdateMenuItemDTO dto)
        {
            if (dto.Id == 0) dto.Id = id;
            else if (id != dto.Id) return BadRequest(ApiResponse<object>.FailResponse("Menu item ID mismatch"));

            var success = await _menuService.UpdateMenuItemAsync(dto);
            if (!success) return NotFound(ApiResponse<object>.FailResponse("Menu item not found."));

            return Ok(ApiResponse<object>.OkResponse(null, "Menu item updated successfully."));
        }

        /// <summary>
        /// Deletes a menu item by ID if it is not part of any existing customer orders (Admin only).
        /// </summary>
        /// <param name="id">The menu item ID to delete.</param>
        /// <returns>A confirmation response indicating the deletion succeeded.</returns>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteMenuItem(int id)
        {
            var success = await _menuService.DeleteMenuItemAsync(id);
            if (!success) return NotFound(ApiResponse<object>.FailResponse("Menu item not found."));

            return Ok(ApiResponse<object>.OkResponse(null, "Menu item deleted successfully."));
        }

        /// <summary>
        /// Uploads and attaches a photo to a specific menu item (Admin only).
        /// </summary>
        /// <param name="id">The target menu item ID.</param>
        /// <param name="image">The image file to upload.</param>
        /// <returns>The relative path to the uploaded menu item photo.</returns>
        [HttpPost("{id}/image")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadMenuItemImage(int id, IFormFile image)
        {
            if (image == null || image.Length == 0) return BadRequest(ApiResponse<object>.FailResponse("No image file provided"));

            using var validationStream = image.OpenReadStream();
            var validationResult = _imageUploadService.ValidateImage(validationStream, image.FileName, image.ContentType);
            if (!validationResult.IsValid) return BadRequest(ApiResponse<object>.FailResponse(validationResult.Message));

            using var saveStream = image.OpenReadStream();
            var relativePath = await _imageUploadService.SaveImageAsync(saveStream, image.FileName, "menu-items");

            var success = await _menuService.UpdateMenuItemImageAsync(id, relativePath);
            if (!success)
            {
                _imageUploadService.DeleteImage(relativePath);
                return NotFound(ApiResponse<object>.FailResponse("Menu item not found."));
            }

            return Ok(ApiResponse<object>.OkResponse(new { ImagePath = relativePath }, "Menu item image uploaded successfully."));
        }

        /// <summary>
        /// Retrieves all menu items across all restaurants within a specific category.
        /// </summary>
        /// <param name="categoryId">The category ID to filter by.</param>
        /// <returns>A list of menu items belonging to the specified category.</returns>
        [HttpGet("category/{categoryId}")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMenuByCategory(int categoryId)
        {
            var menuItems = await _menuService.GetMenuByCategoryAsync(categoryId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Menu items retrieved successfully."));
        }

        /// <summary>
        /// Searches menu items by dish name or category name, optionally scoped to a single restaurant.
        /// </summary>
        /// <param name="q">The search keyword.</param>
        /// <param name="restaurantId">Optional restaurant ID to restrict the search to a specific kitchen.</param>
        /// <returns>A list of matching menu items.</returns>
        [HttpGet("search")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SearchMenuItems([FromQuery] string q, [FromQuery] int? restaurantId = null)
        {
            if (string.IsNullOrWhiteSpace(q)) return BadRequest(ApiResponse<object>.FailResponse("Search term is required."));
            var menuItems = await _menuService.SearchMenuItemsAsync(q, restaurantId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Search completed successfully."));
        }
    }
}