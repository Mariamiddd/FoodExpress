using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Models.Entities;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Handles order placement from cart, customer order history, and order state machine transitions.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new UnauthorizedAccessException("User is not authenticated.");
        }

        /// <summary>
        /// Retrieves all customer orders across the platform (Admin only).
        /// </summary>
        /// <returns>A chronological list of all orders placed on the platform.</returns>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<OrderDTO>>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _orderService.GetAllOrdersAsync();
            return Ok(ApiResponse<IEnumerable<OrderDTO>>.OkResponse(orders, "Orders retrieved successfully"));
        }

        /// <summary>
        /// Retrieves the order history for the currently authenticated user.
        /// </summary>
        /// <returns>A list of orders belonging to the current user.</returns>
        [HttpGet("my")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<OrderDTO>>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetUserOrders()
        {
            var orders = await _orderService.GetUserOrdersAsync(GetUserId());
            return Ok(ApiResponse<IEnumerable<OrderDTO>>.OkResponse(orders, "User orders retrieved successfully"));
        }

        /// <summary>
        /// Retrieves a specific order by ID (Accessible by the order owner or an Admin).
        /// </summary>
        /// <param name="id">The order ID.</param>
        /// <returns>Detailed order receipt including itemized line items and delivery address.</returns>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<OrderDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiResponse<OrderDTO>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _orderService.GetOrderByIdAsync(id);
            if (order == null)
            {
                return NotFound(ApiResponse<OrderDTO>.FailResponse("Order not found"));
            }

            var userId = GetUserId();
            if (!User.IsInRole("Admin") && order.UserId != userId)
            {
                return Forbid();
            }

            return Ok(ApiResponse<OrderDTO>.OkResponse(order, "Order retrieved successfully"));
        }

        /// <summary>
        /// Places a new order from the current user's cart using server-computed database prices.
        /// </summary>
        /// <param name="request">Delivery address ID belonging to the user.</param>
        /// <returns>The newly created order details.</returns>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<OrderDTO>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequestDTO request)
        {
            var userId = GetUserId();
            var order = await _orderService.CreateOrderAsync(userId, request.AddressId);

            return CreatedAtAction(
                nameof(GetOrderById),
                new { id = order.Id },
                ApiResponse<OrderDTO>.OkResponse(order, "Order created successfully"));
        }

        /// <summary>
        /// Updates an order's state following strict state machine rules.
        /// </summary>
        /// <remarks>
        /// Valid flow: Created (0) -&gt; Confirmed (1) -&gt; Preparing (2) -&gt; OnTheWay (3) -&gt; Delivered (4).
        /// Cancelled (5) is allowed only from Created or Confirmed. Customers may cancel their own Created/Confirmed orders.
        /// </remarks>
        /// <param name="id">The order ID.</param>
        /// <param name="request">Target OrderState enum value.</param>
        /// <returns>A confirmation response indicating the state transition succeeded.</returns>
        [HttpPatch("{id}/status")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequestDTO request)
        {
            var isAdmin = User.IsInRole("Admin");

            // Non-admin customers may only cancel their own Created/Confirmed orders
            if (!isAdmin)
            {
                if (request.Status != OrderState.Cancelled)
                {
                    return Forbid();
                }

                await _orderService.CancelOrderAsync(id, GetUserId(), isAdmin: false);
                return Ok(ApiResponse<object>.OkResponse(null, "Order cancelled successfully"));
            }

            var success = await _orderService.UpdateOrderStatusAsync(id, request.Status);
            if (!success)
            {
                return NotFound(ApiResponse<object>.FailResponse("Order not found"));
            }

            return Ok(ApiResponse<object>.OkResponse(null, "Order status updated successfully"));
        }
    }
}