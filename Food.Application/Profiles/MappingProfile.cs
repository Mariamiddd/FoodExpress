using AutoMapper;
using Food.Application.DTOs;
using Food.Domain.Models.Entities;
using Food.Domain.Models.Identity;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.Profiles
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            //  map from Entity to DTO
            CreateMap<Address, AddressDTO>();

            //  map from DTO to Entity
            CreateMap<CreateAddressDTO, Address>();

            //user mappungs
            CreateMap<RegisterDTO, ApplicationUser>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.Email));

            //order mappings
            CreateMap<Order, OrderDTO>()
    .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
    .ForMember(dest => dest.TotalPrice, opt => opt.MapFrom(src => src.TotalPrice))
    .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            // created mappings for Restaurant and MenuItem
            CreateMap<CreateRestaurantDTO, Restaurant>();
            CreateMap<CreateMenuItemDTO, MenuItem>();

            //categoru
            CreateMap<CreateCategoryDTO, Category>();
        }


    }
}