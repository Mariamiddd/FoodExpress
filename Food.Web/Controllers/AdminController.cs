using Food.Application.Services.Interfaces;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Administrative endpoints for managing user roles and permissions.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Produces("application/json")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        /// <summary>
        /// Promotes an existing registered user to the Admin role by email.
        /// </summary>
        [HttpPost("users/promote")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PromoteUserToAdmin([FromQuery] string email)
        {
            await _adminService.PromoteUserToAdminAsync(email);
            return Ok(ApiResponse<object>.OkResponse(null, $"User '{email}' promoted to Admin successfully"));
        }
    }
}