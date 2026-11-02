using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Food.Application.DTOs
{
    public class CreateOrderRequestDTO
    {
        [Required(ErrorMessage = "Address ID is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Address ID must be valid")]
        public int AddressId { get; set; }
    }
}
