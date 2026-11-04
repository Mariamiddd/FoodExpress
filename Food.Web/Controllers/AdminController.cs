using Food.Application.DTOs;
using Food.Application.Services.Implementations;
using Food.Application.Services.Interfaces;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Administrative endpoints for managing restaurants, menu items, categories, images, and user roles.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Produces("application/json")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly ImageUploadService _imageUploadService;

        public AdminController(IAdminService adminService, ImageUploadService imageUploadService)
        {
            _adminService = adminService;
            _imageUploadService = imageUploadService;
        }

        /// <summary>
        /// Creates a new restaurant.
        /// </summary>
        [HttpPost("restaurants")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AddRestaurant([FromBody] CreateRestaurantDTO dto)
        {
            var id = await _adminService.AddRestaurantAsync(dto);
            return CreatedAtAction(
                nameof(AddRestaurant),
                new { id },
                ApiResponse<object>.OkResponse(new { RestaurantId = id }, "Restaurant created successfully"));
        }

        /// <summary>
        /// Updates an existing restaurant's name and address.
        /// </summary>
        [HttpPut("restaurants/{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateRestaurant(int id, [FromBody] UpdateRestaurantDTO dto)
        {
            if (id != dto.Id)
            {
                return BadRequest(ApiResponse<object>.FailResponse("Restaurant ID mismatch"));
            }

            var success = await _adminService.UpdateRestaurantAsync(dto);
            if (!success)
            {
                return NotFound(ApiResponse<object>.FailResponse("Restaurant not found"));
            }

            return Ok(ApiResponse<object>.OkResponse(null, "Restaurant updated successfully"));
        }

        /// <summary>
        /// Deletes a restaurant by ID.
        /// </summary>
        [HttpDelete("restaurants/{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteRestaurant(int id)
        {
            var success = await _adminService.DeleteRestaurantAsync(id);
            if (!success)
            {
                return NotFound(ApiResponse<object>.FailResponse("Restaurant not found"));
            }

            return Ok(ApiResponse<object>.OkResponse(null, "Restaurant deleted successfully"));
        }

        /// <summary>
        /// Creates a new menu item for a restaurant.
        /// </summary>
        [HttpPost("menuitems")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AddMenuItem([FromBody] CreateMenuItemDTO dto)
        {
            var id = await _adminService.AddMenuItemAsync(dto);
            return CreatedAtAction(
                nameof(AddMenuItem),
                new { id },
                ApiResponse<object>.OkResponse(new { MenuItemId = id }, "Menu item created successfully"));
        }

        /// <summary>
        /// Updates an existing menu item's name, price, category, or availability.
        /// </summary>
        [HttpPut("menuitems/{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateMenuItem(int id, [FromBody] UpdateMenuItemDTO dto)
        {
            if (id != dto.Id)
            {
                return BadRequest(ApiResponse<object>.FailResponse("Menu item ID mismatch"));
            }

            var success = await _adminService.UpdateMenuItemAsync(dto);
            if (!success)
            {
                return NotFound(ApiResponse<object>.FailResponse("Menu item not found"));
            }

            return Ok(ApiResponse<object>.OkResponse(null, "Menu item updated successfully"));
        }

        /// <summary>
        /// Deletes a menu item by ID.
        /// </summary>
        [HttpDelete("menuitems/{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteMenuItem(int id)
        {
            var success = await _adminService.DeleteMenuItemAsync(id);
            if (!success)
            {
                return NotFound(ApiResponse<object>.FailResponse("Menu item not found"));
            }

            return Ok(ApiResponse<object>.OkResponse(null, "Menu item deleted successfully"));
        }

        /// <summary>
        /// Retrieves all menu categories.
        /// </summary>
        [HttpGet("categories")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<object>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _adminService.GetAllCategoriesAsync();
            return Ok(ApiResponse<IEnumerable<object>>.OkResponse(categories, "Categories retrieved successfully"));
        }

        /// <summary>
        /// Adds a new menu category.
        /// </summary>
        [HttpPost("categories")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AddCategory([FromBody] CreateCategoryDTO dto)
        {
            var id = await _adminService.AddCategoryAsync(dto);
            return CreatedAtAction(
                nameof(AddCategory),
                new { id },
                ApiResponse<object>.OkResponse(new { CategoryId = id }, "Category created successfully"));
        }

        /// <summary>
        /// Promotes an existing registered user to the Admin role by email.
        /// </summary>
        /// <param name="email">Registered email address of the user to promote.</param>
        [HttpPost("users/promote")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PromoteUserToAdmin([FromQuery] string email)
        {
            await _adminService.PromoteUserToAdminAsync(email);
            return Ok(ApiResponse<object>.OkResponse(null, $"User '{email}' promoted to Admin successfully"));
        }

        /// <summary>
        /// Uploads and attaches a cover image to a restaurant.
        /// </summary>
        [HttpPost("restaurants/{id}/image")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadRestaurantImage(int id, IFormFile image)
        {
            if (image == null || image.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailResponse("No image file provided"));
            }

            using var validationStream = image.OpenReadStream();
            var validationResult = _imageUploadService.ValidateImage(validationStream, image.FileName, image.ContentType);

            if (!validationResult.IsValid)
            {
                return BadRequest(ApiResponse<object>.FailResponse(validationResult.Message));
            }

            using var saveStream = image.OpenReadStream();
            var relativePath = await _imageUploadService.SaveImageAsync(saveStream, image.FileName, "restaurants");

            var success = await _adminService.UpdateRestaurantImageAsync(id, relativePath);
            if (!success)
            {
                _imageUploadService.DeleteImage(relativePath);
                return NotFound(ApiResponse<object>.FailResponse("Restaurant not found"));
            }

            return Ok(ApiResponse<object>.OkResponse(new { ImagePath = relativePath }, "Restaurant image uploaded successfully"));
        }

        /// <summary>
        /// Uploads and attaches an image to a menu item.
        /// </summary>
        [HttpPost("menuitems/{id}/image")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadMenuItemImage(int id, IFormFile image)
        {
            if (image == null || image.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailResponse("No image file provided"));
            }

            using var validationStream = image.OpenReadStream();
            var validationResult = _imageUploadService.ValidateImage(validationStream, image.FileName, image.ContentType);

            if (!validationResult.IsValid)
            {
                return BadRequest(ApiResponse<object>.FailResponse(validationResult.Message));
            }

            using var saveStream = image.OpenReadStream();
            var relativePath = await _imageUploadService.SaveImageAsync(saveStream, image.FileName, "menu-items");

            var success = await _adminService.UpdateMenuItemImageAsync(id, relativePath);
            if (!success)
            {
                _imageUploadService.DeleteImage(relativePath);
                return NotFound(ApiResponse<object>.FailResponse("Menu item not found"));
            }

            return Ok(ApiResponse<object>.OkResponse(new { ImagePath = relativePath }, "Menu item image uploaded successfully"));
        }
    }
}