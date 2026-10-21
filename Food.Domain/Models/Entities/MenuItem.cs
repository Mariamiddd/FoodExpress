using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public abstract class MenuItem
    {
        public int Id { get; set; }
        public int RestaurantId { get; set; }
        public int CategoryId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Details { get; set; }
        public decimal Price { get; set; }
        public bool IsAvailable { get; set; }

        public Restaurant Restaurant { get; set; }
        public Category Category { get; set; }

        public abstract decimal GetFinalPrice();
        public abstract string DisplayDetails();

    }



}
