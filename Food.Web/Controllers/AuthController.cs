using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Application.Services.Implementations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Food.Web.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUsersService _usersService;
        private readonly IAuthService _authService;

        public AuthController(IUsersService usersService, IAuthService authService)
        {
            _usersService = usersService;
            _authService = authService;
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromBody] RegisterDTO dto, CancellationToken cancellationToken)
        {
            try
            {
                await _usersService.RegisterUserAsync(dto, cancellationToken);

                return Ok(new
                {
                    Success = true,
                    Message = "User registered successfully",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message,
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Success = false,
                    Message = "An unexpected error occurred during registration",
                    Data = ex.Message,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginDTO dto, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _authService.LoginUserAsync(dto, cancellationToken);
                if (result == null)
                {
                    return Unauthorized(new
                    {
                        Success = false,
                        Message = "Invalid email or password",
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                return Ok(new
                {
                    Success = true,
                    Message = "Login successful",
                    Data = result,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Success = false,
                    Message = "An unexpected error occurred during login",
                    Data = ex.Message,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
        }
    }
}