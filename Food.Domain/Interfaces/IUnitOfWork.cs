using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IMenuRepository Menu { get; }
        IOrderRepository Orders { get; }
        ICartRepository Carts { get; } // დამატებული ხაზი
        IAddressRepository Addresses { get; } // Add this line
        // აქ დაემატება სხვა რეპოზიტორებიც (მაგ. CartRepository), როცა დაგჭირდება

        Task<int> SaveAsync();
    }
}
