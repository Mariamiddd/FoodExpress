using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Models.Identity;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Implementations
{
    public class UsersService : IUsersService
    {
        private readonly UserManager<ApplicationUser> _userManager;

        private readonly RoleManager<IdentityRole> _roleManager;

        public UsersService(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            _userManager = userManager;
            _roleManager = roleManager;
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


            //default customre role asigning
            if (await _roleManager.RoleExistsAsync("Customer"))
            {
                await _userManager.AddToRoleAsync(user, "Customer");
            }

        }

        public async Task<bool> LoginUserAsync(LoginDTO dto, CancellationToken cancellationToken = default)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
            {
                return false;
            }
            return await _userManager.CheckPasswordAsync(user, dto.Password);
        }
    }
}