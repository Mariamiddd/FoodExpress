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
                ?? throw new UnauthorizedAccessException();
        }

        [HttpPost]
        public async Task<IActionResult> AddAddress(
            [FromBody] CreateAddressDTO request)
        {
            var address = await _addressService.AddAddressAsync(
                GetUserId(), request);

            return StatusCode(201, address);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyAddresses()
        {
            var addresses =
                await _addressService.GetUserAddressesAsync(GetUserId());

            return Ok(addresses);
        }
    }
}