using System;

namespace Food.Application.DTOs
{
    public class MenuItemDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; }
        public int RestaurantId { get; set; }
        public string RestaurantName { get; set; }
        public int CategoryId { get; set; }
        public string CategoryName { get; set; }
    }
}
