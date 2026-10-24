using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class AddToCartDTO
    {
        public int MenuItemId { get; set; }
        public int Quantity { get; set; }
    }
}
