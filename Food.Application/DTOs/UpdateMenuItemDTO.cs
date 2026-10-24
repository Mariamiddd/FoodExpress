using System;

namespace Food.Application.DTOs
{
    public class UpdateMenuItemDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; }
        public int CategoryId { get; set; }
    }
}
