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
            var restaurants = await _restaurantService.GetAllRestaurantsAsync();

            return Ok(new
            {
                Success = true,
                Message = "Restaurants retrieved successfully.",
                Data = restaurants,
                Errors = (Dictionary<string, string[]>?)null
            });
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetRestaurantById(int id)
        {
            var restaurant = await _restaurantService.GetRestaurantByIdAsync(id);

            if (restaurant == null)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Restaurant not found.",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Restaurant retrieved successfully.",
                Data = restaurant,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchRestaurants([FromQuery] string q)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Search term is required.",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            var restaurants = await _restaurantService.SearchRestaurantsAsync(q);

            return Ok(new
            {
                Success = true,
                Message = "Search completed successfully.",
                Data = restaurants,
                Errors = (Dictionary<string, string[]>?)null
            });
        }


        [HttpGet("{id}/menu")]
        public async Task<IActionResult> GetRestaurantMenu(int id)
        {
            var restaurant = await _restaurantService.GetRestaurantByIdAsync(id);

            if (restaurant == null)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Restaurant not found.",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Menu retrieved successfully.",
                Data = restaurant.MenuItems ?? new List<MenuItemDTO>(),
                Errors = (Dictionary<string, string[]>?)null
            });
        }
    }
}