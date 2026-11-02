using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Food.Application.DTOs
{
    public class AddToCartDTO
    {
        [Required(ErrorMessage = "Menu Item ID is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Menu Item ID must be valid")]
        public int MenuItemId { get; set; }

        [Required(ErrorMessage = "Quantity is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; }
    }
}
