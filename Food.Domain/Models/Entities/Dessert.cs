using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public class Dessert : MenuItem
    {
        public string portionSize { get; set; } // e.g., "Small", "Medium", "Large"
        public override string DisplayDetails()
        {
            return $"Dessert: {Name}, Portion Size: {portionSize}, Price: {Price:C}, Available: {IsAvailable}";
        }

        public override decimal GetFinalPrice()
        {
            return Price;
        }
    }
}
