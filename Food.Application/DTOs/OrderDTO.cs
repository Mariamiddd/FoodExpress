using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public int RestaurantId { get; set; }
        public int AddressId { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal TotalPrice { get; set; }
        public string Status { get; set; }
        public List<OrderItemDTO> OrderItems { get; set; }
    }

    public class OrderItemDTO
    {
        public int Id { get; set; }
        public int MenuItemId { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
}
