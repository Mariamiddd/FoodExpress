using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Services.Implementations;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Microsoft.Extensions.Logging;
using Moq;

namespace Food.Tests
{
    public class CartServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUnitOfWork = new();
        private readonly Mock<ILogger<CartService>> _mockLogger = new();
        private readonly CartService _cartService;

        public CartServiceTests()
        {
            _cartService = new CartService(_mockUnitOfWork.Object, _mockLogger.Object);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-5)]
        public async Task AddToCartAsync_ThrowsArgumentException_WhenQuantityIsZeroOrNegative(int invalidQty)
        {
            const string userId = "test-user-1";
            var dto = new AddToCartDTO { MenuItemId = 1, Quantity = invalidQty };

            var exception = await Assert.ThrowsAsync<ArgumentException>(
                () => _cartService.AddToCartAsync(userId, dto));

            Assert.Equal(ErrorMessages.CartItemQuantityCannotBeZero, exception.Message);
        }

        [Fact]
        public async Task AddToCartAsync_ThrowsInvalidOperationException_WhenMenuItemIsUnavailable()
        {
            const string userId = "test-user-1";
            var dto = new AddToCartDTO { MenuItemId = 1, Quantity = 1 };

            var unavailableMenuItem = new MenuItem
            {
                Id = 1,
                Name = "Sold Out Burger",
                Price = 10m,
                IsAvailable = false,
                RestaurantId = 1,
                CategoryId = 1
            };

            _mockUnitOfWork.Setup(u => u.Menu.GetByIdAsync(1))
                .ReturnsAsync(unavailableMenuItem);

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _cartService.AddToCartAsync(userId, dto));

            Assert.Equal(ErrorMessages.MenuItemNotFoundOrUnavailable, exception.Message);
        }

        [Fact]
        public async Task AddToCartAsync_ThrowsInvalidOperationException_WhenAddingItemFromDifferentRestaurant()
        {
            const string userId = "test-user-1";
            var existingItem = new MenuItem { Id = 1, Name = "Burger", Price = 9m, IsAvailable = true, RestaurantId = 1 };
            var newRestaurantItem = new MenuItem { Id = 2, Name = "Sushi Roll", Price = 14m, IsAvailable = true, RestaurantId = 2 };

            var existingCart = new Cart
            {
                Id = 1,
                UserId = userId,
                CartItems =
                [
                    new CartItem { Id = 1, MenuItemId = 1, Quantity = 1, UnitPrice = 9m, MenuItem = existingItem }
                ]
            };

            _mockUnitOfWork.Setup(u => u.Menu.GetByIdAsync(2))
                .ReturnsAsync(newRestaurantItem);

            _mockUnitOfWork.Setup(u => u.Carts.GetCartByUserIdAsync(userId))
                .ReturnsAsync(existingCart);

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _cartService.AddToCartAsync(userId, new AddToCartDTO { MenuItemId = 2, Quantity = 1 }));

            Assert.Contains("same restaurant", exception.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task UpdateCartItemAsync_ThrowsArgumentException_WhenQuantityIsNegative()
        {
            const string userId = "test-user-1";
            const int menuItemId = 1;
            const int invalidQuantity = -1;

            var exception = await Assert.ThrowsAsync<ArgumentException>(
                () => _cartService.UpdateCartItemAsync(userId, menuItemId, invalidQuantity));

            Assert.Equal(ErrorMessages.CartItemQuantityCannotBeZero, exception.Message);
        }
    }
}