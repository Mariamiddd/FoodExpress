using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Manages the authenticated user's shopping cart. Enforces single-restaurant and item availability rules.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new UnauthorizedAccessException("User is not authenticated.");
        }

        /// <summary>
        /// Retrieves the current user's shopping cart items and server-calculated total price.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<CartResponseDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetCart()
        {
            var cart = await _cartService.GetCartAsync(GetUserId());
            return Ok(ApiResponse<CartResponseDTO>.OkResponse(cart, "Cart retrieved successfully"));
        }

        /// <summary>
        /// Adds an available menu item to the current user's cart.
        /// </summary>
        /// <remarks>
        /// All items in the cart must belong to the same restaurant, and quantity must be greater than 0.
        /// </remarks>
        /// <param name="dto">Menu item ID and quantity to add.</param>
        [HttpPost("items")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDTO dto)
        {
            await _cartService.AddToCartAsync(GetUserId(), dto);
            return Ok(ApiResponse<object>.OkResponse(null, "Item added to cart successfully"));
        }

        /// <summary>
        /// Updates the quantity of a specific menu item in the current user's cart.
        /// </summary>
        /// <param name="menuItemId">The menu item ID to update.</param>
        /// <param name="request">The new quantity (must be greater than 0).</param>
        [HttpPut("items/{menuItemId}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UpdateCartItem(int menuItemId, [FromBody] UpdateCartQuantityDTO request)
        {
            await _cartService.UpdateCartItemAsync(GetUserId(), menuItemId, request.Quantity);
            return Ok(ApiResponse<object>.OkResponse(null, "Quantity updated successfully"));
        }

        /// <summary>
        /// Removes a menu item from the current user's cart.
        /// </summary>
        /// <param name="menuItemId">The menu item ID to remove.</param>
        [HttpDelete("items/{menuItemId}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RemoveFromCart(int menuItemId)
        {
            await _cartService.RemoveFromCartAsync(GetUserId(), menuItemId);
            return Ok(ApiResponse<object>.OkResponse(null, "Item removed from cart successfully"));
        }
    }
}