using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;

namespace Food.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MenuController : ControllerBase
    {
        private readonly IMenuService _menuService;

        public MenuController(IMenuService menuService)
        {
            _menuService = menuService;
        }

        
        [HttpGet("restaurant/{restaurantId}")]
        public async Task<IActionResult> GetMenuByRestaurant(int restaurantId)
        {
            try
            {
                var menuItems = await _menuService.GetMenuByRestaurantAsync(restaurantId);
                return Ok(menuItems);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMenuItemById(int id)
        {
            try
            {
                var menuItem = await _menuService.GetMenuItemByIdAsync(id);
                if (menuItem == null)
                    return NotFound(new { message = "მენიუ ერთეულ ვერ მოიძებნა." });

                return Ok(menuItem);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

       
        [HttpGet("category/{categoryId}")]
        public async Task<IActionResult> GetMenuByCategory(int categoryId)
        {
            try
            {
                var menuItems = await _menuService.GetMenuByCategoryAsync(categoryId);
                return Ok(menuItems);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

       
        [HttpGet("search")]
        public async Task<IActionResult> SearchMenuItems([FromQuery] string q, [FromQuery] int? restaurantId = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(q))
                {
                    return BadRequest(new { message = "ძებნის ტერმინი აუცილებელია." });
                }

                var menuItems = await _menuService.SearchMenuItemsAsync(q, restaurantId);
                return Ok(menuItems);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
