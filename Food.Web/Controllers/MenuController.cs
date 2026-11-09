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
    /// Endpoints for browsing and managing menu items and categories.
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

        [HttpGet("categories")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<object>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _menuService.GetAllCategoriesAsync();
            return Ok(ApiResponse<IEnumerable<object>>.OkResponse(categories, "Categories retrieved successfully."));
        }

        [HttpPost("categories")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        public async Task<IActionResult> AddCategory([FromBody] CreateCategoryDTO dto)
        {
            var id = await _menuService.AddCategoryAsync(dto);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.OkResponse(new { CategoryId = id }, "Category created successfully."));
        }

        [HttpGet("restaurant/{restaurantId}")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMenuByRestaurant(int restaurantId)
        {
            var menuItems = await _menuService.GetMenuByRestaurantAsync(restaurantId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Menu items retrieved successfully."));
        }

        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<MenuItemDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<MenuItemDTO>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMenuItemById(int id)
        {
            var menuItem = await _menuService.GetMenuItemByIdAsync(id);
            if (menuItem == null) return NotFound(ApiResponse<MenuItemDTO>.FailResponse("Menu item not found."));
            return Ok(ApiResponse<MenuItemDTO>.OkResponse(menuItem, "Menu item retrieved successfully."));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemDTO dto)
        {
            var id = await _menuService.AddMenuItemAsync(dto);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.OkResponse(new { MenuItemId = id }, "Menu item created successfully."));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> UpdateMenuItem(int id, [FromBody] UpdateMenuItemDTO dto)
        {
            if (dto.Id == 0) dto.Id = id;
            else if (id != dto.Id) return BadRequest(ApiResponse<object>.FailResponse("Menu item ID mismatch"));

            var success = await _menuService.UpdateMenuItemAsync(dto);
            if (!success) return NotFound(ApiResponse<object>.FailResponse("Menu item not found."));

            return Ok(ApiResponse<object>.OkResponse(null, "Menu item updated successfully."));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> DeleteMenuItem(int id)
        {
            var success = await _menuService.DeleteMenuItemAsync(id);
            if (!success) return NotFound(ApiResponse<object>.FailResponse("Menu item not found."));

            return Ok(ApiResponse<object>.OkResponse(null, "Menu item deleted successfully."));
        }

        [HttpPost("{id}/image")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
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

        [HttpGet("category/{categoryId}")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMenuByCategory(int categoryId)
        {
            var menuItems = await _menuService.GetMenuByCategoryAsync(categoryId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Menu items retrieved successfully."));
        }

        [HttpGet("search")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<MenuItemDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> SearchMenuItems([FromQuery] string q, [FromQuery] int? restaurantId = null)
        {
            if (string.IsNullOrWhiteSpace(q)) return BadRequest(ApiResponse<object>.FailResponse("Search term is required."));
            var menuItems = await _menuService.SearchMenuItemsAsync(q, restaurantId);
            return Ok(ApiResponse<IEnumerable<MenuItemDTO>>.OkResponse(menuItems, "Search completed successfully."));
        }
    }
}