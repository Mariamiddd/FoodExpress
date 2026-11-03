using Food.Application.Interfaces;
using Food.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.AspNetCore.Hosting;
using Food.Application.Services.Implementations;

namespace Food.Web.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUsersService _usersService;
        private readonly ImageUploadService _imageUploadService;
        private readonly FoodDbContext _context;

        public UsersController(IUsersService usersService, IWebHostEnvironment webHostEnvironment, FoodDbContext context)
        {
            _usersService = usersService;
            _context = context;
            if (webHostEnvironment?.WebRootPath == null)
            {
                throw new ArgumentNullException(nameof(webHostEnvironment), "WebRootPath cannot be null");
            }
            var uploadPath = Path.Combine(webHostEnvironment.WebRootPath, "uploads");
            _imageUploadService = new ImageUploadService(uploadPath);
        }

        [HttpPost("profile-image")]
        public async Task<IActionResult> UploadProfileImage(IFormFile image)
        {
            if (image == null || image.Length == 0)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "No image file provided",
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }

            try
            {
                // Get current user ID
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new
                    {
                        Success = false,
                        Message = "User not authenticated",
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                // Validate image
                var validationResult = _imageUploadService.ValidateImage(
                    image.OpenReadStream(),
                    image.FileName,
                    image.ContentType);

                if (!validationResult.IsValid)
                {
                    return BadRequest(new
                    {
                        Success = false,
                        Message = validationResult.Message,
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                // Save image
                var relativePath = await _imageUploadService.SaveImageAsync(
                    image.OpenReadStream(),
                    image.FileName,
                    "users");

                // Update user with profile image path
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _imageUploadService.DeleteImage(relativePath);
                    return NotFound(new
                    {
                        Success = false,
                        Message = "User not found",
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                // Delete old image if exists
                if (!string.IsNullOrEmpty(user.ProfileImagePath))
                {
                    _imageUploadService.DeleteImage(user.ProfileImagePath);
                }

                user.ProfileImagePath = relativePath;
                _context.Users.Update(user);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Success = true,
                    Message = "Profile image uploaded successfully",
                    Data = new { ImagePath = relativePath },
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Success = false,
                    Message = ex.Message,
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new
                    {
                        Success = false,
                        Message = "User not authenticated",
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new
                    {
                        Success = false,
                        Message = "User not found",
                        Data = (object?)null,
                        Errors = (Dictionary<string, string[]>?)null
                    });
                }

                return Ok(new
                {
                    Success = true,
                    Message = "Profile retrieved successfully",
                    Data = new
                    {
                        Id = user.Id,
                        Email = user.Email,
                        UserName = user.UserName,
                        ProfileImagePath = user.ProfileImagePath
                    },
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Success = false,
                    Message = ex.Message,
                    Data = (object?)null,
                    Errors = (Dictionary<string, string[]>?)null
                });
            }
        }
    }
}
