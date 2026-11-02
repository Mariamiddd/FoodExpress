# Admin Login Debugging Guide

## What Was Fixed

### Issue 1: Property Name Mismatch
**Problem**: Backend returns `Token` (PascalCase) but frontend was looking for `token` (lowercase).

**Fix**: Updated login handler to check for both `tokenData.Token` and `tokenData.token`.

### Issue 2: Admin Role Check Missing
**Problem**: `checkAdminAccess()` function was empty and never showed the admin button.

**Fix**: Implemented proper JWT token decoding to extract role claims and show admin button if user has 'Admin' role.

---

## Testing Steps

### Step 1: Clear Browser Storage
1. Open Developer Tools (F12)
2. Go to Application tab
3. Clear Local Storage
4. Clear Session Storage  
5. Clear Cookies

### Step 2: Restart the Backend
```powershell
cd Food.Web
dotnet run
```

> Wait for: "Now listening on: https://localhost:7280"

### Step 3: Test Admin Login
1. Go to `https://localhost:7280`
2. Click "Login/Register" button
3. Enter:
   - Email: `admin@gmail.com`
   - Password: `Admin123!`
4. Click Login

### Expected Results

#### If Login Succeeds:
- ✅ Toast shows "Login successful!"
- ✅ Modal closes
- ✅ "Admin" button appears in navbar
- ✅ Login/Register button disappears
- ✅ Logout button appears

#### If Login Fails:
- ❌ Toast shows error message  
- ❌ Modal stays open
- ❌ No Admin button visible

---

## Debugging with Browser Console

### Option A: Manual Testing
1. Open DevTools (F12)
2. Go to Console tab
3. Run this command:

```javascript
// Load script
fetch('https://localhost:7280/api/auth/login', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ 
		email: 'admin@gmail.com', 
		password: 'Admin123!' 
	})
}).then(r => r.json()).then(data => {
	console.log('Full Response:', data);
	console.log('Token:', data.Data?.Token);
	console.log('UserId:', data.Data?.UserId);
	console.log('Email:', data.Data?.Email);
})
```

### Option B: Check Stored Token
```javascript
// Check what's stored
const token = localStorage.getItem('jwtToken');
console.log('Stored Token:', token);

// Decode it
if (token) {
	const parts = token.split('.');
	const payload = JSON.parse(atob(parts[1]));
	console.log('Token Payload:', payload);
	console.log('Roles:', payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
}
```

### Option C: Check Admin Button Status
```javascript
// Check admin button
const adminBtn = document.getElementById('admin-nav-btn');
console.log('Admin Button:', adminBtn);
console.log('Admin Button Display:', adminBtn?.style.display);

// Manually trigger check
await checkAdminAccess();
console.log('After checkAdminAccess, display:', adminBtn?.style.display);
```

---

## Common Issues & Solutions

### Issue: "Invalid email or password" error

**Possible Causes:**
1. Admin user not in database
2. Wrong password
3. Database not seeded

**Solutions:**
```sql
-- Check if admin exists
SELECT * FROM AspNetUsers WHERE Email = 'admin@gmail.com'

-- Check admin role
SELECT * FROM AspNetUserRoles WHERE UserId = (
	SELECT Id FROM AspNetUsers WHERE Email = 'admin@gmail.com'
)

-- Reset database (Nuclear option)
-- Delete FoodDb from SQL Server and restart app
```

### Issue: Login succeeds but no Admin button

**Possible Causes:**
1. Admin user doesn't have 'Admin' role
2. Token missing role claims
3. `checkAdminAccess()` function issue

**Debug:**
```javascript
// In console, after login
const token = localStorage.getItem('jwtToken');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('Token payload:', payload);

// Look for role claim - should be:
// "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin"
```

### Issue: Database connection error

**Check:**
```powershell
# Verify SQL Server is running
Get-Service *SQL* | Select Name, Status

# Check connection string in appsettings.json
# Default: Data Source=.\SQLEXPRESS;Database=FoodDb;...
```

---

## Network Request Details

### What Frontend Sends:
```
POST https://localhost:7280/api/auth/login
Content-Type: application/json

{
  "email": "admin@gmail.com",
  "password": "Admin123!"
}
```

### What Backend Should Return:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
	"token": "eyJhbGc...",
	"expiresAt": "2026-01-10T12:00:00Z",
	"userId": "abc123",
	"email": "admin@gmail.com",
	"userName": "admin@gmail.com"
  }
}
```

### Common Response Issues:

**❌ Status 401 - Unauthorized**
- Invalid credentials
- User doesn't exist
- Password hash mismatch

**❌ Status 500 - Server Error**
- JWT configuration missing
- UserManager not initialized
- Unhandled exception

---

## JWT Token Structure

A JWT token has 3 parts separated by dots (`.`):

```
header.payload.signature
xxxxx.yyyyy.zzzzz
```

**Payload contains:**
- `NameIdentifier` → User ID
- `Email` → User email
- `Name` → Username  
- `role` → User roles (can be array for multiple roles)

**To decode manually:**
```javascript
const token = 'eyJ...'
const payload = JSON.parse(atob(token.split('.')[1]))
console.log(payload)
```

---

## Role Claim Format

The role claim URI is: `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`

This is automatically added by ASP.NET Core Identity when you call:
```csharp
claims.Add(new Claim(ClaimTypes.Role, role));
```

So the decoded token should show:
```json
{
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin"
  // OR if multiple roles:
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": ["Admin", "SuperUser"]
}
```

---

## Next Steps if Still Not Working

1. **Check backend logs** - Look for any errors during login
2. **Verify database** - Confirm admin user and role exist
3. **Test with Swagger** - Use `/swagger` to test endpoint directly
4. **Check CORS** - Ensure CORS policy allows frontend requests
5. **Browser cache** - Clear cache and try again

---

## Files Modified

- `Food.Web/wwwroot/script.js` - Fixed token property names and admin role checking
- `Food.Web/wwwroot/debug-login.js` - Debug script for manual testing

---

## Quick Commands

```bash
# Restart app
cd Food.Web && dotnet run

# View logs in real-time
# Look for "Login attempt for email:" in output

# Test endpoint (PowerShell)
$body = @{ email = "admin@gmail.com"; password = "Admin123!" } | ConvertTo-Json
Invoke-WebRequest -Uri "https://localhost:7280/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body `
  -SkipCertificateCheck |
  Select-Object -ExpandProperty Content |
  ConvertFrom-Json
```

