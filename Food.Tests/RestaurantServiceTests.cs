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
    public class RestaurantServiceTests
    {
        private readonly Mock<IUnitOfWork> _mockUnitOfWork = new();
        private readonly Mock<IMapper> _mockMapper = new();
        private readonly Mock<ILogger<RestaurantService>> _mockLogger = new();
        private readonly RestaurantService _restaurantService;

        public RestaurantServiceTests()
        {
            _mockMapper
                .Setup(m => m.Map<Restaurant>(It.IsAny<CreateRestaurantDTO>()))
                .Returns((CreateRestaurantDTO dto) => new Restaurant
                {
                    Name = dto.Name,
                    Address = dto.Address,
                    IsActive = true
                });

            _mockMapper
                .Setup(m => m.Map<IEnumerable<RestaurantDTO>>(It.IsAny<IEnumerable<Restaurant>>()))
                .Returns((IEnumerable<Restaurant> src) =>
                    src.Select(r => new RestaurantDTO
                    {
                        Id = r.Id,
                        Name = r.Name,
                        Address = r.Address,
                        IsActive = r.IsActive
                    }).ToList());

            _restaurantService = new RestaurantService(
                _mockUnitOfWork.Object,
                _mockMapper.Object,
                _mockLogger.Object);
        }

        [Fact]
        public async Task AddRestaurantAsync_ThrowsInvalidOperationException_WhenRestaurantNameAlreadyExists()
        {
            var dto = new CreateRestaurantDTO
            {
                Name = "  Sakura Sushi  ",
                Address = "12 Rustaveli Ave"
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetAllAsync())
                .ReturnsAsync([
                    new Restaurant { Id = 1, Name = "sakura sushi", Address = "Old St 1" }
                ]);

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _restaurantService.AddRestaurantAsync(dto));

            Assert.Equal(ErrorMessages.RestaurantAlreadyExists, exception.Message);
        }

        [Fact]
        public async Task AddRestaurantAsync_TrimsFieldsAndSaves_WhenValid()
        {
            var dto = new CreateRestaurantDTO
            {
                Name = "  Tbilisi Grill  ",
                Address = "  24 Chavchavadze Ave  "
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetAllAsync())
                .ReturnsAsync([]);

            _mockUnitOfWork.Setup(u => u.Restaurants.AddAsync(It.IsAny<Restaurant>()))
                .Callback<Restaurant>(r => r.Id = 7)
                .Returns(Task.CompletedTask);

            var id = await _restaurantService.AddRestaurantAsync(dto);

            Assert.Equal(7, id);
            _mockUnitOfWork.Verify(u => u.Restaurants.AddAsync(It.Is<Restaurant>(
                r => r.Name == "Tbilisi Grill" && r.Address == "24 Chavchavadze Ave")),
                Times.Once);
            _mockUnitOfWork.Verify(u => u.SaveAsync(), Times.Once);
        }

        [Fact]
        public async Task UpdateRestaurantAsync_ReturnsFalse_WhenRestaurantDoesNotExist()
        {
            var dto = new UpdateRestaurantDTO
            {
                Id = 404,
                Name = "Ghost Kitchen",
                Address = "10 Main St",
                IsActive = true
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetByIdAsync(404))
                .ReturnsAsync((Restaurant?)null);

            var updated = await _restaurantService.UpdateRestaurantAsync(dto);

            Assert.False(updated);
            _mockUnitOfWork.Verify(u => u.SaveAsync(), Times.Never);
        }

        [Fact]
        public async Task UpdateRestaurantAsync_ThrowsInvalidOperationException_WhenDuplicateNameBelongsToDifferentRestaurant()
        {
            var targetRestaurant = new Restaurant { Id = 1, Name = "Pizza Hub", Address = "1st St", IsActive = true };
            var otherRestaurant = new Restaurant { Id = 2, Name = "Burger Hub", Address = "2nd St", IsActive = true };

            var dto = new UpdateRestaurantDTO
            {
                Id = 1,
                Name = "burger hub",
                Address = "1st St",
                IsActive = true
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetByIdAsync(1))
                .ReturnsAsync(targetRestaurant);

            _mockUnitOfWork.Setup(u => u.Restaurants.GetAllAsync())
                .ReturnsAsync([targetRestaurant, otherRestaurant]);

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _restaurantService.UpdateRestaurantAsync(dto));

            Assert.Equal(ErrorMessages.RestaurantAlreadyExists, exception.Message);
        }

        [Fact]
        public async Task GetAllRestaurantsAsync_FiltersByCategoryId_WhenCategoryIdProvided()
        {
            var pizzaPlace = new Restaurant
            {
                Id = 1,
                Name = "Napoli Pizza",
                MenuItems = [new MenuItem { Id = 1, Name = "Margherita", CategoryId = 10 }]
            };

            var sushiPlace = new Restaurant
            {
                Id = 2,
                Name = "Tokyo Sushi",
                MenuItems = [new MenuItem { Id = 2, Name = "Salmon Roll", CategoryId = 20 }]
            };

            _mockUnitOfWork.Setup(u => u.Restaurants.GetAllAsync())
                .ReturnsAsync([pizzaPlace, sushiPlace]);

            var result = (await _restaurantService.GetAllRestaurantsAsync(categoryId: 10)).ToList();

            Assert.Single(result);
            Assert.Equal("Napoli Pizza", result[0].Name);
        }

        [Fact]
        public async Task DeleteRestaurantAsync_DeletesAndReturnsTrue_WhenRestaurantExists()
        {
            _mockUnitOfWork.Setup(u => u.Restaurants.GetByIdAsync(3))
                .ReturnsAsync(new Restaurant { Id = 3, Name = "Old Bistro" });

            var deleted = await _restaurantService.DeleteRestaurantAsync(3);

            Assert.True(deleted);
            _mockUnitOfWork.Verify(u => u.Restaurants.DeleteAsync(3), Times.Once);
            _mockUnitOfWork.Verify(u => u.SaveAsync(), Times.Once);
        }
    }
}