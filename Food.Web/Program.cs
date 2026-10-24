using AutoMapper;
using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Application.Profiles;
using Food.Application.Services.Implementations;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using Food.Infrastructure.Data;
using Food.Infrastructure.Identity;
using Food.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Diagnostics.CodeAnalysis;
using System.Text;


namespace Food.Web
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();
            builder.Services.AddOpenApi();

            // Add context 
            builder.Services.AddDbContext<FoodDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Add repositories
            builder.Services.AddScoped<IOrderRepository, OrderRepository>();
            builder.Services.AddScoped<IMenuRepository, MenuRepository>();
            builder.Services.AddScoped<ICartRepository, CartRepository>();
            builder.Services.AddScoped<IAddressRepository, AddressRepository>();
            builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

            // Add services
            builder.Services.AddScoped<IOrderService, OrderService>();
            builder.Services.AddScoped<IAddressService, AddressService>();
            builder.Services.AddScoped<IUsersService, UsersService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IAdminService, AdminService>();


            // Add Swagger with JWT Support
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "FoodExpress API",
                    Version = "v1"
                });

                options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    In = ParameterLocation.Header,
                    Description = "Please enter a valid token",
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    BearerFormat = "JWT",
                    Scheme = "Bearer"
                });

                options.AddSecurityRequirement(document =>

                   new OpenApiSecurityRequirement
                   {
                       [new OpenApiSecuritySchemeReference(
                             "Bearer",
                             document)] = []
                   });

            });


            // Register AutoMapper
            builder.Services.AddAutoMapper(cfg => { },
                 typeof(Program).Assembly,
                    typeof(OrderService).Assembly);



            // Add identity
            builder.Services.AddIdentityCore<ApplicationUser>()
                .AddEntityFrameworkStores<FoodDbContext>();

            // Add JWT Authentication
            var jwtKey = builder.Configuration["Jwt:Key"];
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            }).AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };
            });

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
            }

            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseHttpsRedirection();

            // authorization and authentication middlwares
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}