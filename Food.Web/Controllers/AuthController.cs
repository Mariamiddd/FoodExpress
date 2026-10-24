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
            await _usersService.RegisterUserAsync(dto, cancellationToken);
            return Ok("User registered successfully");
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginDTO dto, CancellationToken cancellationToken)
        {
            var result = await _authService.LoginUserAsync(dto, cancellationToken);
            if (result == null)
            {
                return Unauthorized("Invalid email or password");
            }
            return Ok(result);
        }

    }
}