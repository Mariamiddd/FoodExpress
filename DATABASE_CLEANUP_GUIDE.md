# Database Cleanup & Recovery Guide

## Overview

The `DatabaseCleanupUtility` class provides diagnostic and recovery tools for handling corrupted AspNetUsers data that causes `SqlNullValueException`.

## Available Methods

### 1. ValidateUsersTableAsync()
**Purpose**: Diagnose database health without making any changes

**Usage**:
```csharp
using (var scope = app.Services.CreateScope())
{
	var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();
	var report = await DatabaseCleanupUtility.ValidateUsersTableAsync(dbContext);

	Console.WriteLine(report.ToString());

	if (!report.IsHealthy)
	{
		Console.WriteLine("Database contains corrupted data - consider running cleanup");
	}
}
```

**Output Example**:
```
Database Validation Report (2024-01-15T10:30:45Z)
  Total Users: 5
  Issues Found:
	- NULL ConcurrencyStamps: 2
	- NULL UserNames: 0
	- NULL Emails: 0
  Status: ✗ CORRUPTED
```

### 2. RepairNullValuesAsync()
**Purpose**: Fix NULL values by setting them to appropriate defaults

**Usage**:
```csharp
using (var scope = app.Services.CreateScope())
{
	var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();

	// First validate
	var report = await DatabaseCleanupUtility.ValidateUsersTableAsync(dbContext);

	if (!report.IsHealthy)
	{
		// Repair
		await DatabaseCleanupUtility.RepairNullValuesAsync(dbContext);

		// Validate again
		var newReport = await DatabaseCleanupUtility.ValidateUsersTableAsync(dbContext);
		Console.WriteLine("After repair: " + newReport.ToString());
	}
}
```

**What it does**:
- Sets NULL `PhoneNumber` to empty string (`''`)
- Generates new GUIDs for NULL `ConcurrencyStamp`

### 3. CleanupCorruptedUsersAsync()
**Purpose**: Complete removal and reset of all users and roles

**⚠️ WARNING**: This is destructive - it deletes ALL user data

**Usage** (for development/testing only):
```csharp
using (var scope = app.Services.CreateScope())
{
	var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();

	// Option 1: With confirmation (will print warning)
	await DatabaseCleanupUtility.CleanupCorruptedUsersAsync(dbContext, force: false);

	// Option 2: Force without confirmation
	await DatabaseCleanupUtility.CleanupCorruptedUsersAsync(dbContext, force: true);

	// Then reseed
	var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
	var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
	await Program.SeedRolesAndAdminAsync(roleManager, userManager, dbContext);
}
```

## Integration with Program.cs

### Option A: Add Validation (Recommended)
Add to `Program.cs` before seeding:

```csharp
// Seed roles and admin user
using (var scope = app.Services.CreateScope())
{
	var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();
	var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
	var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

	// Validate database health
	var report = await Food.Web.Utilities.DatabaseCleanupUtility.ValidateUsersTableAsync(dbContext);
	if (!report.IsHealthy)
	{
		Console.WriteLine("⚠ Database issues detected:");
		Console.WriteLine(report.ToString());

		// Attempt repair
		try
		{
			await Food.Web.Utilities.DatabaseCleanupUtility.RepairNullValuesAsync(dbContext);
		}
		catch (Exception ex)
		{
			Console.WriteLine($"Repair failed: {ex.Message}");
		}
	}

	// Proceed with seeding
	await SeedRolesAndAdminAsync(roleManager, userManager, dbContext);
}
```

### Option B: Add Reset on Development
Create an environment-based check:

```csharp
// Only in development, optionally reset corrupted data
if (app.Environment.IsDevelopment())
{
	using (var scope = app.Services.CreateScope())
	{
		var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();
		var report = await Food.Web.Utilities.DatabaseCleanupUtility.ValidateUsersTableAsync(dbContext);

		if (!report.IsHealthy)
		{
			Console.WriteLine("Development environment detected with corrupted data.");
			Console.WriteLine("Cleaning and reseeding...");

			await Food.Web.Utilities.DatabaseCleanupUtility.CleanupCorruptedUsersAsync(dbContext, force: true);

			var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
			var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

			await SeedRolesAndAdminAsync(roleManager, userManager, dbContext);
		}
	}
}
```

## Troubleshooting

### Issue: "Cannot execute repair - foreign key constraints prevent deletion"
**Solution**: Run cleanup first to remove all references:
```csharp
await DatabaseCleanupUtility.CleanupCorruptedUsersAsync(dbContext, force: true);
```

### Issue: "Repair succeeded but FindByEmailAsync still throws exception"
**Solution**: The issue may be deeper than NULL fields. Try full cleanup:
```bash
dotnet ef database drop --force
dotnet ef database update
```

### Issue: "Validation report shows healthy but still getting SqlNullValueException"
**Solution**: The issue might be in related tables (AspNetUserRoles, AspNetRoleClaims). Try full cleanup and reseed.

## Database State Commands

### Check current state (SQL Server):
```sql
-- Show all users
SELECT Id, UserName, Email, PhoneNumber, ConcurrencyStamp 
FROM AspNetUsers;

-- Show NULL values
SELECT * FROM AspNetUsers 
WHERE PhoneNumber IS NULL OR ConcurrencyStamp IS NULL;

-- Show row count
SELECT COUNT(*) FROM AspNetUsers;
```

### Manual cleanup (SQL Server):
```sql
-- Disable constraints temporarily
ALTER TABLE AspNetUserRoles NOCHECK CONSTRAINT ALL;
ALTER TABLE AspNetUserClaims NOCHECK CONSTRAINT ALL;

-- Delete data
DELETE FROM AspNetUserRoles;
DELETE FROM AspNetUserClaims;
DELETE FROM AspNetUsers;
DELETE FROM AspNetRoles;

-- Re-enable constraints
ALTER TABLE AspNetUserRoles WITH CHECK CHECK CONSTRAINT ALL;
ALTER TABLE AspNetUserClaims WITH CHECK CHECK CONSTRAINT ALL;

-- Reset identity
DBCC CHECKIDENT ('AspNetUsers', RESEED, 0);
DBCC CHECKIDENT ('AspNetRoles', RESEED, 0);
```

## Performance Considerations

- **ValidateUsersTableAsync()**: O(n) where n = number of users. Safe to run on any database.
- **RepairNullValuesAsync()**: O(n) with locking. Best run during maintenance window.
- **CleanupCorruptedUsersAsync()**: O(1) but destructive. Development only.

## Monitoring

Enable logging in Program.cs:
```csharp
#if DEBUG
using (var scope = app.Services.CreateScope())
{
	var dbContext = scope.ServiceProvider.GetRequiredService<FoodDbContext>();
	var report = await DatabaseCleanupUtility.ValidateUsersTableAsync(dbContext);

	if (!report.IsHealthy)
	{
		System.Diagnostics.Debug.WriteLine(report.ToString());
	}
}
#endif
```

## See Also

- `SQLNULLVALUE_FIX_EXPLANATION.md` - Root cause analysis and fix details
- `Food.Web/Program.cs` - See `SeedRolesAndAdminAsync()` for defensive coding implementation
