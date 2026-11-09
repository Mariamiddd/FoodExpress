using Food.Application.Services.Interfaces;
using Food.Domain.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Food.Application.Services.Implementations
{
    public class AdminService : IAdminService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ILogger<AdminService> _logger;

        public AdminService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ILogger<AdminService> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _logger = logger;
        }

        public async Task<bool> PromoteUserToAdminAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("User email is required.");

            var user = await _userManager.FindByEmailAsync(email.Trim())
                ?? throw new KeyNotFoundException($"No user found with email '{email}'.");

            if (!await _roleManager.RoleExistsAsync("Admin"))
            {
                await _roleManager.CreateAsync(new IdentityRole("Admin"));
            }

            if (await _userManager.IsInRoleAsync(user, "Admin"))
            {
                throw new InvalidOperationException($"User '{email}' is already an Admin.");
            }

            var result = await _userManager.AddToRoleAsync(user, "Admin");
            if (!result.Succeeded)
            {
                throw new InvalidOperationException("Failed to assign Admin role.");
            }

            _logger.LogInformation("User {Email} was promoted to Admin", email);
            return true;
        }
    }
}