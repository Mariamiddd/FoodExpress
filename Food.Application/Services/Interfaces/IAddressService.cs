using Food.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Interfaces
{
    public interface IAddressService
    {
        public interface IAddressService
        {
            Task<AddressDTO> AddAddressAsync(
                string userId,
                CreateAddressDTO request);

            Task<IEnumerable<AddressDTO>> GetUserAddressesAsync(
                string userId);
        }
    }
}