using System;
using System.Collections.Generic;
using System.Security.Principal;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public enum Role
    {
        Customer,
        Admin
    }
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public Cart Cart { get; set; }
        public Role Role { get; set; }
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}
