# 🔧 How to Debug if Registration Still Doesn't Work

## Step-by-Step Debugging Guide

### Step 1: Check Browser Console for Errors
1. Open browser
2. Press **F12** to open Developer Tools
3. Click on **Console** tab
4. Try to register
5. Look for any red error messages
6. Copy and paste any errors here to investigate

---

### Step 2: Check Network Tab (Most Important!)
1. Press **F12** for Developer Tools
2. Click on **Network** tab
3. Leave it open while you try to register
4. When you click register, you should see a request appear:
   - **Endpoint**: `api/Auth/Register`
   - **Method**: `POST`

5. Click on that request to see details:
   - **Status**: Should be 200 (success), 400 (validation error), or 500 (server error)
   - **Request Body**: What we sent (should have `userName`, `email`, `password`)
   - **Response**: What server sent back

---

### Step 3: Verify Backend is Running
1. Open Visual Studio
2. Press **F5** to run backend
3. Should see a browser window open or terminal showing it's running
4. Should say "Application started" in the output
5. Check the port it's running on (usually https://localhost:7XXX)
6. Update the API URL if needed

---

### Step 4: Check appsettings.json
1. Open `Food.Web\appsettings.json`
2. Make sure it has these settings:

```json
{
  "Jwt": {
	"Key": "YourSecretKeyAtLeast32CharactersLongForHS256Security",
	"Issuer": "FoodExpressAPI",
	"Audience": "FoodExpressApp",
	"ExpirationInMinutes": 60
  },
  "ConnectionStrings": {
	"DefaultConnection": "Server=.;Database=FoodExpressDB;Trusted_Connection=true;Encrypt=false;"
  }
}
```

3. If any of these are missing, registration will fail

---

### Step 5: Check Database
1. Open **SQL Server Management Studio** or **Visual Studio SQL Server Object Explorer**
2. Look for `FoodExpressDB` database
3. Expand `Tables` → `AspNetRoles`
4. Should see at least one role: `"Customer"`
5. If `Customer` role is missing:
   - This will cause registration to fail silently
   - You need to add it

**To add Customer role in SQL:**
```sql
INSERT INTO AspNetRoles (Id, Name, NormalizedName) 
VALUES (NEWID(), 'Customer', 'CUSTOMER');
```

---

### Step 6: Check Backend Output for Errors
1. In Visual Studio, look at the **Output** window (View → Output)
2. Select dropdown → "Show output from: Food.Web" or similar
3. Try to register
4. Look for any error messages or exceptions
5. Copy the exact error message

---

### Step 7: Test with Direct API Call (Using Browser)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Paste this code and run it:

```javascript
fetch('https://localhost:7198/api/Auth/Register', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		userName: 'testuser123',
		email: 'testuser@example.com',
		password: 'Test1234'
	})
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(e => console.error('Error:', e));
```

4. Check console for the response
5. If you see an error object with details, that's helpful info

---

## Common Issues & Solutions

### Issue 1: "Nothing happens when I click Register"
**Possible Causes:**
- [ ] JavaScript error in browser console
- [ ] API request not being sent (check Network tab)
- [ ] Backend not running (check if F5 started it)
- [ ] API URL is wrong in script.js

**Solution:**
```javascript
// Check if API URL is correct in script.js (line 1)
const apiUrl = 'https://localhost:7198/api';  // Should match your backend port
```

---

### Issue 2: "Request returns 400 Bad Request"
**Possible Cause:** Validation error from DTO

**Check Response in Network tab:**
```json
{
  "success": false,
  "message": "Validation error(s)",
  "errors": {
	"UserName": ["Username must be between 3 and 50 characters"]
  }
}
```

**Solutions:**
- Username must be 3-50 characters
- Email must be valid format (user@domain.com)
- Password must be 8+ characters

---

### Issue 3: "Request returns 401 Unauthorized"
**Possible Cause:** User already exists

**Check Response:**
```json
{
  "success": false,
  "message": "Registration failed: Username already taken"
}
```

**Solution:**
- Use a different username
- Or check database if user exists

---

### Issue 4: "Request returns 500 Internal Server Error"
**Possible Cause:** Server exception

**Check Backend Output window:**
- Look for exception details
- Common issues:
  - Customer role doesn't exist
  - JWT config is missing
  - Database connection failed

**Solutions:**
1. Check appsettings.json has JWT config
2. Check Customer role exists in database
3. Check SQL Server connection
4. Run migrations: `dotnet ef database update`

---

### Issue 5: "CORS error in console"
**Error looks like:** 
```
Access to fetch at 'https://localhost:7198/api/Auth/Register' from origin 
'http://localhost:3000' has been blocked by CORS policy
```

**Solution:** CORS should already be enabled in Program.cs, but verify:
```csharp
app.UseCors("AllowAll");  // Should be before app.UseAuthorization()
```

---

## Quick Checklist

- [ ] Backend is running (F5 pressed)
- [ ] No errors in browser console (F12)
- [ ] Network tab shows 200 status on register request
- [ ] appsettings.json has JWT config
- [ ] Customer role exists in database
- [ ] Database connection is working
- [ ] Database migrations are applied
- [ ] API URL in script.js matches backend port
- [ ] Username is 3-50 characters
- [ ] Email is valid format
- [ ] Password is 8+ characters

---

## If Nothing Works - Nuclear Option

1. **Restart everything:**
   - Close browser
   - Stop backend (Shift+F5)
   - Close Visual Studio
   - Reopen Visual Studio
   - Rebuild solution (Ctrl+Shift+B)
   - Run migrations: `dotnet ef database update`
   - Press F5 to start backend
   - Open browser again

2. **Clear everything and start fresh:**
   - Delete database: Drop `FoodExpressDB`
   - Run migrations: `dotnet ef database update` (creates fresh DB)
   - Backend will automatically seed if seeding is configured
   - Try registering again

---

## Getting Help

When asking for help, provide:
1. **Error message from Browser Console (F12)**
2. **Network tab response** for the failed request
3. **Status code** (200, 400, 401, 500, etc)
4. **What data you entered** (username, email, password)
5. **Backend output window** messages
6. **appsettings.json JWT config** (hide secret key)

This will help identify the exact issue quickly!

