using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Application.Validators;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Microsoft.Extensions.Logging;

namespace Food.Application.Services.Implementations
{
    public class CartService : ICartService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<CartService> _logger;

        public CartService(IUnitOfWork unitOfWork, ILogger<CartService> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        private async Task<Cart> GetOrCreateCartEntityAsync(string userId)
        {
            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            if (cart == null)
            {
                cart = new Cart { UserId = userId };
                await _unitOfWork.Carts.AddAsync(cart);
                await _unitOfWork.SaveAsync();
                cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId) ?? cart;
            }
            return cart;
        }

        public async Task<CartResponseDTO> GetCartAsync(string userId)
        {
            _logger.LogInformation("Retrieving cart for user: {UserId}", userId);

            var cart = await GetOrCreateCartEntityAsync(userId);
            cart.RecalculateTotal();

            var firstItem = cart.CartItems.FirstOrDefault(i => i.MenuItem != null);

            return new CartResponseDTO
            {
                Id = cart.Id,
                UserId = userId,
                RestaurantId = firstItem?.MenuItem?.RestaurantId,
                RestaurantName = firstItem?.MenuItem?.Restaurant?.Name,
                TotalPrice = cart.TotalPrice,
                Items = cart.CartItems.Select(i => new CartItemDTO
                {
                    MenuItemId = i.MenuItemId,
                    Name = i.MenuItem?.Name ?? "Item",
                    Quantity = i.Quantity,
                    Price = i.MenuItem?.Price ?? i.UnitPrice,
                    LineTotal = i.Quantity * (i.MenuItem?.Price ?? i.UnitPrice),
                    RestaurantId = i.MenuItem?.RestaurantId ?? 0,
                    RestaurantName = i.MenuItem?.Restaurant?.Name
                }).ToList()
            };
        }

        public async Task AddToCartAsync(string userId, AddToCartDTO dto)
        {
            _logger.LogInformation("Adding to cart for user: {UserId}, MenuItem: {MenuItemId}, Quantity: {Quantity}", userId, dto.MenuItemId, dto.Quantity);

            BusinessRulesValidator.ValidateQuantity(dto.Quantity);

            var menuItem = await _unitOfWork.Menu.GetByIdAsync(dto.MenuItemId);
            BusinessRulesValidator.ValidateMenuItemAvailability(menuItem);
            await EnsureRestaurantAcceptingOrdersAsync(menuItem!);

            var cart = await GetOrCreateCartEntityAsync(userId);
            BusinessRulesValidator.ValidateSingleRestaurantRule(cart, menuItem!.RestaurantId);

            cart.AddItem(menuItem, dto.Quantity);
            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateCartItemAsync(string userId, int menuItemId, int quantity)
        {
            _logger.LogInformation("Updating cart item for user: {UserId}, MenuItem: {MenuItemId}, NewQuantity: {Quantity}", userId, menuItemId, quantity);

            BusinessRulesValidator.ValidateQuantity(quantity);

            var menuItem = await _unitOfWork.Menu.GetByIdAsync(menuItemId);
            if (menuItem != null)
            {
                await EnsureRestaurantAcceptingOrdersAsync(menuItem);
            }

            var cart = await GetOrCreateCartEntityAsync(userId);
            cart.UpdateItemQuantity(menuItemId, quantity);

            await _unitOfWork.SaveAsync();
        }

        private async Task EnsureRestaurantAcceptingOrdersAsync(MenuItem menuItem)
        {
            var restaurant = menuItem.Restaurant;
            if (restaurant == null && _unitOfWork.Restaurants != null)
            {
                restaurant = await _unitOfWork.Restaurants.GetByIdAsync(menuItem.RestaurantId);
            }

            if (restaurant != null && !restaurant.IsActive)
            {
                throw new InvalidOperationException(ErrorMessages.RestaurantClosed);
            }
        }

        public async Task RemoveFromCartAsync(string userId, int menuItemId)
        {
            _logger.LogInformation("Removing item from cart for user: {UserId}, MenuItem: {MenuItemId}", userId, menuItemId);

            var cart = await GetOrCreateCartEntityAsync(userId);
            cart.RemoveItem(menuItemId);

            await _unitOfWork.SaveAsync();
        }
    }
}