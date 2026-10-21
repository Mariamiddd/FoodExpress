using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public class Drink : MenuItem
    {
        public string VolumeInMl { get; set; }
        public override string DisplayDetails()
        {
            return $"Drink: {Name}, VolumeInMl: {VolumeInMl}, Price: {Price:C}, Available: {IsAvailable}";
        }

        public override decimal GetFinalPrice()
        {
            return Price;
        }
    }
}
