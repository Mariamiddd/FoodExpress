using System.Threading.Tasks;

namespace Food.Application.Services.Interfaces
{
    public interface IAdminService
    {
        Task<bool> PromoteUserToAdminAsync(string email);
    }
}