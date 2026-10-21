using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class CreateAddressDTO
    {
        public int UserId { get; set; }
        public string Street { get; set; }
        public string City { get; set; }
    }
}
