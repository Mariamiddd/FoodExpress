# FoodExpress

FoodExpress is a full-stack food ordering platform built with **ASP.NET Core (.NET 10)**. It delivers a high-performance RESTful API adhering to Clean Architecture principles, coupled with an interactive web frontend for restaurant discovery, menu exploration, dynamic cart handling, and end-to-end order processing.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Database Migration & Seeding](#database-migration--seeding)
  - [Running the Application](#running-the-application)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Restaurants & Menus](#restaurants--menus)
  - [Shopping Cart](#shopping-cart)
  - [Addresses](#addresses)
  - [Orders](#orders)
  - [User Profile & Administration](#user-profile--administration)
- [Business Rules & Validation](#business-rules--validation)
- [Testing](#testing)
- [Deployment & Security Considerations](#deployment--security-considerations)

---

## Overview & Architecture

FoodExpress adopts an Onion/Clean Architecture layout to ensure strict decoupling of business rules from database access, third-party libraries, and UI presentation:

```
┌────────────────────────────────────────────────────────┐
│                   Food.Web (Presentation)              │
│       Controllers, Middleware, Static Assets (UI)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              Food.Application (Business Logic)         │
│          Services, DTOs, AutoMapper, Validators        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Food.Domain (Core)                   │
│         Entities, Enums, Core Repository Interfaces    │
└───────────────────────────▲────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────┐
│             Food.Infrastructure (Data & External)      │
│      EF Core, SQL Server, Repositories, Migrations     │
└────────────────────────────────────────────────────────┘
```

- **Domain**: Pure business entities (`Order`, `OrderItem`, `Restaurant`, `MenuItem`, `Cart`, `CartItem`, `Address`, `Category`, `ApplicationUser`) and repository contracts. No external dependencies.
- **Application**: Business workflows, DTO mappings via AutoMapper, validation rules (`BusinessRulesValidator`), and service abstractions.
- **Infrastructure**: Entity Framework Core 10, SQL Server integration, Unit of Work pattern, database context (`FoodDbContext`), migrations, and data seeding (`DbSeeder`).
- **Web**: ASP.NET Core API controllers, JWT authentication, global exception handler middleware, Swagger OpenAPI documentation, and the browser UI located in `wwwroot`.

---

## Key Features

### Customer Experience
- **Authentication**: JWT-based sign-up and login with automatic cart provisioning.
- **Discovery**: Filter restaurants by category, search by name or street address, and view detailed menus with pricing and availability.
- **Cart Management**: Add items to cart with strict validation (enforces single-restaurant ordering and stock availability).
- **Address Book**: Save and manage multiple delivery addresses.
- **Order Flow**: Place orders from cart items, track real-time order status, and inspect past order receipts.
- **Profile**: View profile details and upload profile avatars.

### Admin Capabilities
- **Restaurant Catalog**: Create, update, delete restaurants, and upload high-resolution venue photos.
- **Menu & Category Administration**: Add categories, manage menu items, toggle availability, and upload dish images.
- **Order Supervision**: View platform-wide order history and advance order states (`Pending` → `Confirmed` → `Preparing` → `OutForDelivery` → `Delivered` / `Cancelled`).
- **Role Elevation**: Promote registered accounts to administrator status via email lookup.

---

## Technology Stack

- **Framework**: .NET 10 (C# 14)
- **Web Framework**: ASP.NET Core Web API
- **Data Access**: Entity Framework Core 10 (SQL Server Provider)
- **Identity & Security**: ASP.NET Core Identity with JWT Bearer Token Authentication
- **Object Mapping**: AutoMapper
- **API Documentation**: Swashbuckle / Swagger UI with Bearer Auth configuration
- **Frontend**: Vanilla HTML5, CSS3, Modern JavaScript (Single Page Application in `wwwroot`)
- **Testing**: xUnit, Moq, Coverlet

---

## Project Structure

```
FoodExpress/
├── FoodExpress.slnx                  # Solution definition file
├── Food.Domain/                      # Core domain entities & interfaces
│   ├── Interfaces/                   # Repository contracts (IRestaurantRepository, etc.)
│   └── Models/                       # Entities & Identity models
├── Food.Application/                 # Application layer
│   ├── DTOs/                         # Request & Response Data Transfer Objects
│   ├── Profiles/                     # AutoMapper profiles
│   ├── Services/                     # Service interfaces & implementations
│   └── Validators/                   # Domain business rule validators
├── Food.Infrastructure/              # Data persistence & seeding
│   ├── Data/                         # FoodDbContext & DbSeeder
│   ├── Migrations/                   # EF Core database migrations
│   └── Repositories/                 # Repository & Unit of Work implementations
├── Food.Web/                         # Host & Presentation layer
│   ├── Controllers/                  # RESTful API controllers
│   ├── Middleware/                   # Exception handling middleware
│   ├── Properties/                   # Launch settings (HTTP & HTTPS profiles)
│   ├── wwwroot/                      # Static client (index.html, styles.css, app.js)
│   └── appsettings.json              # Base runtime configuration
└── Food.Tests/                       # Test suite
    ├── BusinessRulesValidatorTests.cs
    ├── CartServiceTests.cs
    ├── MenuServiceTests.cs
    ├── OrderServiceTests.cs
    └── RestaurantServiceTests.cs
```

---

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [SQL Server](https://www.microsoft.com/sql-server) or SQL Server Express
- Visual Studio 2022+ / JetBrains Rider / VS Code with C# Dev Kit

### Configuration

Runtime settings reside in `Food.Web/appsettings.json`. Below are key configuration blocks:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=.\\SQLEXPRESS;Database=FoodDb;Integrated Security=True;TrustServerCertificate=True;MultipleActiveResultSets=True;Connection Timeout=60;"
  },
  "Jwt": {
    "Key": "SuperSecretKeyForFoodExpressApi1234567890!",
    "Issuer": "FoodExpress",
    "Audience": "FoodExpressUsers",
    "ExpirationInMinutes": 180
  },
  "SeedSettings": {
    "AdminUserName": "admin",
    "AdminEmail": "admin@gmail.com",
    "AdminPassword": "Admin123!",
    "SeedDemoData": true
  }
}
```

> **Security Note:** Never commit production credentials or encryption keys. Override settings using environment variables:
> - `ConnectionStrings__DefaultConnection`
> - `Jwt__Key`
> - `SeedSettings__AdminEmail`
> - `SeedSettings__AdminPassword`

### Database Migration & Seeding

The application automatically invokes `DbContext.Database.MigrateAsync()` on startup via `DbSeeder`. It performs the following initialization steps:
1. Creates the database schema and applies pending migrations.
2. Ensures `Admin` and `Customer` identity roles exist.
3. Provisions a default administrator account from `SeedSettings`.
4. Populates sample categories, restaurants, and menu items if `SeedDemoData` is `true` and the restaurant catalog is empty.

### Running the Application

Restore dependencies and start the API:

```powershell
# Restore NuGet packages
dotnet restore FoodExpress.slnx

# Run Food.Web with default HTTP profile
dotnet run --project Food.Web --launch-profile http
```

Once running, access:
- **Web UI**: `http://localhost:5294/` (or `https://localhost:7280/` under HTTPS)
- **Swagger Documentation**: `http://localhost:5294/swagger`

---

## API Reference

All successful responses follow the standard wrapper:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "errors": null
}
```

### Authentication (`/api/Auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/Auth/Register` | Anonymous | Register a new user and receive a JWT token |
| `POST` | `/api/Auth/Login` | Anonymous | Sign in with email and password |

### Restaurants & Menus (`/api/Restaurants` & `/api/Menu`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/Restaurants` | Anonymous | Get paginated restaurants (filters: `search`, `categoryId`, `page`, `pageSize`) |
| `GET` | `/api/Restaurants/{id}` | Anonymous | Get restaurant details by ID |
| `GET` | `/api/Restaurants/{id}/menu` | Anonymous | Get menu catalog for a specific restaurant |
| `POST` | `/api/Restaurants` | Admin | Create a new restaurant |
| `PUT` | `/api/Restaurants/{id}` | Admin | Update restaurant information |
| `DELETE` | `/api/Restaurants/{id}` | Admin | Delete a restaurant |
| `POST` | `/api/Restaurants/{id}/image` | Admin | Upload a restaurant cover photo (`multipart/form-data`) |
| `GET` | `/api/Menu/categories` | Anonymous | List all dish categories |
| `POST` | `/api/Menu/categories` | Admin | Create a new category |
| `POST` | `/api/Menu` | Admin | Create a menu item |
| `PUT` | `/api/Menu/{id}` | Admin | Update menu item details |
| `DELETE` | `/api/Menu/{id}` | Admin | Delete a menu item |
| `POST` | `/api/Menu/{id}/image` | Admin | Upload a menu item image |

### Shopping Cart (`/api/Cart`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/Cart` | Authenticated | View current shopping cart and calculated totals |
| `POST` | `/api/Cart/items` | Authenticated | Add an item to cart (`menuItemId`, `quantity`) |
| `PUT` | `/api/Cart/items/{menuItemId}`| Authenticated | Update item quantity in cart |
| `DELETE` | `/api/Cart/items/{menuItemId}`| Authenticated | Remove an item from cart |

### Addresses (`/api/Addresses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/Addresses/my` | Authenticated | Retrieve saved addresses for current user |
| `POST` | `/api/Addresses` | Authenticated | Add a new delivery address (`city`, `street`) |
| `DELETE` | `/api/Addresses/{id}` | Authenticated | Remove an address |

### Orders (`/api/Orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/Orders` | Authenticated | Place order from current cart with delivery address ID |
| `GET` | `/api/Orders/my` | Authenticated | View current customer's order history |
| `GET` | `/api/Orders/{id}` | Customer / Admin | Get order receipt (owner or admin only) |
| `GET` | `/api/Orders` | Admin | List all orders across all customers |
| `PUT` | `/api/Orders/{id}/status` | Admin | Advance order lifecycle state |

### User Profile & Administration (`/api/Users` & `/api/Admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/Users/profile` | Authenticated | Get current authenticated user profile |
| `POST` | `/api/Users/profile-image` | Authenticated | Upload user avatar |
| `POST` | `/api/Admin/users/promote` | Admin | Promote an existing user to Admin (`?email=user@domain.com`) |

---

## Business Rules & Validation

Core domain invariants are validated across domain entities and application services:
1. **Single-Restaurant Cart Enforcement**: A customer cart cannot contain items from multiple restaurants concurrently. Adding an item from another restaurant returns a validation error.
2. **Availability Check**: Menu items marked as `IsAvailable = false` cannot be added to a cart or ordered.
3. **Quantity Integrity**: Cart item and order item quantities must strictly be positive integers (`> 0`).
4. **Server-Side Price Calculation**: Order line item prices and totals are calculated exclusively from database records at the moment of order placement to prevent client-side price tampering.
5. **Order State Lifecycle**: Order states advance sequentially (`Pending` → `Confirmed` → `Preparing` → `OutForDelivery` → `Delivered`), and cannot transition out of terminal states (`Delivered`, `Cancelled`).
6. **Image Upload Restrictions**: Uploaded assets are checked against allowed formats (`.jpg`, `.jpeg`, `.png`, `.webp`) and a 5 MB maximum file size limit.

---

## Testing

The test project `Food.Tests` covers business validators, services, and repository interactions using **xUnit** and **Moq**:

- `BusinessRulesValidatorTests`: Verifies single-restaurant constraints and availability checks.
- `CartServiceTests`: Validates cart calculations, quantity updates, and cart item additions.
- `OrderServiceTests`: Verifies order creation, cart clearance, and state machine transitions.
- `MenuServiceTests` & `RestaurantServiceTests`: Verifies menu/restaurant CRUD and error handling.

To run tests from the command line:

```powershell
# Run all tests
dotnet test Food.Tests/Food.Tests.csproj

# Run tests with detailed console logger
dotnet test Food.Tests/Food.Tests.csproj --logger "console;verbosity=normal"
```

---

## Deployment & Security Considerations

1. **HTTPS Enforcement**: Always use HTTPS in staging and production (`app.UseHttpsRedirection()`).
2. **Secret Management**: Replace default JWT keys and seed credentials with Azure Key Vault, AWS Secrets Manager, or environment variables.
3. **CORS Policy**: Restrict CORS origins in production (replace `AllowAll` with specific domain origins in `Program.cs`).
4. **Database Permissions**: Ensure the SQL user used by the application adheres to the principle of least privilege in production environments.
