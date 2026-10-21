using Food.Application.DTOs;
using Food.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Food.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;
        
        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        // 1. ყველა შეკვეთის წამოღება: GET /api/Food
        [HttpGet]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _orderService.GetAllOrdersAsync();
            return Ok(orders);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            var order = await _orderService.GetOrderByIdAsync(id);
            if (order == null)
            {
                return NotFound();
            }
            return Ok(order);
        }

        // POST: api/Orders
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequestDTO request)
        {
            try
            {
                var order = await _orderService.CreateOrderAsync(request.UserId, request.AddressId);

                // REST სტანდარტი: ახალი რესურსის შექმნისას ბრუნდება 201 Created და ახალი რესურსის მისამართი
                return CreatedAtAction(nameof(GetOrderById), new { id = order.Id }, order);
            }
            catch (Exception ex)
            {
                // ვალიდაციის ერორებს ვიჭერთ და ვაბრუნებთ 400 Bad Request სტატუსით
                return BadRequest(new { message = ex.Message });
            }
        }

        // PATCH: api/Orders/{id}/status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequestDTO request)
        {
            try
            {
                var success = await _orderService.UpdateOrderStatusAsync(id, request.Status);
                if (!success)
                {
                    return NotFound(new { message = "შეკვეთა ვერ მოიძებნა." });
                }

                // REST სტანდარტი: წარმატებული განახლებისას ბრუნდება 204 NoContent
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}