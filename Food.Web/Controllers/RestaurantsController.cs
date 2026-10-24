using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RestaurantsController : ControllerBase
    {
        private readonly IRestaurantService _restaurantService;

        public RestaurantsController(IRestaurantService restaurantService)
        {
            _restaurantService = restaurantService;
        }

       
        [HttpGet]
        public async Task<IActionResult> GetAllRestaurants()
        {
            try
            {
                var restaurants = await _restaurantService.GetAllRestaurantsAsync();
                return Ok(restaurants);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

       
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRestaurantById(int id)
        {
            try
            {
                var restaurant = await _restaurantService.GetRestaurantByIdAsync(id);
                if (restaurant == null)
                    return NotFound(new { message = "restaurant not found." });

                return Ok(restaurant);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        
        [HttpGet("search")]
        public async Task<IActionResult> SearchRestaurants([FromQuery] string q)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(q))
                {
                    return BadRequest(new { message = "search term is required." });
                }

                var restaurants = await _restaurantService.SearchRestaurantsAsync(q);
                return Ok(restaurants);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        
        [HttpGet("{id}/menu")]
        public async Task<IActionResult> GetRestaurantMenu(int id)
        {
            try
            {
                var restaurant = await _restaurantService.GetRestaurantByIdAsync(id);
                if (restaurant == null)
                    return NotFound(new { message = "restaurant not found." });

                return Ok(restaurant.MenuItems ?? new List<MenuItemDTO>());
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
