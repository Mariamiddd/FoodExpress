using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class CartResponseDTO
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int? RestaurantId { get; set; }
        public string? RestaurantName { get; set; }
        public decimal TotalPrice { get; set; }
        public List<CartItemDTO> Items { get; set; } = new List<CartItemDTO>();
    }

    public class CartItemDTO
    {
        public int MenuItemId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal LineTotal { get; set; }
        public int RestaurantId { get; set; }
        public string? RestaurantName { get; set; }
    }
}
