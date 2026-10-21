using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public class OrderItem
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public int MenuItemId { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }

        // Renamed to match FoodDbContext configuration
        public decimal PriceAtTimeOfOrder { get; set; }
        public decimal LineTotal => Quantity * PriceAtTimeOfOrder;

        // Added missing navigation properties required by EF Core
        public Order Order { get; set; }
        public MenuItem MenuItem { get; set; }
    }
}