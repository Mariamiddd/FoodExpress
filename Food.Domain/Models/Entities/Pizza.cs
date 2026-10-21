using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public class Pizza : MenuItem
    {
        public string Size { get; set; }

        public override string DisplayDetails()
        {
            return $"Pizza: {Name}, Size: {Size}, Price: {Price:C}, Available: {IsAvailable}";
        }

        public override decimal GetFinalPrice()
        {
            return Price; // change later if needed for size-based pricing
        }
    }
}
