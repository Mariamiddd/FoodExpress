using Food.Application.DTOs;
using Food.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Food.Web.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AddressesController : ControllerBase
    {
        private readonly IAddressService _addressService;

        public AddressesController(IAddressService addressService)
        {
            _addressService = addressService;
        }

        [HttpPost]
        public async Task<IActionResult> AddAddress([FromBody] CreateAddressDTO request)
        {
            try
            {
                var address = await _addressService.AddAddressAsync(request);
                // Returns 201 Created with the created address

                return StatusCode(201, address);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserAddresses(string userId)
        {
            try
            {
                var addresses = await _addressService.GetUserAddressesAsync(userId);

                // Returns 200 OK with the list of addresses
                return Ok(addresses);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}