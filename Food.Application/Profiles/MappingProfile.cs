using AutoMapper;
using Food.Application.DTOs;
using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Profiles
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // We map from Entity to DTO
            CreateMap<Address, AddressDTO>();

            // We map from DTO to Entity
            CreateMap<CreateAddressDTO, Address>();

            //will add  other mappings here later (e.g., Orders, MenuItems)
            CreateMap<Order, OrderDTO>()
    .ForMember(dest => dest.OrderDate, opt => opt.MapFrom(src => src.CreatedAt))
    .ForMember(dest => dest.TotalAmount, opt => opt.MapFrom(src => src.TotalPrice))
    .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));
        }
    }
}