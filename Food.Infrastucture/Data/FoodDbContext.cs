using Microsoft.EntityFrameworkCore;
using Food.Domain.Models.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Food.Domain.Models.Identity;  
namespace Food.Infrastructure.Data
{
    public class FoodDbContext : IdentityDbContext<ApplicationUser>
    {
        public FoodDbContext(DbContextOptions<FoodDbContext> options) : base(options)
        {
        }

        public DbSet<Address> Addresses { get; set; }
        public DbSet<Restaurant> Restaurants { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<MenuItem> MenuItems { get; set; }
        public DbSet<Cart> Carts { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure decimal precision for financial values
            modelBuilder.Entity<MenuItem>()
                .Property(m => m.Price)
                .HasColumnType("decimal(18,2)");

            // configure decimal precision for TotalPrice in Cart and Order, and UnitPrice in CartItem and OrderItem
            modelBuilder.Entity<Cart>()
                .Property(c => c.TotalPrice)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<CartItem>()
                .Property(ci => ci.UnitPrice)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Order>()
                .Property(o => o.TotalPrice)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<OrderItem>()
                .Property(oi => oi.PriceAtTimeOfOrder)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<OrderItem>()
               .Property(oi => oi.UnitPrice)
               .HasColumnType("decimal(18,2)");

            // Add unique indexes on Email and UserName
            modelBuilder.Entity<ApplicationUser>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<ApplicationUser>()
                .HasIndex(u => u.UserName)
                .IsUnique();

            // Add indexes on frequently queried foreign keys
            modelBuilder.Entity<Order>()
                .HasIndex(o => o.UserId);

            modelBuilder.Entity<Order>()
                .HasIndex(o => o.RestaurantId);

            modelBuilder.Entity<CartItem>()
                .HasIndex(ci => ci.CartId);

            modelBuilder.Entity<CartItem>()
                .HasIndex(ci => ci.MenuItemId);

            modelBuilder.Entity<MenuItem>()
                .HasIndex(m => m.RestaurantId);

            modelBuilder.Entity<MenuItem>()
                .HasIndex(m => m.CategoryId);

            modelBuilder.Entity<Address>()
                .HasIndex(a => a.UserId);

            modelBuilder.Entity<Cart>()
                .HasIndex(c => c.UserId);

            // configure relationships between entities
            modelBuilder.Entity<Address>()
                .HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Cart>()
                .HasOne(c => c.User)
                .WithOne(u => u.Cart)
                .HasForeignKey<Cart>(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CartItem>()
                .HasOne(ci => ci.Cart)
                .WithMany(c => c.CartItems)
                .HasForeignKey(ci => ci.CartId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CartItem>()
                .HasOne(ci => ci.MenuItem)
                .WithMany()
                .HasForeignKey(ci => ci.MenuItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MenuItem>()
                .HasOne(m => m.Category)
                .WithMany(c => c.MenuItems)
                .HasForeignKey(m => m.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MenuItem>()
                .HasOne(m => m.Restaurant)
                .WithMany(r => r.MenuItems)
                .HasForeignKey(m => m.RestaurantId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Address)
                .WithMany()
                .HasForeignKey(o => o.AddressId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Restaurant)
                .WithMany(r => r.Orders)
                .HasForeignKey(o => o.RestaurantId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.User)
                .WithMany(u => u.Orders) 
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.MenuItem)
                .WithMany()
                .HasForeignKey(oi => oi.MenuItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            // Seed Categories
            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, Name = "Appetizers" },
                new Category { Id = 2, Name = "Main Courses" },
                new Category { Id = 3, Name = "Desserts" },
                new Category { Id = 4, Name = "Beverages" },
                new Category { Id = 5, Name = "Salads" }
            );

            // Seed Restaurants
            modelBuilder.Entity<Restaurant>().HasData(
                new Restaurant { Id = 1, Name = "Pizza Palace", Address = "123 Main St", ImagePath = null },
                new Restaurant { Id = 2, Name = "Burger Heaven", Address = "456 Oak Ave", ImagePath = null },
                new Restaurant { Id = 3, Name = "Sushi Paradise", Address = "789 River Rd", ImagePath = null }
            );

            // Seed Menu Items
            modelBuilder.Entity<MenuItem>().HasData(
                // Pizza Palace
                new MenuItem { Id = 1, RestaurantId = 1, CategoryId = 1, Name = "Garlic Bread", Price = 5.99m, IsAvailable = true },
                new MenuItem { Id = 2, RestaurantId = 1, CategoryId = 2, Name = "Margherita Pizza", Price = 12.99m, IsAvailable = true },
                new MenuItem { Id = 3, RestaurantId = 1, CategoryId = 2, Name = "Pepperoni Pizza", Price = 14.99m, IsAvailable = true },
                new MenuItem { Id = 4, RestaurantId = 1, CategoryId = 3, Name = "Tiramisu", Price = 6.99m, IsAvailable = true },

                // Burger Heaven
                new MenuItem { Id = 5, RestaurantId = 2, CategoryId = 1, Name = "French Fries", Price = 4.99m, IsAvailable = true },
                new MenuItem { Id = 6, RestaurantId = 2, CategoryId = 2, Name = "Classic Burger", Price = 10.99m, IsAvailable = true },
                new MenuItem { Id = 7, RestaurantId = 2, CategoryId = 2, Name = "Double Cheeseburger", Price = 13.99m, IsAvailable = true },
                new MenuItem { Id = 8, RestaurantId = 2, CategoryId = 4, Name = "Coca Cola", Price = 2.99m, IsAvailable = true },

                // Sushi Paradise
                new MenuItem { Id = 9, RestaurantId = 3, CategoryId = 1, Name = "Edamame", Price = 6.99m, IsAvailable = true },
                new MenuItem { Id = 10, RestaurantId = 3, CategoryId = 2, Name = "California Roll", Price = 11.99m, IsAvailable = true },
                new MenuItem { Id = 11, RestaurantId = 3, CategoryId = 2, Name = "Spicy Tuna Roll", Price = 13.99m, IsAvailable = true },
                new MenuItem { Id = 12, RestaurantId = 3, CategoryId = 5, Name = "Seaweed Salad", Price = 8.99m, IsAvailable = true }
            );
        }
    }
}