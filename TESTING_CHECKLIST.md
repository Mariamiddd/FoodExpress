## 🚨 QUICK CHECKLIST - Before Testing

### ✅ Backend Checks
- [ ] Database migrations are applied (run `Update-Database`)
- [ ] `Customer` role exists in AspNetRoles table
- [ ] JWT configuration in `appsettings.json`:
  - `Jwt:Key` - minimum 32 characters
  - `Jwt:Issuer` - set
  - `Jwt:Audience` - set
  - `Jwt:ExpirationInMinutes` - set (e.g., 60)

### ✅ Frontend Checks
- [ ] API URL in script.js is correct: `https://localhost:7198/api`
- [ ] Check browser console (F12) for errors
- [ ] Check Network tab to see actual API requests/responses

### ✅ Data Validation
When registering, ensure:
- Email: valid email format (user@example.com)
- Username: 3-50 characters
- Password: 8+ characters (any characters ok)

### 🔍 Debug Steps
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login/register
4. Click on the request to see:
   - Request body
   - Response status code
   - Response body
5. Check Console tab for any JavaScript errors

### 📍 Common Success Signs
- Status 200 with token for login
- Status 200 with null data for register
- Floating login button disappears after successful login
- Navbar shows logout button
- Can see Cart, Orders, Profile buttons

### ❌ Common Error Signs
- Status 400: Validation error (check request data)
- Status 401: Authentication failed (check credentials)
- Status 500: Server error (check backend logs)
- CORS error in console: Check CORS settings in Program.cs

---

## 📋 appsettings.json Example

```json
{
  "Jwt": {
	"Key": "YourVeryLongSecretKeyWithAtLeast32CharactersForHS256",
	"Issuer": "FoodExpressAPI",
	"Audience": "FoodExpressApp",
	"ExpirationInMinutes": 60
  },
  "ConnectionStrings": {
	"DefaultConnection": "Server=.;Database=FoodExpressDB;Trusted_Connection=true;Encrypt=false;"
  }
}
```

---

## 🎯 Test Sequence

1. **Register**: Email: test@test.com, Username: testuser, Password: Test1234
2. **Login**: Email: test@test.com, Password: Test1234
3. **View Restaurants**: Should load without login
4. **Add to Cart**: Should prompt login (if not logged in)
5. **Checkout**: Should require address selection

---

## 📞 Troubleshooting Help

If login/register still doesn't work:
1. Check backend is running (no errors on startup)
2. Check browser Network tab for actual API errors
3. Check backend console logs for exception details
4. Verify JWT config values in appsettings.json
5. Ensure database migrations ran successfully
