using AutoMapper;
using Food.Application.DTOs;
using Food.Application.Interfaces;
using Food.Application.Profiles;
using Food.Application.Services.Implementations;
using Food.Application.Services.Interfaces;
using Food.Domain.Interfaces;
using Food.Domain.Models.Identity;
using Food.Domain.Models.Entities;
using Microsoft.AspNetCore.Http.HttpResults;
using Food.Infrastructure.Data;
using Food.Infrastructure.Repositories;
using Food.Web.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Diagnostics.CodeAnalysis;
using System.Text;


namespace Food.Web
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers()
                .AddJsonOptions(options => 
                {
                    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                })
                .ConfigureApiBehaviorOptions(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var errors = context.ModelState
                        .Where(e => e.Value.Errors.Count > 0)
                        .ToDictionary(
                            e => e.Key,
                            e => e.Value.Errors.Select(er => er.ErrorMessage).ToArray()
                        );


                    var response = new
                    {
                        Success = false,
                        Message = "Validation error(s)",
                        Errors = errors
                    };
                    return new BadRequestObjectResult(response);
                };
            });

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
            builder.Services.AddScoped<ICartService, CartService>();
            builder.Services.AddScoped<IMenuService, MenuService>();
            builder.Services.AddScoped<IRestaurantService, RestaurantService>();
            builder.Services.AddScoped<IRestaurantRepository, RestaurantRepository>();



            // Add Swagger with JWT Support
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "FoodExpress API",
                    Version = "v1"
                });

             var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
             var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
             options.IncludeXmlComments(xmlPath);


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



            // add identity with roles
            builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
                .AddEntityFrameworkStores<FoodDbContext>()
                .AddDefaultTokenProviders();

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

            // Add CORS policy to allow open frontend access
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policyBuilder =>
                    policyBuilder.AllowAnyOrigin()
                                 .AllowAnyHeader()
                                 .AllowAnyMethod()
                );
            });

            var app = builder.Build();

            // Use Exception Handler Middleware
            app.UseMiddleware<ExceptionHandlerMiddleware>();

            // Seed roles and admin user
            using (var scope = app.Services.CreateScope())
            {
                var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
                var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();

                await SeedRolesAndAdminAsync(roleManager, userManager, dbContext);
            }

            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
            }

            app.UseDefaultFiles();
            app.UseStaticFiles();

            // middleware configuration
            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseHttpsRedirection();
            // Use CORS policy 
            app.UseCors("AllowAll");

            // authorization and authentication middlwares
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
        // seed roles and admin user
        private static async Task SeedRolesAndAdminAsync(RoleManager<IdentityRole> roleManager, UserManager<ApplicationUser> userManager, FoodDbContext dbContext)
        {
            try
            {
                // Create Roles
                string[] roleNames = { "Admin", "Customer" };
                foreach (var roleName in roleNames)
                {
                    try
                    {
                        if (!await roleManager.RoleExistsAsync(roleName))
                        {
                            await roleManager.CreateAsync(new IdentityRole(roleName));
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error creating role {roleName}: {ex.Message}");
                    }
                }

                // creating default admin user
                string adminEmail = "admin@gmail.com";
                ApplicationUser adminUser = null;

                try
                {
                    adminUser = await userManager.FindByEmailAsync(adminEmail);
                }
                catch (System.Data.SqlTypes.SqlNullValueException ex)
                {
                    Console.WriteLine($"Database contains corrupted user records with NULL values. Attempting to handle gracefully. Error: {ex.Message}");
                    adminUser = null;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error finding admin user: {ex.Message}");
                    adminUser = null;
                }

                if (adminUser == null)
                {
                    try
                    {
                        adminUser = new ApplicationUser 
                        { 
                            UserName = adminEmail, 
                            Email = adminEmail,
                            EmailConfirmed = true,
                            PhoneNumberConfirmed = false
                        };
                        var createPowerUser = await userManager.CreateAsync(adminUser, "Admin123!");
                        if (createPowerUser.Succeeded)
                        {
                            await userManager.AddToRoleAsync(adminUser, "Admin");
                        }
                        else
                        {
                            Console.WriteLine($"Failed to create admin user: {string.Join(", ", createPowerUser.Errors.Select(e => e.Description))}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error creating admin user: {ex.Message}");
                    }
                }

                // Seed test customer users for testing
                var testCustomers = new[]
                {
                    new { Email = "customer@gmail.com", Password = "Customer123!" },
                    new { Email = "john@gmail.com", Password = "John123!" },
                    new { Email = "jane@gmail.com", Password = "Jane123!" }
                };

                foreach (var testCustomer in testCustomers)
                {
                    ApplicationUser existingUser = null;

                    try
                    {
                        existingUser = await userManager.FindByEmailAsync(testCustomer.Email);
                    }
                    catch (System.Data.SqlTypes.SqlNullValueException ex)
                    {
                        Console.WriteLine($"Database contains corrupted user record for {testCustomer.Email}. Creating new record. Error: {ex.Message}");
                        existingUser = null;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error finding user {testCustomer.Email}: {ex.Message}");
                        existingUser = null;
                    }

                    if (existingUser == null)
                    {
                        try
                        {
                            var newCustomer = new ApplicationUser 
                            { 
                                UserName = testCustomer.Email, 
                                Email = testCustomer.Email,
                                EmailConfirmed = true,
                                PhoneNumberConfirmed = false
                            };
                            var createCustomerResult = await userManager.CreateAsync(newCustomer, testCustomer.Password);
                            if (createCustomerResult.Succeeded)
                            {
                                await userManager.AddToRoleAsync(newCustomer, "Customer");

                                // Create a cart for the new customer
                                var cart = new Cart { UserId = newCustomer.Id };
                                dbContext.Carts.Add(cart);
                                await dbContext.SaveChangesAsync();

                                // Create default address for the customer
                                var address = new Address
                                {
                                    UserId = newCustomer.Id,
                                    Street = "123 Main Street",
                                    City = "Sample City"
                                };
                                dbContext.Addresses.Add(address);
                                await dbContext.SaveChangesAsync();
                            }
                            else
                            {
                                Console.WriteLine($"Failed to create customer {testCustomer.Email}: {string.Join(", ", createCustomerResult.Errors.Select(e => e.Description))}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error creating customer {testCustomer.Email}: {ex.Message}");
                        }
                    }
                }

                // Seed restaurants, categories, and menu items
                await SeedRestaurantsAndMenuAsync(dbContext);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fatal error in SeedRolesAndAdminAsync: {ex.Message}");
                throw;
            }
        }

        private static async Task SeedRestaurantsAndMenuAsync(FoodDbContext dbContext)
        {
            try
            {
                // Seed categories
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
                    if (!dbContext.Categories.Any(c => c.Name == category.Name))
                    {
                        dbContext.Categories.Add(category);
                    }
                }
                await dbContext.SaveChangesAsync();

                // Seed restaurants
                var restaurants = new List<Restaurant>
                {
                    new Restaurant { Name = "Burger Palace", Address = "123 Main Street" },
                    new Restaurant { Name = "Pizza Palace", Address = "456 Oak Avenue" },
                    new Restaurant { Name = "Pasta House", Address = "789 Elm Street" }
                };

                foreach (var restaurant in restaurants)
                {
                    if (!dbContext.Restaurants.Any(r => r.Name == restaurant.Name))
                    {
                        dbContext.Restaurants.Add(restaurant);
                    }
                }
                await dbContext.SaveChangesAsync();

                // Seed menu items for Burger Palace
                var burgerPalace = dbContext.Restaurants.FirstOrDefault(r => r.Name == "Burger Palace");
                var burgersCategory = dbContext.Categories.FirstOrDefault(c => c.Name == "Burgers");
                var drinksCategory = dbContext.Categories.FirstOrDefault(c => c.Name == "Beverages");

                if (burgerPalace != null && burgersCategory != null)
                {
                    var burgerPaletteItems = new List<MenuItem>
                    {
                        new MenuItem { RestaurantId = burgerPalace.Id, CategoryId = burgersCategory.Id, Name = "Classic Burger", Price = 8.99m, IsAvailable = true },
                        new MenuItem { RestaurantId = burgerPalace.Id, CategoryId = burgersCategory.Id, Name = "Double Cheeseburger", Price = 10.99m, IsAvailable = true },
                        new MenuItem { RestaurantId = burgerPalace.Id, CategoryId = burgersCategory.Id, Name = "Bacon Burger", Price = 9.99m, IsAvailable = true }
                    };

                    foreach (var item in burgerPaletteItems)
                    {
                        if (!dbContext.MenuItems.Any(m => m.RestaurantId == item.RestaurantId && m.Name == item.Name))
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
                        if (!dbContext.MenuItems.Any(m => m.RestaurantId == item.RestaurantId && m.Name == item.Name))
                        {
                            dbContext.MenuItems.Add(item);
                        }
                    }
                }

                // Seed menu items for Pizza Palace
                var pizzaPalace = dbContext.Restaurants.FirstOrDefault(r => r.Name == "Pizza Palace");
                var pizzaCategory = dbContext.Categories.FirstOrDefault(c => c.Name == "Pizza");

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
                        if (!dbContext.MenuItems.Any(m => m.RestaurantId == item.RestaurantId && m.Name == item.Name))
                        {
                            dbContext.MenuItems.Add(item);
                        }
                    }
                }

                // Seed menu items for Pasta House
                var pastaHouse = dbContext.Restaurants.FirstOrDefault(r => r.Name == "Pasta House");
                var pastaCategory = dbContext.Categories.FirstOrDefault(c => c.Name == "Pasta");

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
                        if (!dbContext.MenuItems.Any(m => m.RestaurantId == item.RestaurantId && m.Name == item.Name))
                        {
                            dbContext.MenuItems.Add(item);
                        }
                    }
                }

                await dbContext.SaveChangesAsync();
                Console.WriteLine("Restaurants, categories, and menu items seeded successfully.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error seeding restaurants and menu items: {ex.Message}");
            }
        }
    }
}