using Food.Application.Constants;
using Food.Application.Validators;
using Food.Domain.Models.Entities;

namespace Food.Tests
{
    public class BusinessRulesValidatorTests
    {
        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        [InlineData(-100)]
        public void ValidateQuantity_ThrowsArgumentException_WhenQuantityIsZeroOrNegative(int invalidQuantity)
        {
            var ex = Assert.Throws<ArgumentException>(
                () => BusinessRulesValidator.ValidateQuantity(invalidQuantity));

            Assert.Equal(ErrorMessages.CartItemQuantityCannotBeZero, ex.Message);
        }

        [Fact]
        public void ValidateMenuItemAvailability_ThrowsInvalidOperationException_WhenNullOrUnavailable()
        {
            Assert.Throws<InvalidOperationException>(
                () => BusinessRulesValidator.ValidateMenuItemAvailability(null));

            var unavailableItem = new MenuItem { Id = 1, Name = "Khachapuri", IsAvailable = false };
            var ex = Assert.Throws<InvalidOperationException>(
                () => BusinessRulesValidator.ValidateMenuItemAvailability(unavailableItem));

            Assert.Equal(ErrorMessages.MenuItemNotFoundOrUnavailable, ex.Message);
        }

        [Fact]
        public void ValidateSingleRestaurantRule_ThrowsInvalidOperationException_WhenAddingDifferentRestaurantItem()
        {
            var cart = new Cart
            {
                CartItems =
                [
                    new CartItem
                    {
                        MenuItemId = 1,
                        MenuItem = new MenuItem { Id = 1, RestaurantId = 10, IsAvailable = true }
                    }
                ]
            };

            var ex = Assert.Throws<InvalidOperationException>(
                () => BusinessRulesValidator.ValidateSingleRestaurantRule(cart, newMenuItemRestaurantId: 20));

            Assert.Equal(ErrorMessages.MixedRestaurantError, ex.Message);
        }

        [Fact]
        public void ValidateCartForCheckout_ThrowsInvalidOperationException_WhenCartIsNullOrEmpty()
        {
            Assert.Throws<InvalidOperationException>(
                () => BusinessRulesValidator.ValidateCartForCheckout(null));

            var emptyCart = new Cart { CartItems = [] };
            var ex = Assert.Throws<InvalidOperationException>(
                () => BusinessRulesValidator.ValidateCartForCheckout(emptyCart));

            Assert.Equal(ErrorMessages.EmptyCartError, ex.Message);
        }

        [Fact]
        public void ValidateUserAddressOwnership_ThrowsUnauthorizedAccessException_WhenAddressDoesNotBelongToUser()
        {
            var userAddresses = new List<Address>
            {
                new() { Id = 1, City = "Tbilisi", Street = "Rustaveli 1" },
                new() { Id = 2, City = "Tbilisi", Street = "Pekini 15" }
            };

            var ex = Assert.Throws<UnauthorizedAccessException>(
                () => BusinessRulesValidator.ValidateUserAddressOwnership(userAddresses, addressId: 99));

            Assert.Equal(ErrorMessages.InvalidAddressError, ex.Message);
        }
    }
}