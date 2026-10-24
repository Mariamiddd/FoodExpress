using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class AuthResponseDTO
    {
        public string Token { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}