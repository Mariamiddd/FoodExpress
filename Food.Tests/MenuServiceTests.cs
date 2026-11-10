using AutoMapper;
using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Services.Implementations;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Microsoft.Extensions.Logging;
using Moq;

namespace Food.Tests
{
    public class MenuServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUnitOfWork = new();
        private readonly Mock<IMapper> _mockMapper = new();
        private readonly Mock<ILogger<MenuService>> _mockLogger = new();
        private readonly MenuService _menuService;

        public MenuServiceTests()
        {
            _mockMapper
                .Setup(m => m.Map<MenuItem>(It.IsAny<CreateMenuItemDTO>()))
                .Returns((CreateMenuItemDTO dto) => new MenuItem
                {
                    Name = dto.Name,
                    Price = dto.Price,
                    RestaurantId = dto.RestaurantId,
                    CategoryId = dto.CategoryId,
                    IsAvailable = true
                });

            _mockMapper
                .Setup(m => m.Map<MenuItemDTO>(It.IsAny<MenuItem>()))
                .Returns((MenuItem item) => new MenuItemDTO
                {
                    Id = item.Id,
                    Name = item.Name,
                    Price = item.Price,
                    IsAvailable = item.IsAvailable,
                    RestaurantId = item.RestaurantId,
                    CategoryId = item.CategoryId
                });

            _menuService = new MenuService(
                _mockUnitOfWork.Object,
                _mockMapper.Object,
                _mockLogger.Object);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-12.50)]
        public async Task AddMenuItemAsync_ThrowsArgumentException_WhenPriceIsZeroOrNegative(decimal invalidPrice)
        {
            var dto = new CreateMenuItemDTO
            {
                Name = "Margherita Pizza",
                Price = invalidPrice,
                RestaurantId = 1,
                CategoryId = 1
            };

            var exception = await Assert.ThrowsAsync<ArgumentException>(
                () => _menuService.AddMenuItemAsync(dto));

            Assert.Equal(ErrorMessages.MenuItemPriceInvalid, exception.Message);
        }

        [Fact]
        public async Task AddMenuItemAsync_ThrowsKeyNotFoundException_WhenRestaurantDoesNotExist()
        {
            var dto = new CreateMenuItemDTO
            {
                Name = "Pepperoni Pizza",
                Price = 15m,
                RestaurantId = 99,
                CategoryId = 1
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetByIdAsync(99))
                .ReturnsAsync((Restaurant?)null);

            var exception = await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _menuService.AddMenuItemAsync(dto));

            Assert.Equal(ErrorMessages.RestaurantNotFound, exception.Message);
        }

        [Fact]
        public async Task AddMenuItemAsync_ThrowsKeyNotFoundException_WhenCategoryDoesNotExist()
        {
            var dto = new CreateMenuItemDTO
            {
                Name = "Pepperoni Pizza",
                Price = 15m,
                RestaurantId = 1,
                CategoryId = 99
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetByIdAsync(1))
                .ReturnsAsync(new Restaurant { Id = 1, Name = "Napoli" });

            _mockUnitOfWork.Setup(u => u.Menu.GetCategoryByIdAsync(99))
                .ReturnsAsync((Category?)null);

            var exception = await Assert.ThrowsAsync<KeyNotFoundException>(
                () => _menuService.AddMenuItemAsync(dto));

            Assert.Equal(ErrorMessages.CategoryNotFound, exception.Message);
        }

        [Fact]
        public async Task AddMenuItemAsync_ThrowsInvalidOperationException_WhenDuplicateNameExistsInRestaurant()
        {
            var dto = new CreateMenuItemDTO
            {
                Name = "  classic burger  ",
                Price = 12m,
                RestaurantId = 1,
                CategoryId = 2
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetByIdAsync(1))
                .ReturnsAsync(new Restaurant { Id = 1, Name = "Burger House" });

            _mockUnitOfWork.Setup(u => u.Menu.GetCategoryByIdAsync(2))
                .ReturnsAsync(new Category { Id = 2, Name = "Burgers" });

            _mockUnitOfWork.Setup(u => u.Menu.GetByRestaurantIdAsync(1))
                .ReturnsAsync([
                    new MenuItem { Id = 5, Name = "Classic Burger", Price = 10m, RestaurantId = 1 }
                ]);

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _menuService.AddMenuItemAsync(dto));

            Assert.Equal(ErrorMessages.MenuItemAlreadyExists, exception.Message);
        }

        [Fact]
        public async Task AddMenuItemAsync_SavesAndReturnsId_WhenInputIsValid()
        {
            var dto = new CreateMenuItemDTO
            {
                Name = "  Truffle Pasta  ",
                Price = 18.50m,
                RestaurantId = 1,
                CategoryId = 3
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetByIdAsync(1))
                .ReturnsAsync(new Restaurant { Id = 1, Name = "Roma Trattoria" });

            _mockUnitOfWork.Setup(u => u.Menu.GetCategoryByIdAsync(3))
                .ReturnsAsync(new Category { Id = 3, Name = "Pasta" });

            _mockUnitOfWork.Setup(u => u.Menu.GetByRestaurantIdAsync(1))
                .ReturnsAsync([]);

            _mockUnitOfWork.Setup(u => u.Menu.AddAsync(It.IsAny<MenuItem>()))
                .Callback<MenuItem>(m => m.Id = 42)
                .Returns(Task.CompletedTask);

            var resultId = await _menuService.AddMenuItemAsync(dto);

            Assert.Equal(42, resultId);
            _mockUnitOfWork.Verify(u => u.Menu.AddAsync(It.Is<MenuItem>(
                m => m.Name == "Truffle Pasta" && m.Price == 18.50m && m.RestaurantId == 1 && m.CategoryId == 3)),
                Times.Once);
            _mockUnitOfWork.Verify(u => u.SaveAsync(), Times.Once);
        }

        [Fact]
        public async Task UpdateMenuItemAsync_ReturnsFalse_WhenMenuItemDoesNotExist()
        {
            var dto = new UpdateMenuItemDTO
            {
                Id = 999,
                Name = "Updated Item",
                Price = 10m,
                CategoryId = 1,
                RestaurantId = 1
            };

            _mockUnitOfWork.Setup(u => u.Menu.GetByIdAsync(999))
                .ReturnsAsync((MenuItem?)null);

            var result = await _menuService.UpdateMenuItemAsync(dto);

            Assert.False(result);
            _mockUnitOfWork.Verify(u => u.SaveAsync(), Times.Never);
        }

        [Fact]
        public async Task UpdateMenuItemAsync_ThrowsInvalidOperationException_WhenNameConflictsWithAnotherItemInSameRestaurant()
        {
            var existingItem = new MenuItem { Id = 1, Name = "Cheese Burger", Price = 10m, RestaurantId = 1, CategoryId = 1 };
            var otherItemInSameRestaurant = new MenuItem { Id = 2, Name = "Bacon Burger", Price = 12m, RestaurantId = 1, CategoryId = 1 };

            var dto = new UpdateMenuItemDTO
            {
                Id = 1,
                Name = "bacon burger",
                Price = 11m,
                CategoryId = 1,
                RestaurantId = 1,
                IsAvailable = true
            };

            _mockUnitOfWork.Setup(u => u.Menu.GetByIdAsync(1))
                .ReturnsAsync(existingItem);

            _mockUnitOfWork.Setup(u => u.Menu.GetCategoryByIdAsync(1))
                .ReturnsAsync(new Category { Id = 1, Name = "Burgers" });

            _mockUnitOfWork.Setup(u => u.Menu.GetByRestaurantIdAsync(1))
                .ReturnsAsync([existingItem, otherItemInSameRestaurant]);

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _menuService.UpdateMenuItemAsync(dto));

            Assert.Equal(ErrorMessages.MenuItemAlreadyExists, exception.Message);
        }

        [Fact]
        public async Task DeleteMenuItemAsync_ReturnsFalse_WhenMenuItemNotFound()
        {
            _mockUnitOfWork.Setup(u => u.Menu.GetByIdAsync(50))
                .ReturnsAsync((MenuItem?)null);

            var deleted = await _menuService.DeleteMenuItemAsync(50);

            Assert.False(deleted);
            _mockUnitOfWork.Verify(u => u.Menu.DeleteAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task DeleteMenuItemAsync_DeletesAndReturnsTrue_WhenMenuItemExists()
        {
            _mockUnitOfWork.Setup(u => u.Menu.GetByIdAsync(10))
                .ReturnsAsync(new MenuItem { Id = 10, Name = "Caesar Salad", Price = 8m });

            var deleted = await _menuService.DeleteMenuItemAsync(10);

            Assert.True(deleted);
            _mockUnitOfWork.Verify(u => u.Menu.DeleteAsync(10), Times.Once);
            _mockUnitOfWork.Verify(u => u.SaveAsync(), Times.Once);
        }

        [Fact]
        public async Task AddCategoryAsync_ThrowsInvalidOperationException_WhenCategoryAlreadyExists()
        {
            var dto = new CreateCategoryDTO { Name = "  Desserts  " };

            _mockUnitOfWork.Setup(u => u.Menu.GetAllCategoriesAsync())
                .ReturnsAsync([new Category { Id = 1, Name = "desserts" }]);

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _menuService.AddCategoryAsync(dto));

            Assert.Equal(ErrorMessages.CategoryAlreadyExists, exception.Message);
        }
    }
}