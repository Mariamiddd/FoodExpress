using Food.Application.Constants;
using System;
using System.ComponentModel.DataAnnotations;

namespace Food.Application.DTOs
{
    public class UpdateMenuItemDTO
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Menu item name is required")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Item name must be between 2 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Price is required")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
        public decimal Price { get; set; }

        public bool IsAvailable { get; set; }

        public string? ImagePath { get; set; }

        [Required(ErrorMessage = "Category ID is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Category ID must be valid")]
        public int CategoryId { get; set; }

        public int RestaurantId { get; set; }
    }
}