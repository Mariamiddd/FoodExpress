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

        // keeps track of the price when we create the order, in case the price of the menu item changes later
        public decimal PriceAtTimeOfOrder { get; set; }
        public decimal LineTotal => Quantity * PriceAtTimeOfOrder;

        // Navigation properties
        public Order Order { get; set; }
        public MenuItem MenuItem { get; set; }
    }
}