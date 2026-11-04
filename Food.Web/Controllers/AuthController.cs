using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Application.Services.Implementations;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Handles user registration, authentication, and JWT token generation.
    /// </summary>
    [Route("api/[controller]/[action]")]
    [ApiController]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private readonly IUsersService _usersService;
        private readonly IAuthService _authService;

        public AuthController(IUsersService usersService, IAuthService authService)
        {
            _usersService = usersService;
            _authService = authService;
        }

        /// <summary>
        /// Registers a new customer account, initializes their cart and default address, and returns a JWT token.
        /// </summary>
        /// <param name="dto">User registration credentials (username, email, password).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>JWT token and authenticated user metadata.</returns>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<AuthResponseDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterDTO dto, CancellationToken cancellationToken)
        {
            var authResult = await _usersService.RegisterUserAsync(dto, cancellationToken);
            return Ok(ApiResponse<AuthResponseDTO>.OkResponse(authResult, "User registered successfully"));
        }

        /// <summary>
        /// Authenticates an existing user and issues a signed JWT Bearer token.
        /// </summary>
        /// <param name="dto">User login credentials (email and password).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>JWT token and user role claims.</returns>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<AuthResponseDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<AuthResponseDTO>), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginDTO dto, CancellationToken cancellationToken)
        {
            var result = await _authService.LoginUserAsync(dto, cancellationToken);
            if (result == null)
            {
                return Unauthorized(ApiResponse<AuthResponseDTO>.FailResponse("Invalid email or password"));
            }

            return Ok(ApiResponse<AuthResponseDTO>.OkResponse(result, "Login successful"));
        }
    }
}