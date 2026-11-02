using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
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

        public async Task<CartResponseDTO> GetCartAsync(string userId)
        {
            _logger.LogInformation("Retrieving cart for user: {UserId}", userId);

            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            if (cart == null)
            {
                _logger.LogInformation("No cart found for user: {UserId}", userId);
                return null;
            }

            var cartDto = new CartResponseDTO
            {
                Id = cart.Id,
                TotalPrice = cart.CartItems.Sum(i => i.Quantity * i.MenuItem.Price),
                Items = cart.CartItems.Select(i => new CartItemDTO
                {
                    MenuItemId = i.MenuItemId,
                    Name = i.MenuItem.Name,
                    Quantity = i.Quantity,
                    Price = i.MenuItem.Price,
                    LineTotal = i.Quantity * i.MenuItem.Price
                }).ToList()
            };

            _logger.LogInformation("Cart retrieved for user: {UserId} with {ItemCount} items", userId, cartDto.Items.Count);
            return cartDto;
        }

        public async Task AddToCartAsync(string userId, AddToCartDTO dto)
        {
            _logger.LogInformation("Adding to cart for user: {UserId}, MenuItem: {MenuItemId}, Quantity: {Quantity}", userId, dto.MenuItemId, dto.Quantity);

            if (dto.Quantity <= 0)
            {
                _logger.LogWarning("Invalid quantity {Quantity} for user {UserId}", dto.Quantity, userId);
                throw new ArgumentException(ErrorMessages.CartItemQuantityCannotBeZero);
            }

            var menuItem = await _unitOfWork.Menu.GetByIdAsync(dto.MenuItemId);
            if (menuItem == null || !menuItem.IsAvailable)
            {
                _logger.LogWarning("MenuItem {MenuItemId} not found or unavailable for user {UserId}", dto.MenuItemId, userId);
                throw new InvalidOperationException(ErrorMessages.MenuItemNotFoundOrUnavailable);
            }

            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            // if cart is null, create a new cart
            if (cart == null)
            {
                cart = new Cart { UserId = userId };
                await _unitOfWork.Carts.AddAsync(cart);
                _logger.LogInformation("New cart created for user: {UserId}", userId);
            }

            var existingItem = cart.CartItems.FirstOrDefault(i => i.MenuItemId == dto.MenuItemId);
            if (existingItem != null)
            {
                existingItem.Quantity += dto.Quantity;
                _logger.LogInformation("Updated quantity for MenuItem {MenuItemId} to {NewQuantity}", dto.MenuItemId, existingItem.Quantity);
            }
            else
            {
                cart.CartItems.Add(new CartItem
                {
                    MenuItemId = dto.MenuItemId,
                    Quantity = dto.Quantity,
                    UnitPrice = menuItem.Price
                });
                _logger.LogInformation("Added new item {MenuItemId} to cart with quantity {Quantity}", dto.MenuItemId, dto.Quantity);
            }

            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateCartItemAsync(string userId, int menuItemId, int quantity)
        {
            _logger.LogInformation("Updating cart item for user: {UserId}, MenuItem: {MenuItemId}, NewQuantity: {Quantity}", userId, menuItemId, quantity);

            if (quantity <= 0)
            {
                _logger.LogWarning("Invalid quantity {Quantity} for update", quantity);
                throw new ArgumentException(ErrorMessages.CartItemQuantityCannotBeZero);
            }

            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            var item = cart?.CartItems.FirstOrDefault(i => i.MenuItemId == menuItemId);

            if (item == null)
            {
                _logger.LogWarning("MenuItem {MenuItemId} not found in cart for user {UserId}", menuItemId, userId);
                throw new KeyNotFoundException(ErrorMessages.CartItemNotFound);
            }

            item.Quantity = quantity;
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Updated MenuItem {MenuItemId} quantity to {Quantity} for user {UserId}", menuItemId, quantity, userId);
        }

        public async Task RemoveFromCartAsync(string userId, int menuItemId)
        {
            _logger.LogInformation("Removing item from cart for user: {UserId}, MenuItem: {MenuItemId}", userId, menuItemId);

            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            var item = cart?.CartItems.FirstOrDefault(i => i.MenuItemId == menuItemId);

            if (item != null)
            {
                cart.CartItems.Remove(item);
                await _unitOfWork.SaveAsync();
                _logger.LogInformation("Removed MenuItem {MenuItemId} from cart for user {UserId}", menuItemId, userId);
            }
            else
            {
                _logger.LogWarning("MenuItem {MenuItemId} not found in cart for user {UserId}", menuItemId, userId);
                throw new KeyNotFoundException(ErrorMessages.CartItemNotFound);
            }
        }
    }
}
