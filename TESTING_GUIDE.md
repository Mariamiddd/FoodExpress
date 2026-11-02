# FoodExpress Backend - Testing Guide

## Project Overview
FoodExpress is a .NET 10 ASP.NET Core Web API for a food ordering system with JWT authentication, restaurant/menu management, shopping cart, and order tracking.

## Technology Stack
- **.NET 10** - Framework
- **ASP.NET Core** - Web API
- **Entity Framework Core** - ORM
- **SQL Server** - Database
- **JWT** - Authentication
- **AutoMapper** - DTO mapping

## Database Setup

### Prerequisites
- SQL Server (SQLEXPRESS local instance)
- .NET 10 SDK installed
- Visual Studio or VS Code

### Initial Setup
1. The database `FoodDb` will be created automatically when you first run the application
2. All migrations are in `Food.Infrastructure/Migrations/`
3. Seed data is automatically applied on startup:
   - **Admin User**: admin@gmail.com / Admin123!
   - **Test Customers**: 
	 - customer@gmail.com / Customer123!
	 - john@gmail.com / John123!
	 - jane@gmail.com / Jane123!
   - **Restaurants**: Pizza Palace, Burger Heaven, Sushi Paradise
   - **Menu Items**: 12 sample items across different categories

### Running the Application
```powershell
cd Food.Web
dotnet run
```

The API will be available at:
- **API**: https://localhost:7280
- **Swagger/OpenAPI**: https://localhost:7280/swagger

## Authentication Flow

### 1. Register a New User
```http
POST https://localhost:7280/api/auth/register
Content-Type: application/json

{
  "userName": "newuser",
  "email": "newuser@gmail.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": null
}
```

### 2. Login to Get JWT Token
```http
POST https://localhost:7280/api/auth/login
Content-Type: application/json

{
  "email": "customer@gmail.com",
  "password": "Customer123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"expiresAt": "2026-01-08T18:15:00Z",
	"userId": "user-id-here",
	"email": "customer@gmail.com",
	"userName": "customer@gmail.com"
  }
}
```

### 3. Use Token for Authenticated Requests
Add the token to the `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Testing Complete Order Flow

### 1. Get Available Restaurants
```http
GET https://localhost:7280/api/Restaurants
Accept: application/json
```

### 2. Get Menu Items for a Restaurant
```http
GET https://localhost:7280/api/Menu/restaurant/1
Accept: application/json
```

### 3. Add Items to Cart (Requires Authentication)
```http
POST https://localhost:7280/api/cart/items
Content-Type: application/json
Authorization: Bearer {your_token}

{
  "menuItemId": 2,
  "quantity": 1
}
```

### 4. View Cart
```http
GET https://localhost:7280/api/cart
Accept: application/json
Authorization: Bearer {your_token}
```

### 5. Create an Order
```http
POST https://localhost:7280/api/orders
Content-Type: application/json
Authorization: Bearer {your_token}

{
  "restaurantId": 1,
  "addressId": 1
}
```

**Note**: 
- Dishes in a single order must be from the same restaurant
- TotalPrice is calculated on the server
- Order statuses: Created → Confirmed → Preparing → OnTheWay → Delivered

### 6. View My Orders
```http
GET https://localhost:7280/api/orders/my
Accept: application/json
Authorization: Bearer {your_token}
```

### 7. Get Order Details
```http
GET https://localhost:7280/api/orders/{orderId}
Accept: application/json
Authorization: Bearer {your_token}
```

## Admin Operations

### Login as Admin
```http
POST https://localhost:7280/api/auth/login
Content-Type: application/json

{
  "email": "admin@gmail.com",
  "password": "Admin123!"
}
```

### Update Order Status (Admin Only)
```http
PATCH https://localhost:7280/api/orders/{orderId}/status
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "status": "Confirmed"
}
```

**Valid Status Transitions**:
- Created → Confirmed
- Created → Cancelled
- Confirmed → Preparing
- Confirmed → Cancelled
- Preparing → OnTheWay
- OnTheWay → Delivered

## Using the .http Test File

Open `FoodExpress.http` in Visual Studio or VS Code Rest Client extension:

1. Replace placeholders with actual tokens
2. Test endpoints in sequence
3. Copy tokens from login responses to use in authenticated requests

### Quick Testing Steps:
1. Run "Login with existing customer" to get a token
2. Copy the token value
3. Replace `YOUR_TOKEN_HERE` in authenticated requests
4. Run requests in order

## Key Validation Rules

### Business Rules
- ✅ Quantity must be > 0
- ✅ Unavailable MenuItem cannot be ordered
- ✅ All items in an order must be from the same restaurant
- ✅ TotalPrice calculated server-side (never trust client value)
- ✅ OrderItem.UnitPrice captures price at time of order
- ✅ Order cancellation only from Created/Confirmed states

### Password Requirements
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character

### Email Validation
- Must be valid email format
- Must be unique per user

## Data Model

### Core Entities
- **Users** (AspNetUsers): Email, UserName, PasswordHash, RoleId
- **Restaurants**: Name, Address
- **Categories**: Name
- **MenuItems**: RestaurantId, CategoryId, Name, Price, IsAvailable
- **Carts**: UserId, CartItems, TotalPrice
- **CartItems**: CartId, MenuItemId, Quantity, UnitPrice
- **Orders**: UserId, RestaurantId, AddressId, Status, TotalPrice, CreatedAt
- **OrderItems**: OrderId, MenuItemId, Quantity, UnitPrice
- **Addresses**: UserId, Street, City

## Troubleshooting

### login/Register Issues

**"Invalid email or password"**
- Verify credentials match seed data
- Check email format is valid
- Ensure password contains required characters

**"User registered successfully" but can't login**
- Wait a moment for database to sync
- Verify email matches exactly
- Check if role "Customer" exists in database

**"401 Unauthorized" on protected endpoints**
- Ensure you're sending the Authorization header
- Verify token is not expired (expiration: 180 minutes)
- Token must be prefixed with "Bearer "

### Database Issues

**Database not created**
- Check SQL Server is running on SQLEXPRESS
- Verify connection string in appsettings.json
- Check Windows Authentication permissions

**Migrations not applied**
- The first application run applies migrations automatically
- Check Food.Infrastructure/Migrations folder exists

## Running Tests
TODO: Add unit test instructions

## Error Handling

All API responses follow a standard format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
	"fieldName": ["Error message"]
  }
}
```

## API Endpoints Summary

| Method | Endpoint | Auth Required | Role |
|--------|----------|---------------|------|
| POST | /api/auth/register | No | - |
| POST | /api/auth/login | No | - |
| GET | /api/Restaurants | No | - |
| GET | /api/Restaurants/{id} | No | - |
| GET | /api/Menu | No | - |
| GET | /api/Menu/restaurant/{id} | No | - |
| POST | /api/cart/items | Yes | Customer |
| GET | /api/cart | Yes | Customer |
| PUT | /api/cart/items/{id} | Yes | Customer |
| DELETE | /api/cart/items/{id} | Yes | Customer |
| POST | /api/orders | Yes | Customer |
| GET | /api/orders/my | Yes | Customer |
| GET | /api/orders/{id} | Yes | Customer |
| PATCH | /api/orders/{id}/status | Yes | Admin |
| POST | /api/Addresses | Yes | Customer |
| GET | /api/Addresses | Yes | Customer |

## Support
For issues or questions, refer to the Swagger documentation at https://localhost:7280/swagger
