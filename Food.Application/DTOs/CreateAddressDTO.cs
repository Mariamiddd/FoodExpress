using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Food.Application.DTOs
{
    public class CreateAddressDTO
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Street { get; set; }

        [Required]
        [StringLength(50)]
        public string City { get; set; }
    }
}
