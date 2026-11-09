using AutoMapper;
using Food.Application.DTOs;
using Food.Domain.Models.Entities;
using Food.Domain.Models.Identity;

namespace Food.Application.Profiles
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // Address mappings
            CreateMap<Address, AddressDTO>();
            CreateMap<CreateAddressDTO, Address>();

            // User mappings
            CreateMap<RegisterDTO, ApplicationUser>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.UserName))
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email));

            // Order mappings
            CreateMap<Order, OrderDTO>()
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
                .ForMember(dest => dest.TotalPrice, opt => opt.MapFrom(src => src.TotalPrice))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User != null ? (src.User.UserName ?? string.Empty) : string.Empty))
                .ForMember(dest => dest.UserEmail, opt => opt.MapFrom(src => src.User != null ? (src.User.Email ?? string.Empty) : string.Empty))
                .ForMember(dest => dest.RestaurantName, opt => opt.MapFrom(src => src.Restaurant != null ? src.Restaurant.Name : string.Empty))
                .ForMember(dest => dest.DeliveryAddress, opt => opt.MapFrom(src => src.Address != null ? $"{src.Address.City}, {src.Address.Street}" : string.Empty))
                .ForMember(dest => dest.OrderItems, opt => opt.MapFrom(src => src.OrderItems));

            CreateMap<OrderItem, OrderItemDTO>()
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.Name) ? src.Name : (src.MenuItem != null ? src.MenuItem.Name : string.Empty)));

            // Restaurant, Category & MenuItem mappings
            CreateMap<CreateRestaurantDTO, Restaurant>();
            CreateMap<CreateMenuItemDTO, MenuItem>();
            CreateMap<CreateCategoryDTO, Category>();

            CreateMap<MenuItem, MenuItemDTO>()
                .ForMember(dest => dest.RestaurantName, opt => opt.MapFrom(src => src.Restaurant != null ? src.Restaurant.Name : string.Empty))
                .ForMember(dest => dest.RestaurantIsActive, opt => opt.MapFrom(src => src.Restaurant == null || src.Restaurant.IsActive))
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : string.Empty));

            CreateMap<Restaurant, RestaurantDTO>()
                .ForMember(dest => dest.MenuItems, opt => opt.MapFrom(src => src.MenuItems));
        }
    }
}