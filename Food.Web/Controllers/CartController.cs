using Food.Application.Services.Interfaces;
using Food.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Food.Web.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        // Get the user ID from the claims
        private string? GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }


        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var cart = await _cartService.GetCartAsync(GetUserId());

            return Ok(new
            {
                Success = true,
                Message = cart == null ? "Cart is empty" : "Cart retrieved successfully",
                Data = cart,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpPost("items")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDTO dto)
        {
            await _cartService.AddToCartAsync(GetUserId(), dto);

            return Ok(new
            {
                Success = true,
                Message = "Item added to cart successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpPut("items/{menuItemId}")]
        public async Task<IActionResult> UpdateCartItem(int menuItemId, [FromBody] UpdateCartQuantityDTO request)
        {
            await _cartService.UpdateCartItemAsync(GetUserId(), menuItemId, request.Quantity);

            return Ok(new
            {
                Success = true,
                Message = "Quantity updated successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        [HttpDelete("items/{menuItemId}")]
        public async Task<IActionResult> RemoveFromCart(int menuItemId)
        {
            await _cartService.RemoveFromCartAsync(GetUserId(), menuItemId);

            return Ok(new
            {
                Success = true,
                Message = "Item removed from cart successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }
    }
}