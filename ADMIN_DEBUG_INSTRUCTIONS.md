# FoodExpress Admin Features - Debug Instructions

## CRITICAL STEPS TO DEBUG ADMIN FUNCTIONALITY (1 HOUR DEADLINE)

### Step 1: Hard Refresh Browser
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Step 2: Open Developer Tools & Console
```
Press F12
Click on "Console" tab
```

### Step 3: Login as Admin
- Use credentials: `admin@gmail.com` / `Admin123!`
- Check that you see the "Admin" button in navbar (should appear in green/accent color)

### Step 4: Run These Console Tests in Order (Copy & Paste)

#### Test 1: Check if admin button exists and is visible
```javascript
testAdminButton()
```
Expected output:
```
=== ADMIN BUTTON TEST ===
Button element: <button>...
Button exists: true
Current display: block
...
```

#### Test 2: Check if admin view exists  
```javascript
testAdminView()
```
Expected output:
```
=== ADMIN VIEW TEST ===
View element: <div>...
View exists: true
View HTML content length: 3000+
View children count: 4+
After forcing display=block
```

#### Test 3: Check if all form inputs exist
```javascript
testAdminForm()
```
Expected output:
```
=== ADMIN FORM ELEMENTS TEST ===
adm-rest-id: ✓ EXISTS
adm-rest-name: ✓ EXISTS
adm-rest-address: ✓ EXISTS
adm-menu-restId: ✓ EXISTS
...all fields should show ✓ EXISTS
```

#### Test 4: Show the admin interface
```javascript
forceShowAdmin()
```
Expected result: Admin dashboard should become **VISIBLE** on screen

#### Test 5: Verify token contains Admin role
```javascript
debugAdminToken()
```
Expected output:
```
=== TOKEN DEBUG INFO ===
Token exists: ✓
Full Payload: {... role claim shows Admin ...}
Is Admin? ✓ YES
```

### Step 5: Test Admin Functions

#### Test Adding a Restaurant
```javascript
// Set form values
document.getElementById('adm-rest-name').value = 'Test Restaurant';
document.getElementById('adm-rest-address').value = '123 Test St';

// Click add button or call function
adminAddRestaurant()
```

Open **Network Tab** (F12 > Network) and watch for:
- Request to: `POST https://localhost:7280/api/admin/restaurants`
- Status code should be: `200` or `201`
- Response should show: `{"success": true}` or `{"Success": true}`

#### Test Adding a Menu Item
```javascript
// First create a category if needed
document.getElementById('adm-cat-name').value = 'Appetizers';
adminAddCategory()

// Then add menu item
document.getElementById('adm-menu-restId').value = 1;  // Use existing restaurant ID
document.getElementById('adm-menu-catId').value = 1;  // Use existing category ID
document.getElementById('adm-menu-name').value = 'Test Dish';
document.getElementById('adm-menu-price').value = 9.99;
adminAddMenuItem()
```

Open Network Tab and check:
- Request to: `POST https://localhost:7280/api/admin/menuitems`
- Status code should be: `200` or `201`

### Step 6: If Functions Fail

Check console for errors and report:
1. **Button won't show?** → Run `forceShowAdmin()` - if it works, it's a CSS issue
2. **Forms don't function?** → Check Network tab for API response codes
3. **403 Error?** → Admin role not recognized by backend
4. **500 Error?** → Backend database/validation error
5. **404 Error?** → Endpoint path mismatch

### Expected Functional Flow

1. ✓ Login with admin@gmail.com → Token stored in localStorage
2. ✓ Admin button appears in navbar
3. ✓ Click Admin → Admin dashboard view opens
4. ✓ Fill restaurant form → POST to /api/admin/restaurants succeeds
5. ✓ Fill menu item form → POST to /api/admin/menuitems succeeds
6. ✓ Restaurants and menus appear in customer view

### Key Endpoints (Must all return 200+ with Bearer token)

| Endpoint | Method | Requires |  
|----------|--------|----------|
| `/api/admin/restaurants` | POST | Admin + Valid Restaurant DTO |
| `/api/admin/restaurants/{id}` | PUT | Admin + ID in body |
| `/api/admin/restaurants/{id}` | DELETE | Admin + Valid ID |
| `/api/admin/menuitems` | POST | Admin + Valid MenuItem DTO |
| `/api/admin/menuitems/{id}` | PUT | Admin + ID in body |
| `/api/admin/menuitems/{id}` | DELETE | Admin + Valid ID |
| `/api/admin/categories` | POST | Admin + Category name |

All requests must include:
```
Authorization: Bearer {jwtToken}
Content-Type: application/json
```

### If All Tests Pass But Admin Features Still Don't Work

This indicates one of these issues:

1. **Backend Not Authorizing** 
   - `[Authorize(Roles = "Admin")]` missing from AdminController
   - Admin role not assigned to user in database

2. **DTO Validation Failure**
   - Backend expects different field names
   - Missing required fields in request

3. **Database Foreign Key Issues**
   - CategoryId doesn't exist
   - RestaurantId doesn't exist
   - Invalid relationships

4. **CORS Issue**  
   - Check Network tab for CORS errors
   - Verify `AllowAnyOrigin()` in Program.cs

Report the Network tab response body when requesting these endpoints.
