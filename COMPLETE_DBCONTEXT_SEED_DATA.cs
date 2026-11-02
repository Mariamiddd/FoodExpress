// ====================================================
// COMPLETE SEED DATA FOR FoodDbContext.cs
// Replace the seed section with this code
// ====================================================

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
    // Pizza Palace (Restaurant ID 1)
    new MenuItem { Id = 1, RestaurantId = 1, CategoryId = 1, Name = "Garlic Bread", Description = "Fresh garlic bread with herbs", Price = 5.99m, IsAvailable = true },
    new MenuItem { Id = 2, RestaurantId = 1, CategoryId = 2, Name = "Margherita Pizza", Description = "Classic pizza with tomato, mozzarella, and basil", Price = 12.99m, IsAvailable = true },
    new MenuItem { Id = 3, RestaurantId = 1, CategoryId = 2, Name = "Carbonara Pizza", Description = "Creamy carbonara pizza with bacon and cheese", Price = 13.99m, IsAvailable = true },

    // Burger Heaven (Restaurant ID 2)
    new MenuItem { Id = 4, RestaurantId = 2, CategoryId = 1, Name = "Regular Burger", Description = "Classic burger with lettuce, tomato, and onion", Price = 8.99m, IsAvailable = true },
    new MenuItem { Id = 5, RestaurantId = 2, CategoryId = 2, Name = "Double Cheese Burger", Description = "Double patty with double cheese", Price = 10.99m, IsAvailable = true },
    new MenuItem { Id = 6, RestaurantId = 2, CategoryId = 4, Name = "Fries", Description = "Golden crispy fries", Price = 3.99m, IsAvailable = true },

    // Sushi Paradise (Restaurant ID 3)
    new MenuItem { Id = 7, RestaurantId = 3, CategoryId = 3, Name = "California Roll", Description = "Crab, avocado, and cucumber roll", Price = 11.99m, IsAvailable = true },
    new MenuItem { Id = 8, RestaurantId = 3, CategoryId = 2, Name = "Spicy Tuna Roll", Description = "Spicy tuna with sriracha mayo", Price = 13.99m, IsAvailable = true },
    new MenuItem { Id = 9, RestaurantId = 3, CategoryId = 4, Name = "Tempura Shrimp", Description = "Crispy fried shrimp tempura", Price = 14.99m, IsAvailable = true }
);

// Seed Admin Role (Optional - for admin functionality)
// If you want admin features, also add these (requires additional code):
/*
var adminRole = new IdentityRole 
{ 
    Id = "admin-role-id", 
    Name = "Admin", 
    NormalizedName = "ADMIN" 
};
modelBuilder.Entity<IdentityRole>().HasData(adminRole);
*/

// ====================================================
// HOW TO USE THIS
// ====================================================
// 1. Open: Food.Infrastucture/Data/FoodDbContext.cs
// 2. Find: The OnModelCreating() method
// 3. Find: The seed data section (looks like: modelBuilder.Entity<Category>().HasData(...))
// 4. Replace: Everything from "Seed Categories" to the end of Menu Items
// 5. With: The code above (copy all the Entity().HasData() calls)
// 6. Save the file
// 7. Run: Add-Migration UpdateWithCompleteMenuData
// 8. Run: Update-Database
// 9. Rebuild Solution
// 10. Test in browser

// ====================================================
// What This Provides
// ====================================================
// 
// RESTAURANTS:
//   1. Pizza Palace (3 menu items)
//   2. Burger Heaven (3 menu items)  
//   3. Sushi Paradise (3 menu items)
//
// TOTAL: 3 restaurants with 9 menu items
//
// ====================================================
