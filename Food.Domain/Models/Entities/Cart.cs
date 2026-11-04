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
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser User { get; set; } = null!;
        public List<CartItem> CartItems { get; set; } = new List<CartItem>();
        public decimal TotalPrice { get; private set; }

        public void AddItem(MenuItem menuItem, int quantity)
        {
            if (quantity <= 0)
                throw new ArgumentException("Quantity must be greater than 0.");

            if (menuItem == null || !menuItem.IsAvailable)
                throw new InvalidOperationException("Menu item not found or unavailable.");

            // Single Restaurant Rule: Check if cart already contains items from a different restaurant
            var existingRestaurantId = CartItems
                .Where(ci => ci.MenuItem != null)
                .Select(ci => ci.MenuItem.RestaurantId)
                .FirstOrDefault();

            if (CartItems.Any() && existingRestaurantId != 0 && existingRestaurantId != menuItem.RestaurantId)
            {
                throw new InvalidOperationException("All items in a single order must be from the same restaurant. Please clear your cart first.");
            }

            var existingItem = CartItems.FirstOrDefault(i => i.MenuItemId == menuItem.Id);
            if (existingItem != null)
            {
                existingItem.Quantity += quantity;
                existingItem.UnitPrice = menuItem.Price;
            }
            else
            {
                CartItems.Add(new CartItem
                {
                    CartId = Id,
                    MenuItemId = menuItem.Id,
                    MenuItem = menuItem,
                    Quantity = quantity,
                    UnitPrice = menuItem.Price
                });
            }

            RecalculateTotal();
        }

        public void UpdateItemQuantity(int menuItemId, int quantity)
        {
            if (quantity <= 0)
                throw new ArgumentException("Quantity must be greater than 0.");

            var item = CartItems.FirstOrDefault(i => i.MenuItemId == menuItemId)
                ?? throw new KeyNotFoundException("Cart item not found.");

            item.Quantity = quantity;
            if (item.MenuItem != null)
            {
                item.UnitPrice = item.MenuItem.Price;
            }

            RecalculateTotal();
        }

        public void RemoveItem(int menuItemId)
        {
            var itemToRemove = CartItems.FirstOrDefault(i => i.MenuItemId == menuItemId)
                ?? throw new KeyNotFoundException("Cart item not found.");

            CartItems.Remove(itemToRemove);
            RecalculateTotal();
        }

        public void Clear()
        {
            CartItems.Clear();
            TotalPrice = 0;
        }

        public void RecalculateTotal()
        {
            TotalPrice = CartItems.Sum(i => (i.MenuItem?.Price ?? i.UnitPrice) * i.Quantity);
        }
    }
}
