using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;

namespace Food.Domain.Models.Entities
{
    public class Cart
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public List<CartItem> CartItems { get; set; } = new List<CartItem>();
        public decimal TotalPrice { get; private set; }

        public void AddItem(CartItem item)
        {
            var existingItem = CartItems.FirstOrDefault(i => i.MenuItemId == item.MenuItemId);
            if(existingItem != null)
            {
                existingItem.Quantity += item.Quantity;
            }
            else
            {
                CartItems.Add(item);
            }
            CalculateTotal();
        }

        public void RemoveItem(int menuItemId)
        {
            var itemToRemove = CartItems.FirstOrDefault(i => i.MenuItemId == menuItemId);
            if (itemToRemove != null)
            {
                CartItems.Remove(itemToRemove);
                CalculateTotal();
            }
        }

        private void CalculateTotal()
        {
            TotalPrice = CartItems.Sum(i => i.UnitPrice * i.Quantity);
        }
    }
}
