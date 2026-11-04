using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Interfaces
{
    public interface IAddressRepository
    {
        Task AddAsync(Address address);
        Task<Address?> GetByIdAsync(int id);
        Task<IEnumerable<Address>> GetAllAsync();
        Task<IEnumerable<Address>> GetAddressesByUserIdAsync(string userId);
        Task<bool> IsUsedInOrdersAsync(int addressId);
        void Delete(Address address);
    }
}
