using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Food.Application.DTOs
{
    public class CreateMenuItemDTO
    {
        [Required(ErrorMessage = "Menu item name is required")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Item name must be between 2 and 100 characters")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Price is required")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
        public decimal Price { get; set; }

        [Required(ErrorMessage = "Availability status is required")]
        public bool IsAvailable { get; set; }

        [Required(ErrorMessage = "Restaurant ID is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Restaurant ID must be valid")]
        public int RestaurantId { get; set; }

        [Required(ErrorMessage = "Category ID is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Category ID must be valid")]
        public int CategoryId { get; set; }
    }
}