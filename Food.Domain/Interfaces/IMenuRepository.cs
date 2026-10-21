using Food.Domain.Models.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Food.Domain.Interfaces
{
    public interface IMenuRepository
    {
        Task<MenuItem> GetByIdAsync(int id);
        Task<IEnumerable<MenuItem>> GetAllAsync();
        Task AddAsync(MenuItem menuItem);
        Task UpdateAsync(MenuItem menuItem);
        Task DeleteAsync(int id);
    }
}
