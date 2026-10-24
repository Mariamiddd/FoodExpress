using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IMenuRepository Menu { get; }
        IOrderRepository Orders { get; }
        ICartRepository Carts { get; } 
        IAddressRepository Addresses { get; }
        ICartRepository Cart { get; }
        

        Task<int> SaveAsync();
    }
}
