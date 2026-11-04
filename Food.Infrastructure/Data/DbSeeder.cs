using Food.Domain.Models.Entities;
using Food.Domain.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;
namespace Food.Infrastructure.Data
{
    public static class DbSeeder
    {
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
                // 1. Seed Roles
                string[] roleNames = { "Admin", "Customer" };
                foreach (var roleName in roleNames)
                {
                    if (!await roleManager.RoleExistsAsync(roleName))
                    {
                        await roleManager.CreateAsync(new IdentityRole(roleName));
                    }
                }

                // 2. Seed Bootstrap Admin from Configuration (No hardcoded C# credentials)
                var adminEmail = configuration["SeedSettings:AdminEmail"];
                var adminPassword = configuration["SeedSettings:AdminPassword"];
                var adminUserName = configuration["SeedSettings:AdminUserName"] ?? adminEmail;

                if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
                {
                    var adminUser = await userManager.FindByEmailAsync(adminEmail);
                    if (adminUser == null)
                    {
                        adminUser = new ApplicationUser
                        {
                            UserName = adminUserName,
                            Email = adminEmail,
                            EmailConfirmed = true
                        };

                        var createAdmin = await userManager.CreateAsync(adminUser, adminPassword);
                        if (createAdmin.Succeeded)
                        {
                            await userManager.AddToRoleAsync(adminUser, "Admin");
                            logger.LogInformation("Bootstrap Admin created for {Email}", adminEmail);
                        }
                    }
                    else if (!await userManager.IsInRoleAsync(adminUser, "Admin"))
                    {
                        await userManager.AddToRoleAsync(adminUser, "Admin");
                    }

                    if (adminUser != null && !string.IsNullOrEmpty(adminUser.Id))
                    {
                        await EnsureUserCartAndAddressAsync(dbContext, adminUser.Id, "1 Freedom Square", "Tbilisi");
                    }
                }

                // 3. Seed Demo Data (if enabled in configuration)
                var seedDemoData = configuration.GetValue<bool>("SeedSettings:SeedDemoData", true);
                if (seedDemoData)
                {
                    await SeedDemoCustomersAsync(userManager, dbContext);
                    await SeedRestaurantsAndMenuAsync(dbContext);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while seeding the database.");
            }
        }

        private static async Task EnsureUserCartAndAddressAsync(FoodDbContext dbContext, string userId, string street, string city)
        {
            if (!await dbContext.Carts.AnyAsync(c => c.UserId == userId))
            {
                dbContext.Carts.Add(new Cart { UserId = userId });
            }

            if (!await dbContext.Addresses.AnyAsync(a => a.UserId == userId))
            {
                dbContext.Addresses.Add(new Address
                {
                    UserId = userId,
                    Street = street,
                    City = city
                });
            }

            await dbContext.SaveChangesAsync();
        }

        private static async Task SeedDemoCustomersAsync(UserManager<ApplicationUser> userManager, FoodDbContext dbContext)
        {
            var testCustomers = new[]
            {
                new { Email = "customer@gmail.com", Password = "Customer123!" },
                new { Email = "john@gmail.com", Password = "John123!" },
                new { Email = "jane@gmail.com", Password = "Jane123!" }
            };

            foreach (var testCustomer in testCustomers)
            {
                var existingUser = await userManager.FindByEmailAsync(testCustomer.Email);
                if (existingUser == null)
                {
                    var newCustomer = new ApplicationUser
                    {
                        UserName = testCustomer.Email,
                        Email = testCustomer.Email,
                        EmailConfirmed = true
                    };

                    var result = await userManager.CreateAsync(newCustomer, testCustomer.Password);
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(newCustomer, "Customer");
                        existingUser = newCustomer;
                    }
                }

                if (existingUser != null && !string.IsNullOrEmpty(existingUser.Id))
                {
                    await EnsureUserCartAndAddressAsync(dbContext, existingUser.Id, "123 Rustaveli Avenue", "Tbilisi");
                }
            }
        }

        private static async Task SeedRestaurantsAndMenuAsync(FoodDbContext dbContext)
        {
            var categories = new List<Category>
            {
                new Category { Name = "Burgers" },
                new Category { Name = "Pizza" },
                new Category { Name = "Pasta" },
                new Category { Name = "Salads" },
                new Category { Name = "Desserts" },
                new Category { Name = "Beverages" }
            };

            foreach (var category in categories)
            {
                if (!await dbContext.Categories.AnyAsync(c => c.Name == category.Name))
                {
                    dbContext.Categories.Add(category);
                }
            }
            await dbContext.SaveChangesAsync();

            var restaurants = new List<Restaurant>
            {
                new Restaurant { Name = "Burger Palace", Address = "123 Main Street" },
                new Restaurant { Name = "Pizza Palace", Address = "456 Oak Avenue" },
                new Restaurant { Name = "Pasta House", Address = "789 Elm Street" }
            };

            foreach (var restaurant in restaurants)
            {
                if (!await dbContext.Restaurants.AnyAsync(r => r.Name == restaurant.Name))
                {
                    dbContext.Restaurants.Add(restaurant);
                }
            }
            await dbContext.SaveChangesAsync();

            var burgerPalace = await dbContext.Restaurants.FirstOrDefaultAsync(r => r.Name == "Burger Palace");
            var burgersCategory = await dbContext.Categories.FirstOrDefaultAsync(c => c.Name == "Burgers");
            var drinksCategory = await dbContext.Categories.FirstOrDefaultAsync(c => c.Name == "Beverages");

            if (burgerPalace != null && burgersCategory != null)
            {
                var burgerItems = new List<MenuItem>
                {
                    new MenuItem { RestaurantId = burgerPalace.Id, CategoryId = burgersCategory.Id, Name = "Classic Burger", Price = 8.99m, IsAvailable = true },
                    new MenuItem { RestaurantId = burgerPalace.Id, CategoryId = burgersCategory.Id, Name = "Double Cheeseburger", Price = 10.99m, IsAvailable = true },
                    new MenuItem { RestaurantId = burgerPalace.Id, CategoryId = burgersCategory.Id, Name = "Bacon Burger", Price = 9.99m, IsAvailable = true }
                };

                foreach (var item in burgerItems)
                {
                    if (!await dbContext.MenuItems.AnyAsync(m => m.RestaurantId == item.RestaurantId && m.Name == item.Name))
                    {
                        dbContext.MenuItems.Add(item);
                    }
                }
            }

            if (burgerPalace != null && drinksCategory != null)
            {
                var drinks = new List<MenuItem>
                {
                    new MenuItem { RestaurantId = burgerPalace.Id, CategoryId = drinksCategory.Id, Name = "Soda", Price = 2.99m, IsAvailable = true },
                    new MenuItem { RestaurantId = burgerPalace.Id, CategoryId = drinksCategory.Id, Name = "Iced Tea", Price = 2.49m, IsAvailable = true }
                };

                foreach (var item in drinks)
                {
                    if (!await dbContext.MenuItems.AnyAsync(m => m.RestaurantId == item.RestaurantId && m.Name == item.Name))
                    {
                        dbContext.MenuItems.Add(item);
                    }
                }
            }

            var pizzaPalace = await dbContext.Restaurants.FirstOrDefaultAsync(r => r.Name == "Pizza Palace");
            var pizzaCategory = await dbContext.Categories.FirstOrDefaultAsync(c => c.Name == "Pizza");

            if (pizzaPalace != null && pizzaCategory != null)
            {
                var pizzaItems = new List<MenuItem>
                {
                    new MenuItem { RestaurantId = pizzaPalace.Id, CategoryId = pizzaCategory.Id, Name = "Margherita Pizza", Price = 12.99m, IsAvailable = true },
                    new MenuItem { RestaurantId = pizzaPalace.Id, CategoryId = pizzaCategory.Id, Name = "Pepperoni Pizza", Price = 13.99m, IsAvailable = true },
                    new MenuItem { RestaurantId = pizzaPalace.Id, CategoryId = pizzaCategory.Id, Name = "Vegetarian Pizza", Price = 11.99m, IsAvailable = true }
                };

                foreach (var item in pizzaItems)
                {
                    if (!await dbContext.MenuItems.AnyAsync(m => m.RestaurantId == item.RestaurantId && m.Name == item.Name))
                    {
                        dbContext.MenuItems.Add(item);
                    }
                }
            }

            var pastaHouse = await dbContext.Restaurants.FirstOrDefaultAsync(r => r.Name == "Pasta House");
            var pastaCategory = await dbContext.Categories.FirstOrDefaultAsync(c => c.Name == "Pasta");

            if (pastaHouse != null && pastaCategory != null)
            {
                var pastaItems = new List<MenuItem>
                {
                    new MenuItem { RestaurantId = pastaHouse.Id, CategoryId = pastaCategory.Id, Name = "Spaghetti Carbonara", Price = 11.99m, IsAvailable = true },
                    new MenuItem { RestaurantId = pastaHouse.Id, CategoryId = pastaCategory.Id, Name = "Fettuccine Alfredo", Price = 11.99m, IsAvailable = true },
                    new MenuItem { RestaurantId = pastaHouse.Id, CategoryId = pastaCategory.Id, Name = "Lasagna", Price = 12.99m, IsAvailable = true }
                };

                foreach (var item in pastaItems)
                {
                    if (!await dbContext.MenuItems.AnyAsync(m => m.RestaurantId == item.RestaurantId && m.Name == item.Name))
                    {
                        dbContext.MenuItems.Add(item);
                    }
                }
            }

            await dbContext.SaveChangesAsync();
        }
    }
}