using Food.Application.DTOs;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Implementations
{
    public class CartService : ICartService
    {
        private readonly IUnitOfWork _unitOfWork;

        public CartService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<object> GetCartAsync(string userId)
        {
            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            if (cart == null) return null;

            return new
            {
                cart.Id,
                TotalPrice = cart.CartItems.Sum(i => i.Quantity * i.MenuItem.Price),
                Items = cart.CartItems.Select(i => new
                {
                    i.MenuItemId,
                    i.MenuItem.Name,
                    i.Quantity,
                    i.MenuItem.Price
                })
            };
        }

        public async Task AddToCartAsync(string userId, AddToCartDTO dto)
        {
            if (dto.Quantity <= 0) throw new Exception("რაოდენობა უნდა იყოს 0-ზე მეტი.");

            var menuItem = await _unitOfWork.Menu.GetByIdAsync(dto.MenuItemId);
            if (menuItem == null || !menuItem.IsAvailable)
                throw new Exception("კერძი მიუწვდომელია.");

            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            // if cart is null, create a new cart

            var existingItem = cart.CartItems.FirstOrDefault(i => i.MenuItemId == dto.MenuItemId);
            if (existingItem != null)
            {
                existingItem.Quantity += dto.Quantity;
            }
            else
            {
                cart.CartItems.Add(new CartItem
                {
                    MenuItemId = dto.MenuItemId,
                    Quantity = dto.Quantity,
                    UnitPrice = menuItem.Price
                });
            }

            await _unitOfWork.SaveAsync();
        }

        public async Task UpdateCartItemAsync(string userId, int menuItemId, int quantity)
        {
            if (quantity <= 0) throw new Exception("რაოდენობა უნდა იყოს 0-ზე მეტი.");

            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            var item = cart?.CartItems.FirstOrDefault(i => i.MenuItemId == menuItemId);

            if (item == null) throw new Exception("კერძი კალათაში არ მოიძებნა.");

            item.Quantity = quantity;
            await _unitOfWork.SaveAsync();
        }

        public async Task RemoveFromCartAsync(string userId, int menuItemId)
        {
            var cart = await _unitOfWork.Carts.GetCartByUserIdAsync(userId);
            var item = cart?.CartItems.FirstOrDefault(i => i.MenuItemId == menuItemId);

            if (item != null)
            {
                cart.CartItems.Remove(item);
                await _unitOfWork.SaveAsync();
            }
        }
    }
}