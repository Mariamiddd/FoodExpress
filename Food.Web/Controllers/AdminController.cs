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


        // post , put, delete methods for restaurant management
        //post method for creating a new restaurant
        [HttpPost("restaurant")]
        public async Task<IActionResult> AddRestaurant([FromBody] CreateRestaurantDTO dto)
        {
            try
            {
                var id = await _adminService.AddRestaurantAsync(dto);
                return CreatedAtAction(nameof(AddRestaurant), new { id }, new { Message = "რესტორანი წარმატებით შეიქმნა", RestaurantId = id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // put method for updating an existing restaurant

        [HttpPut("restaurant/{id}")]
        public async Task<IActionResult> UpdateRestaurant(int id, [FromBody] UpdateRestaurantDTO dto)
        {
            try
            {
                if (id != dto.Id)
                    return BadRequest(new { message = "არ ემთხვევა რესტორნის ID-ი" });

                var success = await _adminService.UpdateRestaurantAsync(dto);
                if (!success)
                    return NotFound(new { message = "რესტორანი ვერ მოიძებნა" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // delete method for deleting a restaurant

        [HttpDelete("restaurant/{id}")]
        public async Task<IActionResult> DeleteRestaurant(int id)
        {
            try
            {
                var success = await _adminService.DeleteRestaurantAsync(id);
                if (!success)
                    return NotFound(new { message = "რესტორანი ვერ მოიძებნა" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }



        // post method for creating a new menu item
        [HttpPost("menuitem")]
        public async Task<IActionResult> AddMenuItem([FromBody] CreateMenuItemDTO dto)
        {
            try
            {
                var id = await _adminService.AddMenuItemAsync(dto);
                return CreatedAtAction(nameof(AddMenuItem), new { id }, new { Message = "მენიუ ერთეული წარმატებით შეიქმნა", MenuItemId = id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // put method for updating an existing menu item

        [HttpPut("menuitem/{id}")]
        public async Task<IActionResult> UpdateMenuItem(int id, [FromBody] UpdateMenuItemDTO dto)
        {
            try
            {
                if (id != dto.Id)
                    return BadRequest(new { message = "არ ემთხვევა მენიუ ერთეულის ID-ი" });

                var success = await _adminService.UpdateMenuItemAsync(dto);
                if (!success)
                    return NotFound(new { message = "მენიუ ერთეული ვერ მოიძებნა" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // delete method for deleting a menu item
        [HttpDelete("menuitem/{id}")]
        public async Task<IActionResult> DeleteMenuItem(int id)
        {
            try
            {
                var success = await _adminService.DeleteMenuItemAsync(id);
                if (!success)
                    return NotFound(new { message = "მენიუ ერთეული ვერ მოიძებნა" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }



        // post method for creating a new category
        [HttpPost("category")]
        public async Task<IActionResult> AddCategory([FromBody] CreateCategoryDTO dto)
        {
            try
            {
                var id = await _adminService.AddCategoryAsync(dto);
                return CreatedAtAction(nameof(AddCategory), new { id }, new { Message = "კატეგორია წარმატებით შეიქმნა", CategoryId = id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

    }
}
