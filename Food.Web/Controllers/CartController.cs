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

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var cart = await _cartService.GetCartAsync(GetUserId());
            return Ok(cart ?? (object)new { Message = "cart is empty" });
        }

        [HttpPost("items")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDTO dto)
        {
            try
            {
                await _cartService.AddToCartAsync(GetUserId(), dto);
                return Ok(new { Message = "item added to cart" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("items/{menuItemId}")]
        public async Task<IActionResult> UpdateCartItem(int menuItemId, [FromBody] int quantity)
        {
            try
            {
                await _cartService.UpdateCartItemAsync(GetUserId(), menuItemId, quantity);
                return Ok(new { Message = "quantity updated." });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("items/{menuItemId}")]
        public async Task<IActionResult> RemoveFromCart(int menuItemId)
        {
            await _cartService.RemoveFromCartAsync(GetUserId(), menuItemId);
            return NoContent();
        }
    }
}