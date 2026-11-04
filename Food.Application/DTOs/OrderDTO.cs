using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Food.Application.DTOs
{
    public class OrderDTO
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int RestaurantId { get; set; }
        public string RestaurantName { get; set; } = string.Empty;
        public int AddressId { get; set; }
        public string DeliveryAddress { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        [DataType(DataType.Currency)]
        public decimal TotalPrice { get; set; }

        public string Status { get; set; } = string.Empty;
        public List<OrderItemDTO> OrderItems { get; set; } = new List<OrderItemDTO>();
    }

    public class OrderItemDTO
    {
        public int Id { get; set; }
        public int MenuItemId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }

        [DataType(DataType.Currency)]
        public decimal UnitPrice { get; set; }

        [DataType(DataType.Currency)]
        public decimal PriceAtTimeOfOrder { get; set; }

        [DataType(DataType.Currency)]
        public decimal LineTotal => Quantity * (PriceAtTimeOfOrder > 0 ? PriceAtTimeOfOrder : UnitPrice);
    }
}