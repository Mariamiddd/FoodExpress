# Admin Login - Complete Fix Summary

## 🔧 Changes Made to Fix Admin Login

### 1. **Fixed JWT Token Property Names** ✅
**File**: `Food.Web/wwwroot/script.js` (handleLogin function)

**Problem**: Backend returns PascalCase properties (`Token`, `UserId`, `Email`) but frontend was checking for lowercase (`token`, `userid`, `email`).

**Solution**: Updated to check for both formats:
```javascript
// Before (❌ Wrong)
if (tokenData && tokenData.token) { ... }

// After (✅ Correct)
if (tokenData && (tokenData.Token || tokenData.token)) { ... }
```

### 2. **Implemented Admin Role Detection** ✅
**File**: `Food.Web/wwwroot/script.js` (checkAdminAccess function)

**Problem**: Admin button was never shown because `checkAdminAccess()` was empty.

**Solution**: Implemented JWT token decoding to extract and verify Admin role:
```javascript
async function checkAdminAccess() {
	const token = localStorage.getItem('jwtToken');

	// Decode JWT payload
	const parts = token.split('.');
	const payload = JSON.parse(atob(parts[1]));

	// Check for Admin role in claims
	const roles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

	if (Array.isArray(roles) ? roles.includes('Admin') : roles === 'Admin') {
		adminBtn.style.display = 'block';  // Show Admin button
	}
}
```

### 3. **Added Role Checking to updateAuthUI** ✅
**File**: `Food.Web/wwwroot/script.js` (updateAuthUI function)

**Addition**: Now calls `checkAdminAccess()` after login to show/hide admin button based on role.

---

## 🚀 How to Test

### Quick Start:
1. **Restart the app:**
   ```powershell
   cd Food.Web
   dotnet run
   ```

2. **Open frontend** at `https://localhost:7280`

3. **Click "Login/Register"**

4. **Enter admin credentials:**
   - Email: `admin@gmail.com`
   - Password: `Admin123!`

5. **Expected Result:**
   - ✅ Toast: "Login successful!"
   - ✅ Modal closes
   - ✅ "Admin" button appears in navbar (next to Profile)
   - ✅ Login button disappears
   - ✅ Logout button appears

---

## 🧪 Browser Testing Checklist

After running through the quick start:

- [ ] Login modal displays correctly
- [ ] Can enter email and password
- [ ] Login button is clickable
- [ ] Toast message appears after login
- [ ] Modal closes automatically
- [ ] Admin button is visible in navbar
- [ ] Can click Admin button and see admin panel
- [ ] Logout button works
- [ ] After logout, Admin button disappears

---

## 🔍 Troubleshooting

### Login Still Fails?

**Step 1: Check Network Request**
1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for `login` request
5. Check Response tab:
   - Status should be 200 OK
   - Data should have a `Token` field (with capital T)

**Step 2: Check Console Logs**
1. Open DevTools Console tab
2. Try login again
3. Look for messages like:
   - `"Login successful. Token stored."`
   - `"Token payload: {...}"`

**Step 3: Verify Database**
Run this in your SQL Server:
```sql
-- Check if admin user exists
SELECT Id, Email, UserName FROM AspNetUsers 
WHERE Email = 'admin@gmail.com'

-- Check if admin has Admin role
SELECT * FROM AspNetUserRoles UR
INNER JOIN AspNetUsers U ON UR.UserId = U.Id
INNER JOIN AspNetRoles R ON UR.RoleId = R.Id
WHERE U.Email = 'admin@gmail.com' AND R.Name = 'Admin'
```

If admin doesn't exist or doesn't have role:
1. Delete the database file
2. Restart the app
3. Database will be recreated with seed data

---

## 📋 Files Changed

| File | Changes |
|------|---------|
| `Food.Web/wwwroot/script.js` | 1. Fixed token property names (Token vs token)<br>2. Implemented checkAdminAccess() function<br>3. Enhanced updateAuthUI() to check admin role<br>4. Added userName to localStorage |
| `ADMIN_LOGIN_DEBUGGING.md` | New debugging guide |

---

## 💡 How It Works

### Login Flow:
1. User enters email/password
2. Frontend sends POST to `/api/auth/login`
3. Backend authenticates with Identity
4. Backend generates JWT token with role claims
5. Frontend receives response
6. Frontend stores token in localStorage
7. Frontend calls `checkAdminAccess()`
8. `checkAdminAccess()` decodes JWT
9. If token contains "Admin" role, admin button shown
10. User sees admin button in navbar

### JWT Token Contents (decoded):
```json
{
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier": "user-id",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/emailaddress": "admin@gmail.com",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/givenname": "admin@gmail.com",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin",
  "exp": 1234567890,
  "iss": "FoodExpress",
  "aud": "FoodExpressUsers"
}
```

---

## ✨ Additional Improvements

### Added to Login:
- Better error logging with `console.log()`
- Support for both PascalCase and camelCase responses
- UserName stored in localStorage
- Proper error messages in toast

### Enhanced Admin Checking:
- JWT token manually decoded (client-side)
- Support for both single role and role array
- Console logging for debugging
- Error handling for invalid tokens

---

## 🔒 Security Notes

- JWT token automatically expires in 180 minutes (set in appsettings.json)
- Token is stored in localStorage (flagged for security review)
- Consider moving to httpOnly cookie in production
- Token contains user ID and roles (safe to expose)
- Admin operations should still be verified on backend

---

## 📞 Still Having Issues?

1. **Check app is running** - Should see "Now listening on: https://localhost:7280"
2. **Clear browser cache** - F12 → Application → Clear Storage
3. **Check console errors** - F12 → Console tab
4. **Verify database** - Check SQL Server has FoodDb with users
5. **Try customer login** - Test with customer@gmail.com / Customer123!
6. **Check backend logs** - Look for "Login attempt" messages

---

## 🎯 Next Steps

After successful admin login:
- [ ] Test admin panel functionality
- [ ] Create new restaurant (admin test)
- [ ] Edit menu items (admin test)
- [ ] Update order status (admin test)
- [ ] Test customer features still work

---

**Status**: ✅ Admin login should now work!

Test it and let me know if you encounter any issues.
