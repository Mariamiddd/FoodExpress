using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Interfaces
{
    public interface IAddressRepository
    {
        Task AddAsync(Address address);
        Task<IEnumerable<Address>> GetAllAsync();
        Task<IEnumerable<Address>> GetAddressesByUserIdAsync(string userId);
    }
}
