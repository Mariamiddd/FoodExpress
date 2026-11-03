using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Food.Application.DTOs
{
    public class CreateOrderRequestDTO
    {
        [Range(1, int.MaxValue, ErrorMessage = "A valid address must be selected")]
        public int AddressId { get; set; }
    }
}