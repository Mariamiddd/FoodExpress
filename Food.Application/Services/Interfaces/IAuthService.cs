using Food.Application.DTOs;
using Food.Domain.Models.Identity;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDTO?> LoginUserAsync(LoginDTO dto, CancellationToken cancellationToken = default);
        Task<AuthResponseDTO> GenerateJwtTokenAsync(ApplicationUser user);
    }
}