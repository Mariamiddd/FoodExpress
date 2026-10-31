using Food.Domain.Models.Identity;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public class Address
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public string Street { get; set; }
        public string City { get; set; }

        public ApplicationUser User { get; set; }
    }
}
