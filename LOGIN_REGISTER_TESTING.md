# 🔧 LOGIN/REGISTER FIX - Complete Testing Guide

## What Was Fixed

### **Problem 1: toggleAuthTab Not Working Properly**
- **Issue**: Used `event.target` which is unreliable in onclick handlers
- **Fix**: Now loops through tabs and sets active by index (0=Login, 1=Register)

### **Problem 2: No HTTP Status Code Checking**
- **Issue**: Frontend only checked `data.Success` but ignored HTTP status codes (200, 400, 500)
- **Fix**: Now checks `response.ok` (true for 200-299) before processing response

### **Problem 3: No Empty Field Validation**
- **Issue**: Sent empty fields to backend which then validated
- **Fix**: Now validates client-side before sending

### **Problem 4: Better Error Messages**
- **Issue**: Generic errors that weren't helpful
- **Fix**: Now includes network error details in toast messages

---

## 🚀 Testing Steps

### Step 1: Start Backend
1. Open Visual Studio
2. Make sure you're in the FoodExpress solution
3. Press **F5** to run the backend
4. Verify in the output/console you see something like:
   ```
   info: Microsoft.Hosting.Lifetime[14]
   Now listening on: https://localhost:7198
   ```
5. **The API URL in script.js is `https://localhost:7198/api`** - if your backend runs on a different port, you need to update it

### Step 2: Clear Browser Cache
This prevents cached JavaScript from interfering:
1. Open browser
2. Press **Ctrl+Shift+Delete** (or Cmd+Shift+Delete on Mac)
3. Clear "Cached images and files"
4. Click "Clear data"

### Step 3: Open Browser DevTools
1. Open browser to `https://localhost:7198` (or your backend URL)
2. Press **F12** to open Developer Tools
3. Click on the **Console** tab
4. Keep it open - you'll look here for errors

### Step 4: Test Registration

#### Test 4a: Valid Registration
1. Click "Login/Register" button (floating button)
2. The modal should open
3. Click on "Register" tab
4. Fill in:
   - Username: `testuser123`
   - Email: `test@example.com`
   - Password: `Test1234`
   - Confirm Password: `Test1234`
5. Click "Register"
6. **Expected**: Should see green toast message: "Registration successful! Please login."
7. Should automatically switch to Login tab

#### Test 4b: Invalid Password Confirmation
1. Click "Register" tab again
2. Fill in all fields but different passwords
3. Click "Register"
4. **Expected**: Should see red toast: "Passwords do not match"

#### Test 4c: Empty Fields
1. Click "Register" tab
2. Leave fields empty
3. Click "Register"
4. **Expected**: Should see red toast: "Please fill in all fields"

#### Test 4d: Weak Password
1. Click "Register" tab
2. Fill in:
   - Username: `testuser456`
   - Email: `test456@example.com`
   - Password: `test` (too short)
   - Confirm Password: `test`
3. Click "Register"
4. **Expected**: Should see red toast from backend: "Password must be at least 8 characters long"

#### Test 4e: Invalid Email
1. Click "Register" tab
2. Fill in:
   - Username: `testuser789`
   - Email: `notanemail` (invalid)
   - Password: `Test1234`
   - Confirm Password: `Test1234`
3. Click "Register"
4. **Expected**: Should see red toast from backend: "Invalid email address"

### Step 5: Test Login

#### Test 5a: Valid Login
1. Click "Login" tab (should already be active after registration)
2. Fill in:
   - Email: `test@example.com` (from step 4a)
   - Password: `Test1234`
3. Click "Login"
4. **Expected**: 
   - Green toast: "Login successful!"
   - Modal closes
   - "Login/Register" button disappears
   - Navbar shows: Cart, Orders, Profile, Logout buttons
   - Page shows restaurants and menus

#### Test 5b: Invalid Credentials
1. Click "Login/Register" button (floating button)
2. Fill in:
   - Email: `test@example.com`
   - Password: `WrongPassword123`
3. Click "Login"
4. **Expected**: Red toast: "User not found or password is incorrect" (or similar)

#### Test 5c: Nonexistent User
1. Click "Login/Register" button
2. Fill in:
   - Email: `nonexistent@example.com`
   - Password: `Test1234`
3. Click "Login"
4. **Expected**: Red toast: Error message from backend

### Step 6: Inspect Network Requests
1. Keep DevTools open (F12)
2. Click on **Network** tab
3. Try to register or login
4. You should see a request appear:
   - `Auth/Register` (blue = success 200-299, red = error 400-599)
   - `Auth/Login` (blue = success, red = error)
5. Click on the request to see:
   - **Headers**: Shows request method (POST), URL, headers
   - **Payload/Request Body**: Shows what we sent (userName, email, password)
   - **Response**: Shows what server sent back

---

## 🔍 Debugging if Something Still Doesn't Work

### Check 1: JavaScript Errors
- Look at **Console** tab in DevTools (F12)
- Any red errors?
- Copy the error and search for it online or check the fix guides

### Check 2: Network Errors
- Go to **Network** tab
- Try to login/register
- Look for red requests (failed requests)
- Click on the request
- Look at **Response** tab
- You'll see the exact error from the backend

### Check 3: API URL
If you see error like "Failed to fetch" or "ERR_SSL_PROTOCOL_ERROR":
1. Open `Food.Web\wwwroot\script.js`
2. Check line 1: `const apiUrl = 'https://localhost:7198/api';`
3. This **MUST** match your backend port
4. If your backend runs on `https://localhost:7099`, change line 1 to:
   ```javascript
   const apiUrl = 'https://localhost:7099/api';
   ```
5. Save, refresh browser (Ctrl+F5 for hard refresh)

### Check 3: Database Issues
If you get error "User not found" when registering:
1. Your database might not exist or is not connected
2. Open Visual Studio
3. In Package Manager Console (View → Other Windows → Package Manager Console):
   ```powershell
   dotnet ef database update
   ```
4. This creates/updates the database

### Check 4: Missing Customer Role
If you register but can't log in, check if Customer role exists:
1. During registration, the backend tries to assign "Customer" role
2. If role doesn't exist silently, login fails
3. In Visual Studio, open **SQL Server Object Explorer**
4. Find your database → Tables → AspNetRoles
5. Should see a record with Name="Customer"
6. If missing, the backend needs to be fixed

---

## 📊 Expected Flow

### Registration Flow:
```
User clicks "Login/Register" 
  → Modal opens with Login tab active
  → User clicks "Register" tab
  → Register form becomes visible, Login form hidden
  → User fills form
  → User clicks "Register" button
  → handleRegister() runs, validates fields
  → Sends POST to /api/Auth/Register
  → Backend validates (username,  email, password)
  → Creates user in database
  → Backend responds with Success=true
  → Frontend shows success toast
  → Form resets
  → Tab switches back to Login
```

### Login Flow:
```
User clicks "Login/Register"
  → Modal opens with Login tab active
  → User fills email and password
  → User clicks "Login" button
  → handleLogin() runs, validates fields
  → Sends POST to /api/Auth/Login
  → Backend validates credentials
  → Backend creates JWT token
  → Backend responds with Success=true and token
  → Frontend stores token in localStorage
  → Frontend closes modal
  → Frontend hides floating login button
  → Frontend shows navbar (Cart, Orders, Profile, Logout)
  → Page refreshes to show app
```

---

## 🆘 If Still Not Working

### Gather Debug Info:

1. **Browser Console (F12):**
   - Any red errors?
   - Copy exact error text

2. **Network Tab (F12):**
   - When you click Register/Login, do you see a request?
   - What's the status code? (200 = good, 400 = client error, 500 = server error)
   - What's in the Response?

3. **Backend Port:**
   - What port does backend show when you F5? (7198, 7099, etc?)
   - Update script.js line 1 to match

4. **Database:**
   - Does FoodExpressDB exist?
   - Run: `dotnet ef database update`

5. **Check appsettings.json:**
   - Open `Food.Web\appsettings.json`
   - Make sure it has valid ConnectionString and JWT config

If you're still stuck, provide:
- Screenshot of error in browser console
- Screenshot of Network request/response
- Screenshot of backend port when running F5

