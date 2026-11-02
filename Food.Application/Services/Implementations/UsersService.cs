using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Identity;
using Food.Domain.Models.Entities;
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

        private readonly IUnitOfWork _unitOfWork;

        public UsersService(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IUnitOfWork unitOfWork)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _unitOfWork = unitOfWork;
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
                throw new InvalidOperationException($"Registration failed: {errors}");
            }

            // Default customer role assigning
            if (await _roleManager.RoleExistsAsync("Customer"))
            {
                await _userManager.AddToRoleAsync(user, "Customer");
            }

            // Create a cart for the new user
            var cart = new Cart { UserId = user.Id };
            await _unitOfWork.Carts.AddAsync(cart);
            await _unitOfWork.SaveAsync();
        }
    }
}