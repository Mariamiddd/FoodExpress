using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class CreateOrderRequestDTO
    {
        public int UserId { get; set; }
        public int AddressId { get; set; }
    }
}
