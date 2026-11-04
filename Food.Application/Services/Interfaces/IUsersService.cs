using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Interfaces
{
    public interface IUsersService
    {
        Task<AuthResponseDTO> RegisterUserAsync(RegisterDTO dto, CancellationToken cancellationToken = default);
        Task<object> GetUserProfileAsync(string userId);
        Task<string?> UpdateProfileImageAsync(string userId, string newRelativePath);
    }
}