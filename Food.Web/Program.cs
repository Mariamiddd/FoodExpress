
using Food.Application.Interfaces;
using Food.Application.Services;
using Food.Domain.Interfaces;
using Food.Infrastructure.Data;
using Food.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Food.Application.Profiles;
using AutoMapper;
using Food.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;


namespace Food.Web
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddOpenApi();


            //add context 
            builder.Services.AddDbContext<FoodDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Add repository
            builder.Services.AddScoped<IOrderRepository, OrderRepository>();

            // Add repository 
            builder.Services.AddScoped<IMenuRepository, MenuRepository>();

            // Add service
            builder.Services.AddScoped<IOrderService, OrderService>();

            //add unir of work
            builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

            //add cart repository
            builder.Services.AddScoped<ICartRepository, CartRepository>();

            builder.Services.AddScoped<IAddressRepository, AddressRepository>();
            builder.Services.AddScoped<IAddressService, AddressService>();


            // add swagger
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();


            // Register AutoMapper
            builder.Services.AddAutoMapper(cfg => { },
                typeof(Program).Assembly,
                typeof(OrderService).Assembly);

            // add identity
            builder.Services.AddIdentityCore<ApplicationUser>()
                .AddEntityFrameworkStores<FoodDbContext>();

            var app = builder.Build();


            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
               
            }

            //add for swagger
                app.UseSwagger();
                app.UseSwaggerUI();

            ///
            app.UseHttpsRedirection();

            app.UseAuthorization();


            app.MapControllers();

            app.Run();
        }
    }
}
