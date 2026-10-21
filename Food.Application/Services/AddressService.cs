using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Services
{
    public class AddressService : IAddressService
    {
        private readonly IUnitOfWork _unitOfWork;

        public AddressService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<AddressDTO> AddAddressAsync(CreateAddressDTO request)
        {
            var address = new Address
            {
                UserId = request.UserId,
                Street = request.Street,
                City = request.City
            };

            await _unitOfWork.Addresses.AddAsync(address);
            await _unitOfWork.SaveAsync();

            return new AddressDTO
            {
                Id = address.Id,
                UserId = address.UserId,
                Street = address.Street,
                City = address.City
            };
        }

        public async Task<IEnumerable<AddressDTO>> GetUserAddressesAsync(int userId)
        {
            // check it later
            var addresses = await _unitOfWork.Addresses.GetAllAsync();

            return addresses
                .Where(a => a.UserId == userId)
                .Select(a => new AddressDTO
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    Street = a.Street,
                    City = a.City
                });
        }
    }
}