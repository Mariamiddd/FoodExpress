# FoodExpress - Quick Launch Guide

## 🚀 Launch in 3 Steps

### Step 1: Run the Application
```powershell
cd Food.Web
dotnet run
```

**What Happens**:
- Application starts at `https://localhost:7280`
- Database `FoodDb` created automatically (first run)
- All seed data loaded automatically
- Admin user created: `admin@gmail.com` / `Admin123!`
- 3 customer test accounts created
- 3 restaurants with 12 menu items seeded
- All test user carts and addresses created

### Step 2: Open in Browser
```
https://localhost:7280
```

### Step 3: Test Login
**Try these credentials:**

```
ADMIN:
  Email: admin@gmail.com
  Password: Admin123!

CUSTOMER:
  Email: customer@gmail.com
  Password: Customer123!

  OR

  Email: john@gmail.com
  Password: John123!

  OR

  Email: jane@gmail.com
  Password: Jane123!
```

---

## ✅ What Works Out-of-the-Box

- ✅ User registration & login
- ✅ Browse restaurants (no login needed)
- ✅ View restaurant menus
- ✅ Search restaurants and menu items
- ✅ Add items to cart (login required)
- ✅ Checkout & place orders
- ✅ Track order status
- ✅ Admin panel for managing orders
- ✅ JWT authentication
- ✅ Role-based access control

---

## 🧪 Testing Methods

### Method 1: Frontend UI (Easiest)
1. Run app
2. Click "Login/Register"
3. Enter credentials
4. Browse and order

### Method 2: REST API Testing (.http file)
1. Open: `Food.Web/FoodExpress.http`
2. Install VS Code extension: "REST Client"
3. Use pre-written test requests
4. Copy tokens between requests

### Method 3: Swagger/OpenAPI
1. Navigate to: `https://localhost:7280/swagger`
2. Try requests directly in browser
3. JWT token handled automatically

### Method 4: Bash/cURL
1. Run: `bash test-api.sh`
2. Follow prompts
3. Test with command line

---

## 📋 Quick Test Flow

### As Customer:
```
1. Navigate to https://localhost:7280
2. Click "Login/Register"
3. Login: customer@gmail.com / Customer123!
4. Click "Restaurants" tab
5. Click any restaurant
6. Click "Add to Cart" on any item
7. Click "Cart" in navbar
8. Click "Place Order"
9. Confirm order created ✓
10. Click "My Orders" to see it
```
**Time: 2 minutes**

### As Admin:
```
1. Navigate to https://localhost:7280
2. Click "Login/Register"
3. Login: admin@gmail.com / Admin123!
4. Click "Admin" button (appears in navbar for admin only)
5. Click "Orders" tab
6. Find a customer's order
7. Change status from "Created" to "Confirmed"
8. See it update ✓
```
**Time: 2 minutes**

---

## 📖 Documentation

| File | Purpose |
|------|---------|
| `QUICK_START.md` | 5-minute setup guide |
| `TESTING_GUIDE.md` | Complete testing documentation |
| `VERIFICATION_CHECKLIST.md` | Pre-launch verification |
| `IMPLEMENTATION_COMPLETE.md` | Implementation summary |
| `PLAN_IMPLEMENTED.md` | Plan completion report |
| `Food.Web/FoodExpress.http` | 30+ test API requests |

---

## 🆘 Troubleshooting

### "Can't login"
- Check email & password match exactly (case-sensitive password)
- Make sure you waited for app to fully start
- Check browser console (F12) for error details

### "404 Not Found"
- Restart the app
- Clear browser cache
- Ensure using `https://localhost:7280` (not http)

### "Database error"
- Ensure SQL Server (SQLEXPRESS) is running
- Connection string: `C:\Program Files\...` or Azure

### "Admin button not showing"
- You're not logged in as admin
- Use: `admin@gmail.com` / `Admin123!`

---

## 🔒 Credentials Summary

```
ADMIN USER:
├── Email: admin@gmail.com
├── Password: Admin123!
└── Role: Admin (has Admin panel access)

CUSTOMER USERS:
├── Email: customer@gmail.com
├── Password: Customer123!
├── Role: Customer
│
├── Email: john@gmail.com
├── Password: John123!
├── Role: Customer
│
└── Email: jane@gmail.com
   ├── Password: Jane123!
   └── Role: Customer

All customers have:
├── Pre-created Cart (empty, ready for shopping)
└── Pre-created Address ("123 Main Street, Sample City")
```

---

## 🗂️ Data Included

### Restaurants (3)
1. **Pizza Palace** - 4 items
   - Garlic Bread $5.99
   - Margherita Pizza $12.99
   - Pepperoni Pizza $14.99
   - Tiramisu $6.99

2. **Burger Heaven** - 4 items
   - French Fries $4.99
   - Classic Burger $10.99
   - Double Cheeseburger $13.99
   - Coca Cola $2.99

3. **Sushi Paradise** - 4 items
   - Edamame $6.99
   - California Roll $11.99
   - Spicy Tuna Roll $13.99
   - Seaweed Salad $8.99

### Categories (5)
- Appetizers
- Main Courses
- Desserts
- Beverages
- Salads

---

## 🎯 Key Features

### Authentication & Authorization
- ✅ User registration with validation
- ✅ Login with JWT tokens
- ✅ 180-minute token expiry
- ✅ Role-based access (Admin/Customer)
- ✅ Secure password hashing

### Shopping
- ✅ Browse restaurants
- ✅ Search functionality
- ✅ Shopping cart
- ✅ Quantity management
- ✅ Cart total calculation

### Ordering
- ✅ Create orders
- ✅ Order validation (same restaurant, available items)
- ✅ Server-side price calculation
- ✅ Order history tracking
- ✅ Order status tracking

### Admin
- ✅ View all orders
- ✅ Update order status
- ✅ Manage restaurants
- ✅ Manage menu items
- ✅ Manage categories

---

## 💻 Tech Stack

- **.NET 10** - Framework
- **ASP.NET Core Web API** - Backend
- **Entity Framework Core** - ORM
- **SQL Server** - Database
- **JWT** - Authentication
- **AutoMapper** - DTO mapping
- **HTML/CSS/JavaScript** - Frontend

---

## 🚨 First Run Expectations

When you run `dotnet run` for the first time:

1. ⏳ **30-60 seconds**: Database creation & migration
2. ⏳ **5-10 seconds**: Seed data loading (users, restaurants, menu items)
3. ✅ **Ready**: See "Now listening on: https://localhost:7280"
4. 🎉 **Test**: Open browser, all data available

**No manual setup needed!** Everything is automatic.

---

## 📞 Common Questions

### Q: Do I need to create test users manually?
**A**: No! They're pre-created. Just login with provided credentials.

### Q: Do I need to create restaurants/menus?
**A**: No! They're pre-seeded. Just start shopping.

### Q: Can I register new users?
**A**: Yes! Use the "Register" tab in the login modal to create new accounts.

### Q: How do I test as admin?
**A**: Login as `admin@gmail.com` / `Admin123!` - you'll see the Admin button.

### Q: How long do JWT tokens last?
**A**: 180 minutes (3 hours). Then you need to login again.

### Q: Where is the database?
**A**: SQL Server (SQLEXPRESS) → Database: `FoodDb`

### Q: Can I see the API docs?
**A**: Yes! Visit `https://localhost:7280/swagger`

### Q: How do I test the API?
**A**: Option A: Use Swagger | Option B: Use `FoodExpress.http` file | Option C: Use curl/bash

---

## 🎓 Learning Path

**New to the project?**
1. Read this file first (you are here)
2. Run the app
3. Test basic login/order flow
4. Read `TESTING_GUIDE.md` for detailed features
5. Review `Food.Web/Program.cs` to see how seeding works
6. Explore code structure

---

## ✨ What's Implemented

### Backend (100% Complete)
- ✅ Database with 8 tables + relationships
- ✅ Entity Framework Core migrations
- ✅ Repository pattern for data access
- ✅ Service layer with business logic
- ✅ ASP.NET Core Identity for auth
- ✅ JWT token generation & validation
- ✅ Role-based authorization
- ✅ Input validation & error handling
- ✅ CORS for frontend access
- ✅ Exception handling middleware
- ✅ Comprehensive logging

### Frontend (100% Complete)
- ✅ Responsive HTML UI
- ✅ User authentication UI
- ✅ Restaurant browsing
- ✅ Shopping cart
- ✅ Order management
- ✅ Admin panel
- ✅ Search functionality
- ✅ Toast notifications
- ✅ Form validation
- ✅ JWT token handling

### Testing (100% Complete)
- ✅ 30+ API test requests
- ✅ Swagger/OpenAPI documentation
- ✅ REST Client test file
- ✅ Bash test script
- ✅ Verification checklist
- ✅ Example test flows

---

## 🏁 Ready?

```powershell
cd Food.Web
dotnet run
```

Then:
```
Open: https://localhost:7280
Login: admin@gmail.com / Admin123!
```

**That's it! Everything works! 🎉**

---

**Questions?** Check `TESTING_GUIDE.md` or `VERIFICATION_CHECKLIST.md`

**Need API docs?** Visit `https://localhost:7280/swagger`

**Want to test API?** Open `Food.Web/FoodExpress.http`

---

**Happy Testing! 🚀**
