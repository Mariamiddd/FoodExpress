using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Manages delivery addresses for the authenticated user.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
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
                ?? throw new UnauthorizedAccessException("User is not authenticated.");
        }

        /// <summary>
        /// Adds a new delivery address for the currently authenticated user.
        /// </summary>
        /// <param name="request">City and street address details.</param>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<AddressDTO>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AddAddress([FromBody] CreateAddressDTO request)
        {
            var address = await _addressService.AddAddressAsync(GetUserId(), request);
            return StatusCode(
                StatusCodes.Status201Created,
                ApiResponse<AddressDTO>.OkResponse(address, "Address added successfully"));
        }

        /// <summary>
        /// Retrieves all delivery addresses belonging to the currently authenticated user.
        /// </summary>
        [HttpGet("my")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<AddressDTO>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMyAddresses()
        {
            var addresses = await _addressService.GetUserAddressesAsync(GetUserId());
            return Ok(ApiResponse<IEnumerable<AddressDTO>>.OkResponse(addresses, "User addresses retrieved successfully"));
        }

        /// <summary>
        /// Deletes a delivery address owned by the currently authenticated user.
        /// </summary>
        /// <param name="id">The address ID to delete.</param>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteAddress(int id)
        {
            var deleted = await _addressService.DeleteAddressAsync(GetUserId(), id);
            if (!deleted)
            {
                return NotFound(ApiResponse<object>.FailResponse("Address not found"));
            }

            return Ok(ApiResponse<object>.OkResponse(null, "Address deleted successfully"));
        }
    }
}