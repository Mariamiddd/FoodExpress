using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Domain.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Implementations
{
    public class UsersService : IUsersService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuthService _authService;
        private readonly ILogger<UsersService> _logger;

        public UsersService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IUnitOfWork unitOfWork,
            IAuthService authService,
            ILogger<UsersService> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _unitOfWork = unitOfWork;
            _authService = authService;
            _logger = logger;
        }

        public async Task<AuthResponseDTO> RegisterUserAsync(RegisterDTO dto, CancellationToken cancellationToken = default)
        {
            var existingEmail = await _userManager.FindByEmailAsync(dto.Email);
            if (existingEmail != null)
            {
                throw new InvalidOperationException(ErrorMessages.EmailAlreadyInUse);
            }

            var cleanUserName = string.IsNullOrWhiteSpace(dto.UserName) ? dto.Email : dto.UserName.Trim();
            var existingUserName = await _userManager.FindByNameAsync(cleanUserName);
            if (existingUserName != null)
            {
                throw new InvalidOperationException(ErrorMessages.UsernameAlreadyInUse);
            }

            var user = new ApplicationUser
            {
                Email = dto.Email.Trim(),
                UserName = cleanUserName,
                EmailConfirmed = true
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Registration failed: {errors}");
            }

            if (await _roleManager.RoleExistsAsync("Customer"))
            {
                await _userManager.AddToRoleAsync(user, "Customer");
            }

            var cart = new Cart { UserId = user.Id };
            await _unitOfWork.Carts.AddAsync(cart);

            var defaultAddress = new Address
            {
                UserId = user.Id,
                Street = "123 Rustaveli Avenue",
                City = "Tbilisi"
            };
            await _unitOfWork.Addresses.AddAsync(defaultAddress);

            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Registered new user {UserId} ({Email})", user.Id, user.Email);
            return await _authService.GenerateJwtTokenAsync(user);
        }

        public async Task<object> GetUserProfileAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException(ErrorMessages.UserNotFound);

            var roles = await _userManager.GetRolesAsync(user);

            return new
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.UserName,
                ProfileImagePath = user.ProfileImagePath,
                Roles = roles
            };
        }

        public async Task<string?> UpdateProfileImageAsync(string userId, string newRelativePath)
        {
            var user = await _userManager.FindByIdAsync(userId)
                ?? throw new KeyNotFoundException(ErrorMessages.UserNotFound);

            var oldImagePath = user.ProfileImagePath;
            user.ProfileImagePath = newRelativePath;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException("Failed to update user profile image.");
            }

            return oldImagePath;
        }
    }
}