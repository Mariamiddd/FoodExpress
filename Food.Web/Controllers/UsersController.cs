using Food.Application.Interfaces;
using Food.Application.Services.Implementations;
using Food.Web.Repsonses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Food.Web.Controllers
{
    /// <summary>
    /// Manages the authenticated user's profile information and avatar image.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    [Produces("application/json")]
    public class UsersController : ControllerBase
    {
        private readonly IUsersService _usersService;
        private readonly ImageUploadService _imageUploadService;

        public UsersController(IUsersService usersService, ImageUploadService imageUploadService)
        {
            _usersService = usersService;
            _imageUploadService = imageUploadService;
        }

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new UnauthorizedAccessException("User not authenticated.");
        }

        /// <summary>
        /// Uploads and updates the profile picture for the currently authenticated user.
        /// </summary>
        [HttpPost("profile-image")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UploadProfileImage(IFormFile image)
        {
            if (image == null || image.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailResponse("No image file provided"));
            }

            var userId = GetUserId();

            using var validationStream = image.OpenReadStream();
            var validationResult = _imageUploadService.ValidateImage(validationStream, image.FileName, image.ContentType);

            if (!validationResult.IsValid)
            {
                return BadRequest(ApiResponse<object>.FailResponse(validationResult.Message));
            }

            using var saveStream = image.OpenReadStream();
            var relativePath = await _imageUploadService.SaveImageAsync(saveStream, image.FileName, "users");

            try
            {
                var oldImagePath = await _usersService.UpdateProfileImageAsync(userId, relativePath);
                if (!string.IsNullOrEmpty(oldImagePath))
                {
                    _imageUploadService.DeleteImage(oldImagePath);
                }

                return Ok(ApiResponse<object>.OkResponse(new { ImagePath = relativePath }, "Profile image uploaded successfully"));
            }
            catch
            {
                _imageUploadService.DeleteImage(relativePath);
                throw;
            }
        }

        /// <summary>
        /// Retrieves the profile details of the currently authenticated user.
        /// </summary>
        [HttpGet("profile")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetProfile()
        {
            var profile = await _usersService.GetUserProfileAsync(GetUserId());
            return Ok(ApiResponse<object>.OkResponse(profile, "Profile retrieved successfully"));
        }
    }
}