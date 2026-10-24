using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Infrastructure.Repositories
{
    public class OrderRepository : IOrderRepository
    {
        private readonly FoodDbContext _context;

        public OrderRepository(FoodDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Order order)
        {
            await _context.Orders.AddAsync(order);
        }

        public async Task<IEnumerable<Order>> GetAllAsync()
        {
            return await _context.Orders.ToListAsync();
        }

        public async Task<Order> GetOrderByIdAsync(int orderId)
        {
            
            return await _context.Orders.Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }

        public Task UpdateAsync(Order order)
        {
            _context.Orders.Update(order);
            return Task.CompletedTask;
        }
    }
}