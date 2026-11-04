using AutoMapper;
using Food.Application.Constants;
using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services.Implementations
{
    public class AddressService : IAddressService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ILogger<AddressService> _logger;

        public AddressService(IUnitOfWork unitOfWork, IMapper mapper, ILogger<AddressService> logger)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<AddressDTO> AddAddressAsync(string userId, CreateAddressDTO request)
        {
            var address = _mapper.Map<Address>(request);
            address.UserId = userId;

            await _unitOfWork.Addresses.AddAsync(address);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Added new address {AddressId} for user {UserId}", address.Id, userId);
            return _mapper.Map<AddressDTO>(address);
        }

        public async Task<IEnumerable<AddressDTO>> GetUserAddressesAsync(string userId)
        {
            var userAddresses = await _unitOfWork.Addresses.GetAddressesByUserIdAsync(userId);
            return _mapper.Map<IEnumerable<AddressDTO>>(userAddresses);
        }

        public async Task<bool> DeleteAddressAsync(string userId, int addressId)
        {
            var address = await _unitOfWork.Addresses.GetByIdAsync(addressId);
            if (address == null)
            {
                return false;
            }

            if (address.UserId != userId)
            {
                _logger.LogWarning("User {UserId} attempted to delete address {AddressId} owned by another user", userId, addressId);
                throw new UnauthorizedAccessException(ErrorMessages.AddressDoesNotBelongToUser);
            }

            if (await _unitOfWork.Addresses.IsUsedInOrdersAsync(addressId))
            {
                throw new InvalidOperationException("This address cannot be deleted because it is linked to existing orders.");
            }

            _unitOfWork.Addresses.Delete(address);
            await _unitOfWork.SaveAsync();

            _logger.LogInformation("Deleted address {AddressId} for user {UserId}", addressId, userId);
            return true;
        }
    }
}