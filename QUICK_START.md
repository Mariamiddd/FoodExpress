# FoodExpress Backend - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Run the Application
```bash
cd Food.Web
dotnet run
```

The application starts at: `https://localhost:7280`

### Step 2: Wait for Database Setup
- Database `FoodDb` is automatically created on first run
- Migrations are automatically applied
- Seed data is automatically populated
- Wait for "Application startup" message

### Step 3: Test Login
Open REST Client (VS Code) or Postman and send:

```http
POST https://localhost:7280/api/auth/login
Content-Type: application/json

{
  "email": "customer@gmail.com",
  "password": "Customer123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"expiresAt": "2026-01-08T...",
	"userId": "...",
	"email": "customer@gmail.com",
	"userName": "customer@gmail.com"
  }
}
```

### Step 4: Copy the Token
- Copy the `token` value from response
- You'll use this for authenticated requests

### Step 5: View Restaurants
```http
GET https://localhost:7280/api/Restaurants
```

### Step 6: View Menu
```http
GET https://localhost:7280/api/Menu/restaurant/1
```

### Step 7: Add to Cart (with Token)
```http
POST https://localhost:7280/api/cart/items
Content-Type: application/json
Authorization: Bearer <PASTE_TOKEN_HERE>

{
  "menuItemId": 2,
  "quantity": 1
}
```

### Step 8: Create Order (with Token)
```http
POST https://localhost:7280/api/orders
Content-Type: application/json
Authorization: Bearer <PASTE_TOKEN_HERE>

{
  "restaurantId": 1,
  "addressId": 1
}
```

## 📋 Pre-seeded Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@gmail.com | Admin123! | Admin |
| customer@gmail.com | Customer123! | Customer |
| john@gmail.com | John123! | Customer |
| jane@gmail.com | Jane123! | Customer |

## 🍽️ Pre-seeded Restaurants & Menu

### Pizza Palace
- 🥖 Garlic Bread - $5.99
- 🍕 Margherita Pizza - $12.99
- 🍕 Pepperoni Pizza - $14.99
- 🍰 Tiramisu - $6.99

### Burger Heaven
- 🍟 French Fries - $4.99
- 🍔 Classic Burger - $10.99
- 🍔 Double Cheeseburger - $13.99
- 🥤 Coca Cola - $2.99

### Sushi Paradise
- 🌱 Edamame - $6.99
- 🍣 California Roll - $11.99
- 🌶️ Spicy Tuna Roll - $13.99
- 🥬 Seaweed Salad - $8.99

## 📱 Using Swagger UI

Open browser: `https://localhost:7280/swagger`

1. Click "Authorize" button
2. Enter: `Bearer <YOUR_TOKEN>`
3. Click "Authorize"
4. Test endpoints directly in Swagger UI

## 📝 Testing Files

| File | Purpose |
|------|---------|
| `FoodExpress.http` | REST Client endpoints (VS Code) |
| `test-api.sh` | Bash/curl commands |
| `TESTING_GUIDE.md` | Detailed testing documentation |
| `CHANGES_SUMMARY.md` | Summary of changes made |

## ⚡ Common Issues & Fixes

### "Cannot connect to database"
- Check SQL Server is running: `SQLEXPRESS`
- Verify connection string in `appsettings.json`

### "Invalid email or password"
- Use exact credentials from table above
- Make sure you've waited for seed data to populate

### "401 Unauthorized"
- Include full Authorization header: `Bearer <token>`
- Token expires in 180 minutes

### "Order failed - dishes from different restaurants"
- Ensure all items in cart are from same restaurant
- Create new cart or remove mismatched items

## 📊 Order Status Flow

```
Created
   ↓
Confirmed (Admin action)
   ↓
Preparing (Admin action)
   ↓
OnTheWay (Admin action)
   ↓
Delivered (Final state)

OR

Created/Confirmed → Cancelled (Admin action)
```

## 🔒 Security Notes

- JWT tokens expire in 3 hours (180 minutes)
- Request new token for expired: login again
- Admin endpoints require "Admin" role
- Customer endpoints require buyer's own userId

## 📚 Full Documentation

See `TESTING_GUIDE.md` for complete documentation including:
- Complete authentication flow
- Admin operations
- Advanced testing scenarios
- Troubleshooting guide
- API endpoint reference

## ✅ Verification Checklist

After running application:
- [x] API responds at https://localhost:7280
- [x] Swagger UI available at /swagger
- [x] Can login with given credentials
- [x] Get valid JWT token
- [x] Can view restaurants
- [x] Can view menu items
- [x] Can add to cart (with token)
- [x] Can create order (with token)

---

**Ready to Test!** 🎉

Next: Open `FoodExpress.http` and start testing or navigate to Swagger UI
