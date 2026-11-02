using Food.Application.DTOs;
using Food.Application.Services.Implementations;
using Food.Application.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Food.Web.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")] 
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly ImageUploadService _imageUploadService;

        public AdminController(IAdminService adminService, IWebHostEnvironment webHostEnvironment)
        {
            _adminService = adminService;
            var uploadPath = Path.Combine(webHostEnvironment.WebRootPath, "uploads");
            _imageUploadService = new ImageUploadService(uploadPath);
        }

        [HttpPost("restaurants")]
        public async Task<IActionResult> AddRestaurant([FromBody] CreateRestaurantDTO dto)
        {
        
                var id = await _adminService.AddRestaurantAsync(dto);
            var response = new
            {
                Success = true,
                Message = "Restaurant created successfully",
                Data = new { RestaurantId = id },
                Errors = (Dictionary<string, string[]>?)null
            };
                return CreatedAtAction(nameof(AddRestaurant), new { id }, new { Message = "Restaurant created successfully", RestaurantId = id });
           
        }

        [HttpPut("restaurants/{id}")]
        public async Task<IActionResult> UpdateRestaurant(int id, [FromBody] UpdateRestaurantDTO dto)
        {
            if (id != dto.Id)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Restaurant ID mismatch",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            var success = await _adminService.UpdateRestaurantAsync(dto);
            if (!success)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Restaurant not found",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Restaurant updated successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpDelete("restaurants/{id}")]
        public async Task<IActionResult> DeleteRestaurant(int id)
        {
            var success = await _adminService.DeleteRestaurantAsync(id);
            if (!success)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Restaurant not found",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Restaurant deleted successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpPost("menuitems")]
        public async Task<IActionResult> AddMenuItem([FromBody] CreateMenuItemDTO dto)
        {
            var id = await _adminService.AddMenuItemAsync(dto);

            var response = new
            {
                Success = true,
                Message = "Menu item created successfully",
                Data = new { MenuItemId = id },
                Errors = (Dictionary<string, string[]>?)null
            };

            return CreatedAtAction(nameof(AddMenuItem), new { id }, response);
        }

        [HttpPut("menuitems/{id}")]
        public async Task<IActionResult> UpdateMenuItem(int id, [FromBody] UpdateMenuItemDTO dto)
        {
            if (id != dto.Id)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Menu item ID mismatch",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            var success = await _adminService.UpdateMenuItemAsync(dto);
            if (!success)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Menu item not found",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Menu item updated successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpDelete("menuitems/{id}")]
        public async Task<IActionResult> DeleteMenuItem(int id)
        {
            var success = await _adminService.DeleteMenuItemAsync(id);
            if (!success)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Menu item not found",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Menu item deleted successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpPost("categories")]
        public async Task<IActionResult> AddCategory([FromBody] CreateCategoryDTO dto)
        {
            var id = await _adminService.AddCategoryAsync(dto);

            var response = new
            {
                Success = true,
                Message = "Category created successfully",
                Data = new { CategoryId = id },
                Errors = (Dictionary<string, string[]>?)null
            };

            return CreatedAtAction(nameof(AddCategory), new { id }, response);
        }

        [HttpPost("restaurants/{id}/image")]
        public async Task<IActionResult> UploadRestaurantImage(int id, IFormFile image)
        {
            if (image == null || image.Length == 0)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "No image file provided",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            try
            {
                // Validate image
                var validationResult = _imageUploadService.ValidateImage(
                    image.OpenReadStream(),
                    image.FileName,
                    image.ContentType);

                if (!validationResult.IsValid)
                {
                    return BadRequest(new
                    {
                        Success = false,
                        Message = validationResult.Message,
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                // Save image
                var relativePath = await _imageUploadService.SaveImageAsync(
                    image.OpenReadStream(),
                    image.FileName,
                    "restaurants");

                // Update restaurant with image path
                var updateDto = new UpdateRestaurantDTO { Id = id, ImagePath = relativePath };
                var success = await _adminService.UpdateRestaurantImageAsync(id, relativePath);

                if (!success)
                {
                    _imageUploadService.DeleteImage(relativePath);
                    return NotFound(new
                    {
                        Success = false,
                        Message = "Restaurant not found",
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                return Ok(new
                {
                    Success = true,
                    Message = "Restaurant image uploaded successfully",
                    Data = new { ImagePath = relativePath },
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Success = false,
                    Message = ex.Message,
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
        }

        [HttpPost("menuitems/{id}/image")]
        public async Task<IActionResult> UploadMenuItemImage(int id, IFormFile image)
        {
            if (image == null || image.Length == 0)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "No image file provided",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            try
            {
                // Validate image
                var validationResult = _imageUploadService.ValidateImage(
                    image.OpenReadStream(),
                    image.FileName,
                    image.ContentType);

                if (!validationResult.IsValid)
                {
                    return BadRequest(new
                    {
                        Success = false,
                        Message = validationResult.Message,
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                // Save image
                var relativePath = await _imageUploadService.SaveImageAsync(
                    image.OpenReadStream(),
                    image.FileName,
                    "menu-items");

                // Update menu item with image path
                var success = await _adminService.UpdateMenuItemImageAsync(id, relativePath);

                if (!success)
                {
                    _imageUploadService.DeleteImage(relativePath);
                    return NotFound(new
                    {
                        Success = false,
                        Message = "Menu item not found",
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                return Ok(new
                {
                    Success = true,
                    Message = "Menu item image uploaded successfully",
                    Data = new { ImagePath = relativePath },
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Success = false,
                    Message = ex.Message,
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
        }
    }
}