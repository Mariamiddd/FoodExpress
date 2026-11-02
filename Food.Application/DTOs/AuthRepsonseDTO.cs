using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class AuthResponseDTO
    {
        public string Token { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string UserId { get; set; }
        public string Email { get; set; }
        public string UserName { get; set; }
    }
}