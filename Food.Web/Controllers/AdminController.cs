using Food.Application.DTOs;
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

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpPost("restaurant")]
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

        [HttpPut("restaurant/{id}")]
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

        [HttpDelete("restaurant/{id}")]
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

        [HttpPost("menuitem")]
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

        [HttpPut("menuitem/{id}")]
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

        [HttpDelete("menuitem/{id}")]
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

        [HttpPost("category")]
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
    }
}