using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Infrastructure.Repositories
{
    public class CartRepository : ICartRepository
    {
        private readonly FoodDbContext _context;

        public CartRepository(FoodDbContext context)
        {
            _context = context;
        }

        public async Task<Cart> GetCartByUserIdAsync(string userId)
        {
            return await _context.Carts
                .Include(c => c.CartItems)
                .ThenInclude(i => i.MenuItem)
                .FirstOrDefaultAsync(c => c.UserId == userId);
        }

        public void ClearCart(Cart cart)
        {
            _context.CartItems.RemoveRange(cart.CartItems);
        }
    }
}