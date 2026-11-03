using Food.Application.DTOs;
using Food.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new UnauthorizedAccessException("User isnt authenticated");
        }

        [HttpPost]
        public async Task<IActionResult> AddAddress(
            [FromBody] CreateAddressDTO request)
        {
            var address = await _addressService.AddAddressAsync(
                GetUserId(), request);
            var response = new
            {
                Success = true,
                Message = "Address added successfully",
                Data = address,
                Errors = (Dictionary<string, string[]>?)null
            };

            return StatusCode(201, response);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyAddresses()
        {
            var addresses =
                await _addressService.GetUserAddressesAsync(GetUserId());
            var response = new
            {
                Success = true,
                Message = "User addresses retrieved successfully",
                Data = addresses,
                Errors = (Dictionary<string, string[]>?)null
            };

            return Ok(response);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAddress(int id)
        {
            var deleted = await _addressService.DeleteAddressAsync(GetUserId(), id);
            if (!deleted)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Address not found",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Address deleted successfully",
                Data = (object?)null,
                Errors = (Dictionary<string, string[]>?)null
            });
        }
    }
}