using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class CartResponseDTO
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public decimal TotalPrice { get; set; }
        public List<CartItemDTO> Items { get; set; }
    }

    public class CartItemDTO
    {
        public int Id { get; set; }
        public int MenuItemId { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Subtotal => Quantity * UnitPrice;
    }
}
