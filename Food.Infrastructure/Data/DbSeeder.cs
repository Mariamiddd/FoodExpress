using Food.Domain.Models.Entities;
using Food.Domain.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Food.Infrastructure.Data
{
    public static class DbSeeder
    {
        private static readonly string[] Roles = ["Admin", "Customer"];

        public static async Task SeedAsync(IServiceProvider serviceProvider, IConfiguration configuration)
        {
            using var scope = serviceProvider.CreateScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();
            var loggerFactory = scope.ServiceProvider.GetRequiredService<ILoggerFactory>();
            var logger = loggerFactory.CreateLogger("DbSeeder");

            try
            {
                await dbContext.Database.MigrateAsync();

                // 1. Seed Roles
                await SeedRolesAsync(roleManager);

                // 2. Seed Bootstrap Admin strictly from configuration
                await SeedBootstrapAdminAsync(userManager, dbContext, configuration, logger);

                // 3. Seed Demo Data (only when enabled in configuration)
                var seedDemoSetting = configuration["SeedSettings:SeedDemoData"];
                var seedDemoData = string.IsNullOrWhiteSpace(seedDemoSetting) ||
                                   !bool.TryParse(seedDemoSetting, out var parsed) ||
                                   parsed;

                if (seedDemoData)
                {
                    await SeedRestaurantsAndMenuAsync(dbContext);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while seeding the database.");
            }
        }

        private static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
        {
            foreach (var roleName in Roles)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                }
            }
        }

        private static async Task SeedBootstrapAdminAsync(
            UserManager<ApplicationUser> userManager,
            FoodDbContext dbContext,
            IConfiguration configuration,
            ILogger logger)
        {
            var adminEmail = configuration["SeedSettings:AdminEmail"];
            var adminPassword = configuration["SeedSettings:AdminPassword"];
            var adminUserName = configuration["SeedSettings:AdminUserName"] ?? adminEmail;

            if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
            {
                logger.LogWarning("Bootstrap Admin seeding skipped: 'SeedSettings:AdminEmail' or 'SeedSettings:AdminPassword' is missing in configuration.");
                return;
            }

            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    UserName = adminUserName,
                    Email = adminEmail,
                    EmailConfirmed = true
                };

                var createResult = await userManager.CreateAsync(adminUser, adminPassword);
                if (!createResult.Succeeded)
                {
                    logger.LogError("Failed to create Bootstrap Admin for {Email}. Check password complexity settings.", adminEmail);
                    return;
                }

                await userManager.AddToRoleAsync(adminUser, "Admin");
                logger.LogInformation("Bootstrap Admin created for {Email}", adminEmail);
            }
            else if (!await userManager.IsInRoleAsync(adminUser, "Admin"))
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }

            if (!string.IsNullOrEmpty(adminUser.Id))
            {
                await EnsureUserCartAsync(dbContext, adminUser.Id);
            }
        }

        private static async Task EnsureUserCartAsync(FoodDbContext dbContext, string userId)
        {
            if (!await dbContext.Carts.AnyAsync(c => c.UserId == userId))
            {
                dbContext.Carts.Add(new Cart { UserId = userId });
                await dbContext.SaveChangesAsync();
            }
        }

        private static async Task SeedRestaurantsAndMenuAsync(FoodDbContext dbContext)
        {
            if (await dbContext.Restaurants.AnyAsync())
            {
                return;
            }

            var burgersCat = new Category { Name = "Burgers" };
            var pizzaCat = new Category { Name = "Pizza" };
            var pastaCat = new Category { Name = "Pasta" };
            var saladsCat = new Category { Name = "Salads" };
            var dessertsCat = new Category { Name = "Desserts" };
            var drinksCat = new Category { Name = "Beverages" };

            dbContext.Categories.AddRange(burgersCat, pizzaCat, pastaCat, saladsCat, dessertsCat, drinksCat);
            await dbContext.SaveChangesAsync();

            var burgerPalace = new Restaurant { Name = "Burger Palace", Address = "123 Main Street" };
            var pizzaPalace = new Restaurant { Name = "Pizza Palace", Address = "456 Oak Avenue" };
            var pastaHouse = new Restaurant { Name = "Pasta House", Address = "789 Elm Street" };

            dbContext.Restaurants.AddRange(burgerPalace, pizzaPalace, pastaHouse);
            await dbContext.SaveChangesAsync();

            var menuItems = new List<MenuItem>
            {
                new() { RestaurantId = burgerPalace.Id, CategoryId = burgersCat.Id, Name = "Classic Burger", Price = 8.99m, IsAvailable = true },
                new() { RestaurantId = burgerPalace.Id, CategoryId = burgersCat.Id, Name = "Double Cheeseburger", Price = 10.99m, IsAvailable = true },
                new() { RestaurantId = burgerPalace.Id, CategoryId = burgersCat.Id, Name = "Bacon Burger", Price = 9.99m, IsAvailable = true },
                new() { RestaurantId = burgerPalace.Id, CategoryId = drinksCat.Id, Name = "Soda", Price = 2.99m, IsAvailable = true },
                new() { RestaurantId = burgerPalace.Id, CategoryId = drinksCat.Id, Name = "Iced Tea", Price = 2.49m, IsAvailable = true },

                new() { RestaurantId = pizzaPalace.Id, CategoryId = pizzaCat.Id, Name = "Margherita Pizza", Price = 12.99m, IsAvailable = true },
                new() { RestaurantId = pizzaPalace.Id, CategoryId = pizzaCat.Id, Name = "Pepperoni Pizza", Price = 13.99m, IsAvailable = true },
                new() { RestaurantId = pizzaPalace.Id, CategoryId = pizzaCat.Id, Name = "Vegetarian Pizza", Price = 11.99m, IsAvailable = true },
                new() { RestaurantId = pizzaPalace.Id, CategoryId = dessertsCat.Id, Name = "Tiramisu", Price = 6.99m, IsAvailable = true },

                new() { RestaurantId = pastaHouse.Id, CategoryId = pastaCat.Id, Name = "Spaghetti Carbonara", Price = 11.99m, IsAvailable = true },
                new() { RestaurantId = pastaHouse.Id, CategoryId = pastaCat.Id, Name = "Fettuccine Alfredo", Price = 11.99m, IsAvailable = true },
                new() { RestaurantId = pastaHouse.Id, CategoryId = pastaCat.Id, Name = "Lasagna", Price = 12.99m, IsAvailable = true },
                new() { RestaurantId = pastaHouse.Id, CategoryId = saladsCat.Id, Name = "Caesar Salad", Price = 7.99m, IsAvailable = true }
            };

            dbContext.MenuItems.AddRange(menuItems);
            await dbContext.SaveChangesAsync();
        }
    }
}