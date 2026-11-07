using System;
using System.Collections.Generic;

namespace Food.Application.DTOs
{
    public class RestaurantDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string ImagePath { get; set; }
        public bool IsActive { get; set; } = true;
        public List<MenuItemDTO> MenuItems { get; set; }
    }
}
