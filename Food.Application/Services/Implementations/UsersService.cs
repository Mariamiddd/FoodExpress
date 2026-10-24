using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Implementations
{
    public class UsersService : IUsersService
    {
        //private readonly RoleManager<IdentityRole> _roleManager; davamto mere

        private readonly UserManager<ApplicationUser> _userManager;

        public UsersService(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

        public async Task RegisterUserAsync(RegisterDTO dto, CancellationToken cancellationToken = default)
        {
            var user = new ApplicationUser
            {
                Email = dto.Email,
                UserName = dto.Email,
            };

            var result = await _userManager.CreateAsync(user, dto.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new Exception($"Registration failed: {errors}");
            }
        }

        public async Task<bool> LoginUserAsync(LoginDTO dto, CancellationToken cancellationToken = default)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
            {
                return false;
            }
            var result = await _userManager.CheckPasswordAsync(user, dto.Password);
            return result;
        }
    }
}