using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Infrastructure.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly FoodDbContext _context;

        public IMenuRepository Menu { get; }
        public IOrderRepository Orders { get; }
        public ICartRepository Carts { get; }
        public IAddressRepository Addresses { get; }


        public UnitOfWork(FoodDbContext context,
                           IMenuRepository menuRepository,
                           IOrderRepository orderRepository,
                           ICartRepository cartRepository,
                           IAddressRepository addressRepository) 
        {
            _context = context;
            Menu = menuRepository;
            Orders = orderRepository;
            Carts = cartRepository;     
            Addresses = addressRepository; 

            
        }
        public async Task<int> SaveAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
