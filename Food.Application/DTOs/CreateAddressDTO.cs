using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Food.Application.DTOs
{
    public class CreateAddressDTO
    {
        [Required(ErrorMessage = "Street is required")]
        [StringLength(200, MinimumLength = 5, ErrorMessage = "Street must be between 5 and 200 characters")]
        public string Street { get; set; } = string.Empty;

        [Required(ErrorMessage = "City is required")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "City must be between 2 and 100 characters")]
        public string City { get; set; } = string.Empty;
    }
}
