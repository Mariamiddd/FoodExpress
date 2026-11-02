using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Services.Implementations;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Domain.Models.Identity;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace Food.Tests
{
    /// <summary>
    /// Unit tests for OrderService business logic
    /// Tests cover order creation, validation, and authorization scenarios
    /// </summary>
    public class OrderServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUnitOfWork;
        private readonly Mock<ILogger<OrderService>> _mockLogger;
        private readonly OrderService _orderService;

        public OrderServiceTests()
        {
            _mockUnitOfWork = new Mock<IUnitOfWork>();
            _mockLogger = new Mock<ILogger<OrderService>>();

            // Create a mock mapper instead of full AutoMapper configuration
            var mockMapper = new Mock<AutoMapper.IMapper>();

            _orderService = new OrderService(_mockUnitOfWork.Object, mockMapper.Object, _mockLogger.Object);
        }

        /// <summary>
        /// Test Case 1: Order creation validates all items belong to same restaurant
        /// </summary>
        [Fact]
        public async Task CreateOrderAsync_ThrowsException_WhenCartHasItemsFromMultipleRestaurants()
        {
            // Arrange
            var userId = "test-user-1";
            var addressId = 1;

            var address = new Address { Id = addressId, UserId = userId, Street = "123 Main", City = "City" };
            var restaurantIds = new List<Address> { address };

            var restaurant1 = new Restaurant { Id = 1, Name = "Restaurant 1", Address = "Address1" };
            var restaurant2 = new Restaurant { Id = 2, Name = "Restaurant 2", Address = "Address2" };

            var menuItem1 = new MenuItem { Id = 1, RestaurantId = 1, CategoryId = 1, Name = "Item 1", Price = 10, IsAvailable = true, Restaurant = restaurant1 };
            var menuItem2 = new MenuItem { Id = 2, RestaurantId = 2, CategoryId = 1, Name = "Item 2", Price = 15, IsAvailable = true, Restaurant = restaurant2 };

            var cartItems = new List<CartItem>
            {
                new CartItem { Id = 1, MenuItemId = 1, Quantity = 1, UnitPrice = 10, MenuItem = menuItem1 },
                new CartItem { Id = 2, MenuItemId = 2, Quantity = 1, UnitPrice = 15, MenuItem = menuItem2 }
            };

            var cart = new Cart { Id = 1, UserId = userId, CartItems = cartItems };

            _mockUnitOfWork.Setup(u => u.Addresses.GetAddressesByUserIdAsync(userId))
                .ReturnsAsync(new List<Address> { address });

            _mockUnitOfWork.Setup(u => u.Carts.GetCartByUserIdAsync(userId))
                .ReturnsAsync(cart);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _orderService.CreateOrderAsync(userId, addressId));

            Assert.Equal(ErrorMessages.MixedRestaurantError, exception.Message);
        }

        /// <summary>
        /// Test Case 2: Order creation fails when user's address is invalid
        /// </summary>
        [Fact]
        public async Task CreateOrderAsync_ThrowsException_WhenAddressDoesNotBelongToUser()
        {
            // Arrange
            var userId = "test-user-1";
            var invalidAddressId = 999;

            var userAddress = new Address { Id = 1, UserId = userId, Street = "123 Main", City = "City" };

            _mockUnitOfWork.Setup(u => u.Addresses.GetAddressesByUserIdAsync(userId))
                .ReturnsAsync(new List<Address> { userAddress });

            // Act & Assert
            var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => _orderService.CreateOrderAsync(userId, invalidAddressId));

            Assert.Equal("The selected address does not belong to this user.", exception.Message);
        }

        /// <summary>
        /// Test Case 3: Successful order creation with valid cart from single restaurant
        /// </summary>
        [Fact]
        public async Task CreateOrderAsync_SuccessfullyCreatesOrder_WhenValidCartExists()
        {
            // Arrange
            var userId = "test-user-1";
            var addressId = 1;

            var address = new Address { Id = addressId, UserId = userId, Street = "123 Main", City = "City" };
            var restaurant = new Restaurant { Id = 1, Name = "Test Restaurant", Address = "123 Res St" };

            var menuItem = new MenuItem 
            { 
                Id = 1, 
                RestaurantId = 1, 
                CategoryId = 1, 
                Name = "Test Item", 
                Price = 10.99m, 
                IsAvailable = true, 
                Restaurant = restaurant 
            };

            var cartItems = new List<CartItem>
            {
                new CartItem { Id = 1, MenuItemId = 1, Quantity = 2, UnitPrice = 10.99m, MenuItem = menuItem }
            };

            var cart = new Cart { Id = 1, UserId = userId, CartItems = cartItems };

            _mockUnitOfWork.Setup(u => u.Addresses.GetAddressesByUserIdAsync(userId))
                .ReturnsAsync(new List<Address> { address });

            _mockUnitOfWork.Setup(u => u.Carts.GetCartByUserIdAsync(userId))
                .ReturnsAsync(cart);

            _mockUnitOfWork.Setup(u => u.Orders.AddAsync(It.IsAny<Order>()))
                .Returns(Task.CompletedTask);

            _mockUnitOfWork.Setup(u => u.SaveAsync())
                .ReturnsAsync(1);

            // Act
            var result = await _orderService.CreateOrderAsync(userId, addressId);

            // Assert
            // Verify that the service successfully created an order and saved it
            _mockUnitOfWork.Verify(u => u.Orders.AddAsync(It.IsAny<Order>()), Moq.Times.Once);
            _mockUnitOfWork.Verify(u => u.SaveAsync(), Moq.Times.Once);
        }
    }

    /// <summary>
    /// Unit tests for CartService business logic
    /// Tests cover cart operations, validation, and quantity management
    /// </summary>
    public class CartServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUnitOfWork;
        private readonly Mock<ILogger<CartService>> _mockLogger;
        private readonly CartService _cartService;

        public CartServiceTests()
        {
            _mockUnitOfWork = new Mock<IUnitOfWork>();
            _mockLogger = new Mock<ILogger<CartService>>();
            _cartService = new CartService(_mockUnitOfWork.Object, _mockLogger.Object);
        }

        /// <summary>
        /// Test Case 4: Adding to cart with invalid quantity throws exception
        /// </summary>
        [Fact]
        public async Task AddToCartAsync_ThrowsException_WhenQuantityIsZeroOrNegative()
        {
            // Arrange
            var userId = "test-user-1";
            var dto = new AddToCartDTO { MenuItemId = 1, Quantity = 0 };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(
                () => _cartService.AddToCartAsync(userId, dto));

            Assert.Equal("Quantity must be greater than 0.", exception.Message);
        }

        /// <summary>
        /// Test Case 5: Adding unavailable menu item to cart fails
        /// </summary>
        [Fact]
        public async Task AddToCartAsync_ThrowsException_WhenMenuItemIsUnavailable()
        {
            // Arrange
            var userId = "test-user-1";
            var dto = new AddToCartDTO { MenuItemId = 1, Quantity = 1 };

            var unavailableMenuItem = new MenuItem 
            { 
                Id = 1, 
                Name = "Unavailable Item", 
                Price = 10,
                IsAvailable = false,
                RestaurantId = 1,
                CategoryId = 1
            };

            _mockUnitOfWork.Setup(u => u.Menu.GetByIdAsync(1))
                .ReturnsAsync(unavailableMenuItem);

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _cartService.AddToCartAsync(userId, dto));

            Assert.Equal("Menu item not found or unavailable.", exception.Message);
        }

        /// <summary>
        /// Test Case 6: Updating cart item with invalid quantity throws exception
        /// </summary>
        [Fact]
        public async Task UpdateCartItemAsync_ThrowsException_WhenQuantityIsNegative()
        {
            // Arrange
            var userId = "test-user-1";
            var menuItemId = 1;
            var invalidQuantity = -1;

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(
                () => _cartService.UpdateCartItemAsync(userId, menuItemId, invalidQuantity));

            Assert.Equal("Quantity must be greater than 0.", exception.Message);
        }
    }

    /// <summary>
    /// Unit tests for authorization and authentication scenarios
    /// </summary>
    public class AuthorizationTests
    {
        /// <summary>
        /// Test Case 7: OrderState enum transitions follow business rules
        /// </summary>
        [Fact]
        public void OrderStateTransition_FollowsBusinessRules()
        {
            // Arrange
            var order = new Order
            {
                Id = 1,
                UserId = "user1",
                RestaurantId = 1,
                AddressId = 1,
                CreatedAt = DateTime.UtcNow,
                TotalPrice = 50,
                Status = OrderState.Created
            };

            // Act - Confirm transition
            order.Confirm();

            // Assert
            Assert.Equal(OrderState.Confirmed, order.Status);

            // Act - Start preparing
            order.StartPreparing();

            // Assert
            Assert.Equal(OrderState.Preparing, order.Status);

            // Act - Send for delivery
            order.SendForDelivery();

            // Assert
            Assert.Equal(OrderState.OnTheWay, order.Status);

            // Act - Mark as delivered
            order.MarkAsDelivered();

            // Assert
            Assert.Equal(OrderState.Delivered, order.Status);
        }

        /// <summary>
        /// Test Case 8: Cancel is only allowed from Created or Confirmed state
        /// </summary>
        [Fact]
        public void OrderCancel_OnlyAllowedFromCreatedOrConfirmedState()
        {
            // Arrange - Test from Created state
            var order = new Order
            {
                Id = 1,
                UserId = "user1",
                RestaurantId = 1,
                AddressId = 1,
                CreatedAt = DateTime.UtcNow,
                TotalPrice = 50,
                Status = OrderState.Created
            };

            // Act & Assert - Should succeed from Created
            order.Cancel();
            Assert.Equal(OrderState.Cancelled, order.Status);

            // Arrange - Test from Preparing state (should fail)
            var order2 = new Order
            {
                Id = 2,
                UserId = "user1",
                RestaurantId = 1,
                AddressId = 1,
                CreatedAt = DateTime.UtcNow,
                TotalPrice = 50,
                Status = OrderState.Preparing
            };

            // Act & Assert - Should throw exception
            var exception = Assert.Throws<InvalidOperationException>(() => order2.Cancel());
            Assert.Equal("Order can only be cancelled from Created or Confirmed status.", exception.Message);
        }
    }
}
