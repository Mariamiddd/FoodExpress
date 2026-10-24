using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs

{
    public class CreateMenuItemDTO
    {
        public string Name { get; set; }
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; }
        public int RestaurantId { get; set; }
        public int CategoryId { get; set; }
    }
}