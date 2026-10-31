using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Interfaces
{
    public interface IUsersService
    {
        Task RegisterUserAsync(RegisterDTO dto, CancellationToken cancellationToken = default);
    }
}