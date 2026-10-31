using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;
using AutoMapper;

namespace Food.Application.Services.Implementations
{
    public class AddressService : IAddressService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public AddressService(
            IUnitOfWork unitOfWork,
            IMapper mapper)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<AddressDTO> AddAddressAsync(
            string userId,
            CreateAddressDTO request)
        {
            var address = _mapper.Map<Address>(request);

            // Assign the authenticated user's ID
            address.UserId = userId;

            await _unitOfWork.Addresses.AddAsync(address);
            await _unitOfWork.SaveAsync();

            return _mapper.Map<AddressDTO>(address);
        }

        public async Task<IEnumerable<AddressDTO>> GetUserAddressesAsync(
            string userId)
        {
            var userAddresses =
                await _unitOfWork.Addresses
                    .GetAddressesByUserIdAsync(userId);

            return _mapper.Map<IEnumerable<AddressDTO>>(userAddresses);
        }
    }
}