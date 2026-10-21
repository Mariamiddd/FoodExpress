using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Models.Entities
{
    public enum OrderState
    {
        Created,
        Confirmed,
        Preparing,
        OnTheWay,
        Delivered,
        Cancelled
    }
}
