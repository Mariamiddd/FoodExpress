using Food.Application.DTOs;
using Food.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Food.Web.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
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
        // get all orders for admin users
        [HttpGet]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _orderService.GetAllOrdersAsync();

            return Ok(new
            {
                Success = true,
                Message = "Orders retrieved successfully",
                Data = orders,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        // get orders for the currently authenticated user
        [HttpGet("my")]
        public async Task<IActionResult> GetUserOrders()
        {
            var orders = await _orderService.GetUserOrdersAsync(GetUserId());

            return Ok(new
            {
                Success = true,
                Message = "User orders retrieved successfully",
                Data = orders,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        // get order by id for admin users
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _orderService.GetOrderByIdAsync(id);

            if (order == null)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Order not found",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Order retrieved successfully",
                Data = order,
                Errors = (Dictionary<string, string[]>?)null
            });
        }

        // post new order for the currently authenticated user
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequestDTO request)
        {
            var userId = GetUserId();
            var order = await _orderService.CreateOrderAsync(userId, request.AddressId);

            var response = new
            {
                Success = true,
                Message = "Order created successfully",
                Data = order,
                Errors = (Dictionary<string, string[]>?)null
            };

            return CreatedAtAction(nameof(GetOrderById), new { id = order.Id }, response);
        }

        // update order status for admin users patch request
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequestDTO request)
        {
            var success = await _orderService.UpdateOrderStatusAsync(id, request.Status);

            if (!success)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Order not found",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Order status updated successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }
    }
}