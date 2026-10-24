using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Application.DTOs
{
    public class UpdateOrderStatusRequestDTO
    {
        public OrderState Status { get; set; }
    }
}
