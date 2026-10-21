using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Interfaces
{
    public interface IAddressService
    {
        Task<AddressDTO> AddAddressAsync(CreateAddressDTO request);
        Task<IEnumerable<AddressDTO>> GetUserAddressesAsync(int userId);
    }
}
