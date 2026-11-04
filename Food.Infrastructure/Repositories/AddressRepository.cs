using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Food.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Infrastructure.Repositories
{
    public class AddressRepository : IAddressRepository
    {
        private readonly FoodDbContext _context;

        public AddressRepository(FoodDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Address address)
        {
            await _context.Addresses.AddAsync(address);
        }

        public async Task<Address?> GetByIdAsync(int id)
        {
            return await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<IEnumerable<Address>> GetAllAsync()
        {
            return await _context.Addresses
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<IEnumerable<Address>> GetAddressesByUserIdAsync(string userId)
        {
            return await _context.Addresses
                .AsNoTracking()
                .Where(a => a.UserId == userId)
                .ToListAsync();
        }

        public async Task<bool> IsUsedInOrdersAsync(int addressId)
        {
            return await _context.Orders.AnyAsync(o => o.AddressId == addressId);
        }

        public void Delete(Address address)
        {
            _context.Addresses.Remove(address);
        }
    }
}