using Food.Application.Constants;
using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;
using Food.Application.DTOs;
using System.Linq;

namespace Food.Application.Validators
{
    /// <summary>
    /// Centralized business rule validators for Cart, Order, and Menu operations.
    /// </summary>
    public static class BusinessRulesValidator
    {
        public static void ValidateQuantity(int quantity)
        {
            if (quantity <= 0)
            {
                throw new ArgumentException(ErrorMessages.CartItemQuantityCannotBeZero);
            }
        }

        public static void ValidateMenuItemAvailability(MenuItem? menuItem)
        {
            if (menuItem == null || !menuItem.IsAvailable)
            {
                throw new InvalidOperationException(ErrorMessages.MenuItemNotFoundOrUnavailable);
            }
        }

        public static void ValidateSingleRestaurantRule(Cart cart, int newMenuItemRestaurantId)
        {
            if (cart.CartItems == null || !cart.CartItems.Any())
                return;

            var existingRestaurantId = cart.CartItems
                .Where(ci => ci.MenuItem != null)
                .Select(ci => ci.MenuItem.RestaurantId)
                .FirstOrDefault();

            if (existingRestaurantId != 0 && existingRestaurantId != newMenuItemRestaurantId)
            {
                throw new InvalidOperationException(ErrorMessages.MixedRestaurantError);
            }
        }

        public static void ValidateCartForCheckout(Cart? cart)
        {
            if (cart == null || cart.CartItems == null || !cart.CartItems.Any())
            {
                throw new InvalidOperationException(ErrorMessages.EmptyCartError);
            }

            if (cart.CartItems.Any(ci => ci.MenuItem == null || !ci.MenuItem.IsAvailable))
            {
                throw new InvalidOperationException(ErrorMessages.MenuItemNotFoundOrUnavailable);
            }

            var distinctRestaurants = cart.CartItems
                .Select(ci => ci.MenuItem.RestaurantId)
                .Distinct()
                .Count();

            if (distinctRestaurants > 1)
            {
                throw new InvalidOperationException(ErrorMessages.MixedRestaurantError);
            }
        }

        public static void ValidateUserAddressOwnership(IEnumerable<Address> userAddresses, int addressId)
        {
            if (userAddresses == null || !userAddresses.Any(a => a.Id == addressId))
            {
                throw new UnauthorizedAccessException(ErrorMessages.InvalidAddressError);
            }
        }
    }
}