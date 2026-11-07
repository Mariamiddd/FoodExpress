using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Food.Application.DTOs
{
    public class CreateRestaurantDTO
    {
        [Required(ErrorMessage = "Restaurant name is required")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Restaurant name must be between 2 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Address is required")]
        [StringLength(200, MinimumLength = 5, ErrorMessage = "Address must be between 5 and 200 characters")]
        public string Address { get; set; } = string.Empty;

        public string? ImagePath { get; set; }

        public bool IsActive { get; set; } = true;
    }
}