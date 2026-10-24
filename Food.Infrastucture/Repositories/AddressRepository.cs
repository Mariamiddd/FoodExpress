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

        public async Task<IEnumerable<Address>> GetAllAsync()
        {
            return await _context.Addresses.ToListAsync();
        }

        public async Task<IEnumerable<Address>> GetAddressesByUserIdAsync(int userId)
        {
            return await _context.Addresses
                .Where(a => a.UserId == userId)
                .ToListAsync();
        }
    }
}