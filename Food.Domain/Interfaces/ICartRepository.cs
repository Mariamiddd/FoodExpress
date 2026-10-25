using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Interfaces
{

        public interface ICartRepository
        {
            Task<Cart> GetCartByUserIdAsync(int userId); 
            void ClearCart(Cart cart);
        }
    }