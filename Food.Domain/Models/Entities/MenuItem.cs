using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{

    public class MenuItem
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; }

        // foreign keys so that we can navigate to the related entities
        public int RestaurantId { get; set; }
        public Restaurant Restaurant { get; set; }

        public int CategoryId { get; set; }
        public Category Category { get; set; }
    }
}