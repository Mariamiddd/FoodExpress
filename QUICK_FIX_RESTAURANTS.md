# QUICK FIX - Run This Now

You have **2 options** to fix the missing restaurants:

## 🟢 OPTION 1: Automatic Fix (Recommended - 2 minutes)

### Step 1: Update FoodDbContext.cs with Complete Seed Data

The seed data in your DbContext is incomplete (only 1 menu item). You need to add the rest.

Replace your `Food.Infrastucture/Data/FoodDbContext.cs` seed section with the complete version provided in file: `COMPLETE_DBCONTEXT_SEED_DATA.cs`

### Step 2: Run Migrations

Open **Package Manager Console** and run:

```powershell
Add-Migration AddCompleteMenuData
Update-Database
```

### Step 3: Rebuild & Test

```
Build > Rebuild Solution
```

Clear cache (F12 → Ctrl+Shift+Delete) and refresh browser.

---

## 🔵 OPTION 2: Manual SQL Fix (For Database-Only)

If you prefer to add data directly to the database without code changes:

Run this SQL in your database directly:

```sql
-- Restaurants already exist, just need more menu items

-- Pizza Palace - Restaurant ID 1
INSERT INTO MenuItems (RestaurantId, CategoryId, Name, Price, IsAvailable) VALUES
(1, 1, 'Garlic Bread', 5.99, 1),
(1, 2, 'Margherita Pizza', 12.99, 1),
(1, 2, 'Carbonara Pizza', 13.99, 1);

-- Burger Heaven - Restaurant ID 2
INSERT INTO MenuItems (RestaurantId, CategoryId, Name, Price, IsAvailable) VALUES
(2, 1, 'Regular Burger', 8.99, 1),
(2, 2, 'Double Cheese Burger', 10.99, 1),
(2, 4, 'Fries', 3.99, 1);

-- Sushi Paradise - Restaurant ID 3
INSERT INTO MenuItems (RestaurantId, CategoryId, Name, Price, IsAvailable) VALUES
(3, 3, 'California Roll', 11.99, 1),
(3, 2, 'Spicy Tuna Roll', 13.99, 1),
(3, 4, 'Tempura Shrimp', 14.99, 1);
```

Then rebuild and refresh browser.

---

## 🟡 OPTION 3: Complete Reset (If Data Got Corrupted)

If the database is messed up, reset it completely:

```powershell
# Open Package Manager Console and run:
Update-Database -Migration 0
Drop-Database
Update-Database
```

This will:
- ✅ Drop current database
- ✅ Recreate from scratch
- ✅ Seed all restaurant data fresh
- ✅ Add all menu items

---

## After Fixing: Quick Verification

Go to `https://localhost:7280` and verify:
- ✅ See 3 restaurants on screen
- ✅ Click restaurant to see menu
- ✅ Add items to cart
- ✅ See success messages

---

**Which option works best for you?**
- **Option 1** = Permanent, clean fix
- **Option 2** = Quick if database structure is correct
- **Option 3** = Reset everything if data is corrupted

---

**Recommendation: Use Option 1** for the cleanest solution.

Next file to read: `COMPLETE_DBCONTEXT_SEED_DATA.cs` (shows the updated seed code)
