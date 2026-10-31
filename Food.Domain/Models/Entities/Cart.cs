using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using Food.Domain.Models.Identity;
using Food.Domain.Models.Entities;  

namespace Food.Domain.Models.Entities
{
    public class Cart
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }
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
