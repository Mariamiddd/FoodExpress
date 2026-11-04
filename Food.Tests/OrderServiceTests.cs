using AutoMapper;
using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Services.Implementations;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace Food.Tests
{
    public class OrderServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUnitOfWork = new();
        private readonly Mock<IMapper> _mockMapper = new();
        private readonly Mock<ILogger<OrderService>> _mockLogger = new();
        private readonly OrderService _orderService;

        public OrderServiceTests()
        {
            _orderService = new OrderService(
                _mockUnitOfWork.Object,
                _mockMapper.Object,
                _mockLogger.Object);
        }

        [Fact]
        public async Task CreateOrderAsync_ThrowsException_WhenCartHasItemsFromMultipleRestaurants()
        {
            // Arrange
            const string userId = "test-user-1";
            const int addressId = 1;

            var address = new Address { Id = addressId, UserId = userId, Street = "123 Main St", City = "Tbilisi" };
            var restaurant1 = new Restaurant { Id = 1, Name = "Burger Palace", Address = "Addr 1" };
            var restaurant2 = new Restaurant { Id = 2, Name = "Pizza Palace", Address = "Addr 2" };

            var menuItem1 = new MenuItem { Id = 1, RestaurantId = 1, CategoryId = 1, Name = "Burger", Price = 10m, IsAvailable = true, Restaurant = restaurant1 };
            var menuItem2 = new MenuItem { Id = 2, RestaurantId = 2, CategoryId = 2, Name = "Pizza", Price = 15m, IsAvailable = true, Restaurant = restaurant2 };

            var cart = new Cart
            {
                Id = 1,
                UserId = userId,
                CartItems =
                [
                    new CartItem { Id = 1, MenuItemId = 1, Quantity = 1, UnitPrice = 10m, MenuItem = menuItem1 },
                    new CartItem { Id = 2, MenuItemId = 2, Quantity = 1, UnitPrice = 15m, MenuItem = menuItem2 }
                ]
            };

            _mockUnitOfWork.Setup(u => u.Addresses.GetAddressesByUserIdAsync(userId))
                .ReturnsAsync([address]);

            _mockUnitOfWork.Setup(u => u.Carts.GetCartByUserIdAsync(userId))
                .ReturnsAsync(cart);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _orderService.CreateOrderAsync(userId, addressId));

            Assert.Equal(ErrorMessages.MixedRestaurantError, exception.Message);
        }

        [Fact]
        public async Task CreateOrderAsync_ThrowsUnauthorizedAccess_WhenAddressDoesNotBelongToUser()
        {
            // Arrange
            const string userId = "test-user-1";
            const int invalidAddressId = 999;
            var userAddress = new Address { Id = 1, UserId = userId, Street = "123 Main St", City = "Tbilisi" };

            _mockUnitOfWork.Setup(u => u.Addresses.GetAddressesByUserIdAsync(userId))
                .ReturnsAsync([userAddress]);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => _orderService.CreateOrderAsync(userId, invalidAddressId));

            Assert.Equal(ErrorMessages.InvalidAddressError, exception.Message);
        }

        [Fact]
        public async Task CreateOrderAsync_ThrowsException_WhenCartIsEmpty()
        {
            // Arrange
            const string userId = "test-user-1";
            const int addressId = 1;
            var address = new Address { Id = addressId, UserId = userId, Street = "123 Main St", City = "Tbilisi" };
            var emptyCart = new Cart { Id = 1, UserId = userId, CartItems = [] };

            _mockUnitOfWork.Setup(u => u.Addresses.GetAddressesByUserIdAsync(userId))
                .ReturnsAsync([address]);

            _mockUnitOfWork.Setup(u => u.Carts.GetCartByUserIdAsync(userId))
                .ReturnsAsync(emptyCart);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _orderService.CreateOrderAsync(userId, addressId));

            Assert.Equal(ErrorMessages.EmptyCartError, exception.Message);
        }

        [Fact]
        public async Task CreateOrderAsync_ComputesTotalExclusivelyFromDatabaseMenuItemPrices_AndClearsCart()
        {
            // Arrange
            const string userId = "test-user-1";
            const int addressId = 1;

            var address = new Address { Id = addressId, UserId = userId, Street = "123 Main St", City = "Tbilisi" };
            var restaurant = new Restaurant { Id = 1, Name = "Test Restaurant", Address = "123 Res St" };

            var menuItem = new MenuItem
            {
                Id = 1,
                RestaurantId = 1,
                CategoryId = 1,
                Name = "Margherita Pizza",
                Price = 12.50m,
                IsAvailable = true,
                Restaurant = restaurant
            };

            var cart = new Cart
            {
                Id = 1,
                UserId = userId,
                CartItems =
                [
                    new CartItem { Id = 1, MenuItemId = 1, Quantity = 2, UnitPrice = 0.01m, MenuItem = menuItem }
                ]
            };

            Order? capturedOrder = null;

            _mockUnitOfWork.Setup(u => u.Addresses.GetAddressesByUserIdAsync(userId))
                .ReturnsAsync([address]);

            _mockUnitOfWork.Setup(u => u.Carts.GetCartByUserIdAsync(userId))
                .ReturnsAsync(cart);

            _mockUnitOfWork.Setup(u => u.Orders.AddAsync(It.IsAny<Order>()))
                .Callback<Order>(o => capturedOrder = o)
                .Returns(Task.CompletedTask);

            _mockUnitOfWork.Setup(u => u.Orders.GetOrderByIdAsync(It.IsAny<int>()))
                .ReturnsAsync(() => capturedOrder!);

            _mockUnitOfWork.Setup(u => u.SaveAsync())
                .ReturnsAsync(1);

            _mockMapper.Setup(m => m.Map<OrderDTO>(It.IsAny<Order>()))
                .Returns((Order src) => new OrderDTO
                {
                    Id = src.Id,
                    UserId = src.UserId,
                    TotalPrice = src.TotalPrice,
                    Status = src.Status.ToString()
                });

            // Act
            var result = await _orderService.CreateOrderAsync(userId, addressId);

            // Assert
            Assert.NotNull(capturedOrder);
            Assert.Equal(25.00m, capturedOrder!.TotalPrice);
            Assert.Equal(OrderState.Created, capturedOrder.Status);
            Assert.Equal(25.00m, result.TotalPrice);

            _mockUnitOfWork.Verify(u => u.Orders.AddAsync(It.IsAny<Order>()), Times.Once);
            _mockUnitOfWork.Verify(u => u.Carts.ClearCart(cart), Times.Once);
            _mockUnitOfWork.Verify(u => u.SaveAsync(), Times.Once);
        }

        [Fact]
        public async Task CancelOrderAsync_ThrowsUnauthorizedAccess_WhenCustomerDoesNotOwnOrder()
        {
            // Arrange
            var order = new Order
            {
                Id = 10,
                UserId = "owner-user-id",
                Status = OrderState.Created
            };

            _mockUnitOfWork.Setup(u => u.Orders.GetOrderByIdAsync(10))
                .ReturnsAsync(order);

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => _orderService.CancelOrderAsync(10, "different-user-id", isAdmin: false));
        }
    }

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
            // Arrange
            const string userId = "test-user-1";
            var dto = new AddToCartDTO { MenuItemId = 1, Quantity = invalidQty };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(
                () => _cartService.AddToCartAsync(userId, dto));

            Assert.Equal(ErrorMessages.CartItemQuantityCannotBeZero, exception.Message);
        }

        [Fact]
        public async Task AddToCartAsync_ThrowsInvalidOperationException_WhenMenuItemIsUnavailable()
        {
            // Arrange
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

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _cartService.AddToCartAsync(userId, dto));

            Assert.Equal(ErrorMessages.MenuItemNotFoundOrUnavailable, exception.Message);
        }

        [Fact]
        public async Task AddToCartAsync_ThrowsInvalidOperationException_WhenAddingItemFromDifferentRestaurant()
        {
            // Arrange
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

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _cartService.AddToCartAsync(userId, new AddToCartDTO { MenuItemId = 2, Quantity = 1 }));

            Assert.Contains("same restaurant", exception.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task UpdateCartItemAsync_ThrowsArgumentException_WhenQuantityIsNegative()
        {
            // Arrange
            const string userId = "test-user-1";
            const int menuItemId = 1;
            const int invalidQuantity = -1;

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(
                () => _cartService.UpdateCartItemAsync(userId, menuItemId, invalidQuantity));

            Assert.Equal(ErrorMessages.CartItemQuantityCannotBeZero, exception.Message);
        }
    }

    public class OrderStateMachineTests
    {
        [Fact]
        public void OrderStateTransition_FollowsFullHappyPath()
        {
            // Arrange
            var order = new Order
            {
                Id = 1,
                UserId = "user1",
                RestaurantId = 1,
                AddressId = 1,
                CreatedAt = DateTime.UtcNow,
                TotalPrice = 50m,
                Status = OrderState.Created
            };

            // Act & Assert
            order.Confirm();
            Assert.Equal(OrderState.Confirmed, order.Status);

            order.StartPreparing();
            Assert.Equal(OrderState.Preparing, order.Status);

            order.SendForDelivery();
            Assert.Equal(OrderState.OnTheWay, order.Status);

            order.MarkAsDelivered();
            Assert.Equal(OrderState.Delivered, order.Status);
        }

        [Fact]
        public void OrderCancel_AllowedFromCreatedAndConfirmed_ThrowsFromPreparingOrLater()
        {
            var createdOrder = new Order { Id = 1, Status = OrderState.Created };
            createdOrder.Cancel();
            Assert.Equal(OrderState.Cancelled, createdOrder.Status);

            var confirmedOrder = new Order { Id = 2, Status = OrderState.Confirmed };
            confirmedOrder.Cancel();
            Assert.Equal(OrderState.Cancelled, confirmedOrder.Status);

            var preparingOrder = new Order { Id = 3, Status = OrderState.Preparing };
            var ex = Assert.Throws<InvalidOperationException>(() => preparingOrder.Cancel());
            Assert.Equal("Order can only be cancelled from Created or Confirmed status.", ex.Message);
        }

        [Fact]
        public void OrderStateTransition_ThrowsException_WhenSkippingStates()
        {
            var order = new Order { Id = 1, Status = OrderState.Created };

            Assert.Throws<InvalidOperationException>(() => order.MarkAsDelivered());
            Assert.Throws<InvalidOperationException>(() => order.SendForDelivery());
        }
    }
}