const apiUrl = 'https://localhost:7280/api';

// APP STATE
let currentUser = null;
let cart = [];
let selectedRestaurantId = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function getAuthHeaders() {
    const token = localStorage.getItem('jwtToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function isLoggedIn() {
    return !!localStorage.getItem('jwtToken');
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal.style.display === 'none' || !modal.style.display) {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

function toggleAuthTab(tab) {
    const loginForm = document.getElementById('login-form-modal');
    const registerForm = document.getElementById('register-form-modal');
    const tabs = document.querySelectorAll('.auth-modal-tabs .tab');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';

        tabs.forEach((t, idx) => {
            if (idx === 0) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';

        tabs.forEach((t, idx) => {
            if (idx === 1) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && (data.Success || data.success)) {
            // Handle both possible response property names
            const tokenData = data.Data || data.data;
            if (tokenData && (tokenData.Token || tokenData.token)) {
                localStorage.setItem('jwtToken', tokenData.Token || tokenData.token);
                localStorage.setItem('userId', tokenData.UserId || tokenData.userId);
                localStorage.setItem('userEmail', tokenData.Email || tokenData.email);
                localStorage.setItem('userName', tokenData.UserName || tokenData.userName);

                // Log decoded token for debugging
                const token = tokenData.Token || tokenData.token;
                const parts = token.split('.');
                if (parts.length === 3) {
                    try {
                        const payload = JSON.parse(atob(parts[1]));
                        console.log('🔑 Token decoded successfully');
                        console.log('📊 Token Payload:', payload);
                        console.log('📋 All Claims Keys:', Object.keys(payload));
                    } catch (e) {
                        console.error('Failed to decode token:', e);
                    }
                }

                console.log('Login successful. Token stored.', tokenData);
                showToast('✓ Login successful!', 'success');
                document.getElementById('login-form-modal').reset();
                closeAuthModal();
                updateAuthUI();
                loadInitialData();
            } else {
                showToast('❌ No token in response', 'error');
                console.error('Token data:', tokenData);
            }
        } else {
            // Handle specific error messages
            let errorMessage = data.Message || data.message || 'Login failed';

            if (response.status === 401 || response.status === 400) {
                errorMessage = '❌ Invalid email or password. Please try again.';
            } else if (response.status === 500) {
                errorMessage = '❌ Server error. Please try again later.';
            }

            showToast(errorMessage, 'error');
            console.error('Login response:', data);
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('❌ Network error: Unable to connect to server', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!username || !email || !password || !confirm) {
        showToast('⚠️ Please fill in all fields', 'error');
        return;
    }

    if (password !== confirm) {
        showToast('❌ Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('❌ Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: username, email, password })
        });

        const data = await response.json();

        if (response.ok && (data.Success || data.success)) {
            showToast('✓ Registration successful! Please login.', 'success');
            document.getElementById('register-form-modal').reset();
            toggleAuthTab('login');
        } else {
            // Handle specific error messages
            let errorMessage = data.Message || data.message || 'Registration failed';

            if (response.status === 400) {
                if (errorMessage.toLowerCase().includes('email')) {
                    errorMessage = '❌ Email already registered. Please use a different email or try logging in.';
                } else if (errorMessage.toLowerCase().includes('username')) {
                    errorMessage = '❌ Username already taken. Please choose another username.';
                } else if (errorMessage.toLowerCase().includes('password')) {
                    errorMessage = '❌ Password does not meet requirements. Must be at least 6 characters.';
                } else {
                    errorMessage = '❌ ' + errorMessage;
                }
            } else if (response.status === 500) {
                errorMessage = '❌ Server error. Please try again later.';
            }

            showToast(errorMessage, 'error');
            console.error('Registration response:', data);
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('❌ Network error: Unable to connect to server', 'error');
    }
}

function logout() {
    localStorage.removeItem('jwtToken');
    currentUser = null;
    cart = [];
    selectedRestaurantId = null;

    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('login-form-modal').reset();
    document.getElementById('register-form-modal').reset();

    updateAuthUI();
    showView('restaurants');
    showToast('Logged out successfully', 'success');
}

// ============================================
// VIEW MANAGEMENT FUNCTIONS
// ============================================

function updateAuthUI() {
    const isLogged = isLoggedIn();
    const floatingBtn = document.getElementById('floating-auth-btn');
    const loginNavBtn = document.getElementById('login-nav-btn');
    const logoutNavBtn = document.getElementById('logout-nav-btn');
    const cartNavBtn = document.getElementById('cart-nav-btn');
    const ordersNavBtn = document.getElementById('orders-nav-btn');
    const profileNavBtn = document.getElementById('profile-nav-btn');
    const adminNavBtn = document.getElementById('admin-nav-btn');
    const loginBanner = document.getElementById('login-banner');

    console.log('🔄 updateAuthUI() called - isLogged:', isLogged);

    if (isLogged) {
        // User is logged in - show authenticated UI
        if (floatingBtn) floatingBtn.style.display = 'none';
        if (loginNavBtn) loginNavBtn.style.display = 'none';
        if (logoutNavBtn) logoutNavBtn.style.display = 'block';
        if (cartNavBtn) cartNavBtn.style.display = 'block';
        if (ordersNavBtn) ordersNavBtn.style.display = 'block';
        if (profileNavBtn) profileNavBtn.style.display = 'block';
        if (loginBanner) loginBanner.style.display = 'none';

        // Check if user is admin by checking token
        checkAdminAccess();
    } else {
        // User not logged in - show anonymous UI
        if (floatingBtn) floatingBtn.style.display = 'flex';
        if (loginNavBtn) loginNavBtn.style.display = 'block';
        if (logoutNavBtn) logoutNavBtn.style.display = 'none';
        if (cartNavBtn) cartNavBtn.style.display = 'none';
        if (ordersNavBtn) ordersNavBtn.style.display = 'none';
        if (profileNavBtn) profileNavBtn.style.display = 'none';
        if (adminNavBtn) adminNavBtn.style.display = 'none';
        if (loginBanner) loginBanner.style.display = 'flex';
    }
}

function showAppSection() {
    document.getElementById('app-section').style.display = 'block';
}

function showView(viewName) {
    // For protected views, check auth
    if (['cart', 'orders', 'profile', 'admin'].includes(viewName)) {
        if (!isLoggedIn()) {
            showToast('Please login to access this section', 'warning');
            toggleAuthModal();
            return;
        }
    }

    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });

    // Show selected view
    const viewId = `view-${viewName}`;
    const view = document.getElementById(viewId);
    if (view) {
        view.style.display = 'block';
        console.log(`✓ Showing view: ${viewId}`);
    } else {
        console.log(`✗ View not found: ${viewId}`);
    }

    // Load data based on view
    if (viewName === 'restaurants') {
        loadRestaurants();
    } else if (viewName === 'cart') {
        loadCartFromBackend(); // Load from backend first, which calls displayCart()
    } else if (viewName === 'orders') {
        loadOrders();
    } else if (viewName === 'profile') {
        loadAddresses();
    } else if (viewName === 'admin') {
        console.log('📊 Loading admin dashboard');
        // Just verify they're admin, the form is already in the HTML
        checkAdminAccess();
    }
}

// ============================================
// RESTAURANTS & MENUS FUNCTIONS
// ============================================

async function loadRestaurants() {
    const token = localStorage.getItem('jwtToken');
    const listElement = document.getElementById('restaurants-list');

    if (!listElement) return;

    listElement.innerHTML = '<p>Loading restaurants...</p>';

    try {
        const response = await fetch(`${apiUrl}/restaurants`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        listElement.innerHTML = '';

        if (data.Success || data.success) {
            const restaurants = data.Data || data.data;
            restaurants.forEach(restaurant => {
                const card = document.createElement('div');
                card.className = 'card';
                const imageHtml = restaurant.imagePath ? 
                    `<img src="/uploads/${restaurant.imagePath}" alt="${restaurant.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : 
                    '<div style="width: 100%; height: 200px; background: #f0f0f0; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">No Image</div>';
                card.innerHTML = `
                    ${imageHtml}
                    <h3>${restaurant.name}</h3>
                    <p>${restaurant.address}</p>
                    <button onclick="loadMenu(${restaurant.id})" class="btn-primary">View Menu</button>
                `;
                listElement.appendChild(card);
            });
        } else {
            listElement.innerHTML = '<p>Failed to load restaurants</p>';
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        listElement.innerHTML = '<p>Error loading restaurants</p>';
    }
}

async function loadMenu(restaurantId) {
    selectedRestaurantId = restaurantId;
    const token = localStorage.getItem('jwtToken');
    const menuList = document.getElementById('menu-list');
    const menuContainer = document.getElementById('menu-container');

    if (!menuList || !menuContainer) return;

    try {
        const response = await fetch(`${apiUrl}/menu/restaurant/${restaurantId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        menuList.innerHTML = '';

        if (data.Success || data.success) {
            const items = data.Data || data.data;
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card';
                const imageHtml = item.imagePath ? 
                    `<img src="/uploads/${item.imagePath}" alt="${item.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : 
                    '<div style="width: 100%; height: 150px; background: #f0f0f0; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">No Image</div>';
                card.innerHTML = `
                    ${imageHtml}
                    <h4>${item.name}</h4>
                    <p>${item.description || ''}</p>
                    <p><strong>$${item.price}</strong></p>
                    <input type="number" min="1" value="1" id="qty-${item.id}" style="width: 50px;">
                    <button onclick="addToCart(${item.id}, ${item.price}, '${item.name}')" class="btn-primary">Add to Cart</button>
                `;
                menuList.appendChild(card);
            });

            document.getElementById('menu-title').textContent = `Menu`;
            menuContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        showToast('Error loading menu', 'error');
    }
}

async function searchRestaurants() {
    const query = document.getElementById('search-rest').value;
    if (!query) {
        loadRestaurants();
        return;
    }

    const token = localStorage.getItem('jwtToken');
    const listElement = document.getElementById('restaurants-list');

    try {
        const response = await fetch(`${apiUrl}/restaurants/search?name=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        listElement.innerHTML = '';

        if (data.Success || data.success) {
            const restaurants = data.Data || data.data || [];
            if (restaurants.length === 0) {
                listElement.innerHTML = '<p>No restaurants found</p>';
                return;
            }

            restaurants.forEach(restaurant => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>${restaurant.name}</h3>
                    <p>${restaurant.address}</p>
                    <button onclick="loadMenu(${restaurant.id})" class="btn-primary">View Menu</button>
                `;
                listElement.appendChild(card);
            });
        } else {
            listElement.innerHTML = '<p>No restaurants found</p>';
        }
    } catch (error) {
        console.error('Error searching restaurants:', error);
        showToast('Error searching restaurants', 'error');
    }
}

async function searchMenus() {
    const query = document.getElementById('search-menu').value;
    if (!query) {
        showToast('Please enter a search term', 'warning');
        return;
    }

    const token = localStorage.getItem('jwtToken');
    const menuList = document.getElementById('menu-list');
    const menuContainer = document.getElementById('menu-container');

    try {
        const response = await fetch(`${apiUrl}/menu/search?name=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        menuList.innerHTML = '';

        if (data.Success || data.success) {
            const items = data.Data || data.data || [];
            if (items.length === 0) {
                menuList.innerHTML = '<p>No items found</p>';
                menuContainer.style.display = 'block';
                return;
            }

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h4>${item.name}</h4>
                    <p>${item.description || ''}</p>
                    <p><strong>$${item.price}</strong></p>
                    <input type="number" min="1" value="1" id="qty-${item.id}" style="width: 50px;">
                    <button onclick="addToCart(${item.id}, ${item.price}, '${item.name}')" class="btn-primary">Add to Cart</button>
                `;
                menuList.appendChild(card);
            });

            document.getElementById('menu-title').textContent = `Search Results`;
            menuContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('Error searching menus:', error);
        showToast('Error searching menus', 'error');
    }
}

// ============================================
// CART FUNCTIONS
// ============================================

async function addToCart(itemId, price, name) {
    if (!isLoggedIn()) {
        showToast('Please login to add items to cart', 'warning');
        toggleAuthModal();
        return;
    }

    const quantity = parseInt(document.getElementById(`qty-${itemId}`).value) || 1;

    try {
        const response = await fetch(`${apiUrl}/cart/items`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                menuItemId: itemId,
                quantity: quantity
            })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            showToast(`${name} added to cart!`, 'success');
            // Refresh cart display from backend
            loadCartFromBackend();
        } else {
            showToast(data.Message || data.message || 'Failed to add item to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Error adding item to cart', 'error');
    }
}

async function loadCartFromBackend() {
    console.log('🛒 Loading cart from backend...');
    try {
        const response = await fetch(`${apiUrl}/cart`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Full cart response:', JSON.stringify(data, null, 2));

        if (data.Success || data.success) {
            // Handle both data.Data or data.data (case-insensitive)
            let cartData = data.Data || data.data;
            console.log('CartData object:', cartData);

            // Check if cartData exists and has Items
            if (cartData) {
                let items = cartData.Items || cartData.items || [];
                console.log('Items array:', items);

                if (items && items.length > 0) {
                    // Map items properly
                    cart = items.map(item => ({
                        itemId: item.MenuItemId || item.menuItemId,
                        name: item.Name || item.name,
                        price: item.Price || item.price,
                        quantity: item.Quantity || item.quantity
                    }));
                    console.log('✅ Mapped cart items:', JSON.stringify(cart, null, 2));
                } else {
                    console.log('No items in array, setting cart to empty');
                    cart = [];
                }
            } else {
                console.log('CartData is null/undefined, setting cart to empty');
                cart = [];
            }
            console.log('Final cart array before displayCart:', cart);
            displayCart();
        } else {
            console.log('Response not successful, data:', data);
            cart = [];
            displayCart();
        }
    } catch (error) {
        console.error('Error loading cart from backend:', error);
        cart = [];
        displayCart();
    }
}

function displayCart() {
    console.log('📍 displayCart() called');
    console.log('Current cart array:', cart);

    const cartItemsDiv = document.getElementById('cart-items');
    const checkoutAddressSelect = document.getElementById('checkout-address');

    if (!cartItemsDiv) {
        console.log('❌ cart-items div not found');
        return;
    }

    if (cart.length === 0) {
        console.log('Cart is empty, showing empty message');
        cartItemsDiv.innerHTML = '<p>Your cart is empty</p>';
        return;
    }

    console.log(`Cart has ${cart.length} items`);
    cartItemsDiv.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        console.log(`Processing item ${index}:`, item);
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'card';
        cartItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4>${item.name}</h4>
                    <p>$${item.price} x ${item.quantity} = $${itemTotal.toFixed(2)}</p>
                </div>
                <button onclick="removeFromCart(${index})" class="btn-accent">Remove</button>
            </div>
        `;
        cartItemsDiv.appendChild(cartItem);
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'card';
    totalDiv.style.fontWeight = 'bold';
    totalDiv.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
    cartItemsDiv.appendChild(totalDiv);
    console.log(`✅ Cart displayed with total: $${total.toFixed(2)}`);

    loadAddressesForCheckout();
}

function removeFromCart(index) {
    const itemToRemove = cart[index];
    if (!itemToRemove) return;

    const menuItemId = itemToRemove.itemId;

    // Call backend API to remove item from cart
    fetch(`${apiUrl}/cart/items/${menuItemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (data.Success || data.success) {
            cart.splice(index, 1);
            displayCart();
            showToast('Item removed from cart', 'info');
        } else {
            showToast(data.Message || data.message || 'Failed to remove item', 'error');
        }
    })
    .catch(error => {
        console.error('Error removing from cart:', error);
        showToast('Error removing item from cart', 'error');
    });
}

async function loadAddressesForCheckout() {
    const token = localStorage.getItem('jwtToken');
    const select = document.getElementById('checkout-address');
    const checkoutBtn = document.querySelector('[onclick="checkout()"]');

    if (!select) return;

    try {
        const response = await fetch(`${apiUrl}/addresses`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        console.log('📍 Addresses response status:', response.status);
        const data = await response.json();
        select.innerHTML = '';

        if (!response.ok) {
            console.error('Failed to load addresses:', data);
            select.innerHTML = '<option value="">Error loading addresses</option>';
            if (checkoutBtn) checkoutBtn.disabled = true;
            showToast('Failed to load addresses', 'error');
            return;
        }

        if (data.Success || data.success) {
            const addresses = data.Data || data.data || [];
            console.log('📍 Addresses loaded:', addresses.length);

            if (addresses.length === 0) {
                // No addresses - prevent checkout
                select.innerHTML = '<option value="">No addresses. Add one in Profile first!</option>';
                if (checkoutBtn) checkoutBtn.disabled = true;
                showToast('⚠️ Add a delivery address in your Profile before checkout', 'warning');
                console.warn('No addresses available for checkout');
                return;
            }

            addresses.forEach(addr => {
                const option = document.createElement('option');
                option.value = addr.id;
                option.textContent = `${addr.city}, ${addr.street}`;
                select.appendChild(option);
            });

            if (checkoutBtn) checkoutBtn.disabled = false;
        } else {
            select.innerHTML = '<option value="">Error: Could not load addresses</option>';
            if (checkoutBtn) checkoutBtn.disabled = true;
        }
    } catch (error) {
        console.error('Error loading addresses:', error);
        select.innerHTML = '<option value="">Network error</option>';
        if (checkoutBtn) checkoutBtn.disabled = true;
        showToast('Network error loading addresses', 'error');
    }
}

async function checkout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const addressId = document.getElementById('checkout-address').value;
    if (!addressId) {
        showToast('Please select a delivery address', 'error');
        return;
    }

    // Disable button during checkout
    const checkoutBtn = event?.target;
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = '⏳ Placing order...';
    }

    const token = localStorage.getItem('jwtToken');

    try {
        console.log('🛒 Attempting checkout with addressId:', addressId);
        console.log('📦 Cart items:', JSON.stringify(cart, null, 2));

        // Backend CreateOrderRequestDTO only expects AddressId
        const response = await fetch(`${apiUrl}/orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                addressId: parseInt(addressId)
            })
        });

        console.log('📊 Response status:', response.status);
        console.log('📦 Response OK:', response.ok);

        // Check HTTP status first
        if (!response.ok) {
            let data;
            try {
                data = await response.json();
            } catch (e) {
                data = { Message: `HTTP ${response.status}: ${response.statusText}` };
            }

            let errorMsg = data.Message || data.message || 'Checkout failed';

            if (response.status === 400) {
                errorMsg = '❌ Invalid request: ' + errorMsg;
            } else if (response.status === 401) {
                errorMsg = '❌ Session expired. Please login again.';
                setTimeout(() => logout(), 1500);
            } else if (response.status === 403) {
                errorMsg = '❌ You do not have permission to place this order.';
            } else if (response.status === 500) {
                errorMsg = '❌ Server error. Please try again later.';
            }

            console.error('❌ Checkout error response:', data);
            showToast(errorMsg, 'error');
            return;
        }

        const data = await response.json();
        console.log('✅ Order response:', JSON.stringify(data, null, 2));

        if (data.Success || data.success) {
            cart = [];
            showToast('✅ Order placed successfully!', 'success');
            setTimeout(() => {
                showView('orders');
                loadOrders();
            }, 1000);
        } else {
            showToast(data.Message || data.message || 'Order creation failed', 'error');
            console.error('❌ Order failed:', data);
        }
    } catch (error) {
        console.error('💥 Checkout exception:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    } finally {
        // Re-enable button
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Place Order';
        }
    }
}

// ============================================
// ORDERS FUNCTIONS
// ============================================

async function loadOrders() {
    const token = localStorage.getItem('jwtToken');
    const ordersDiv = document.getElementById('my-orders-list');

    if (!ordersDiv) return;

    ordersDiv.innerHTML = '<p>Loading orders...</p>';

    try {
        // Changed from /api/orders to /api/orders/my to get user's own orders
        const response = await fetch(`${apiUrl}/orders/my`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        ordersDiv.innerHTML = '';

        if (data.Success || data.success) {
            const orders = data.Data || data.data || [];

            if (orders.length === 0) {
                ordersDiv.innerHTML = '<p>No orders yet</p>';
                return;
            }

            orders.forEach(order => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>Order #${order.id}</h3>
                    <p>Status: ${order.status}</p>
                    <p>Total: $${order.total}</p>
                    <p>Date: ${new Date(order.createdAt).toLocaleString()}</p>
                `;
                ordersDiv.appendChild(card);
            });
        } else {
            ordersDiv.innerHTML = '<p>Could not load orders</p>';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersDiv.innerHTML = '<p>Error loading orders</p>';
    }
}

// ============================================
// ADDRESS FUNCTIONS
// ============================================

async function loadAddresses() {
    const token = localStorage.getItem('jwtToken');
    const addressesDiv = document.getElementById('addresses-list');

    if (!addressesDiv) return;

    try {
        const response = await fetch(`${apiUrl}/addresses`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        addressesDiv.innerHTML = '';

        if (data.Success || data.success) {
            const addresses = data.Data || data.data || [];

            if (addresses.length === 0) {
                addressesDiv.innerHTML = '<p>No addresses added yet</p>';
                return;
            }

            addresses.forEach(addr => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h4>${addr.city}, ${addr.street}</h4>
                    <button onclick="deleteAddress(${addr.id})" class="btn-accent">Delete</button>
                `;
                addressesDiv.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading addresses:', error);
    }
}

async function addAddress() {
    const city = document.getElementById('addr-city').value;
    const street = document.getElementById('addr-street').value;

    if (!city || !street) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/addresses`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ city, street })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            document.getElementById('addr-city').value = '';
            document.getElementById('addr-street').value = '';
            showToast('Address added successfully!', 'success');
            loadAddresses();
        } else {
            showToast(data.Message || data.message || 'Failed to add address', 'error');
        }
    } catch (error) {
        console.error('Error adding address:', error);
        showToast('Error adding address', 'error');
    }
}

async function deleteAddress(addressId) {
    if (!confirm('Are you sure you want to delete this address?')) return;

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/addresses/${addressId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.Success || data.success) {
            showToast('Address deleted successfully', 'success');
            loadAddresses();
        } else {
            showToast(data.Message || data.message || 'Failed to delete address', 'error');
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        showToast('Error deleting address', 'error');
    }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

async function checkAdminAccess() {
    const token = localStorage.getItem('jwtToken');
    const adminBtn = document.getElementById('admin-nav-btn');

    console.log('🔍 checkAdminAccess() called');
    console.log('Token exists:', !!token);
    console.log('Admin button element exists:', !!adminBtn);

    if (!token || !adminBtn) {
        console.log('Admin check: No token or admin button found');
        return;
    }

    try {
        // Decode JWT token (without verification, since we're client-side)
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.warn('Invalid token format');
            adminBtn.style.display = 'none';
            return;
        }

        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        console.log('Full Token payload:', payload);
        console.log('All keys in payload:', Object.keys(payload));

        // Check if user has Admin role
        // The role claim can be a string (single role) or array (multiple roles)
        // First try the standard Microsoft role claim
        let roles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

        // If not found, log what we're looking for and what we found
        if (!roles) {
            console.log('Standard role claim not found. Looking for alternative formats...');
            // Check for other possible role claim formats
            roles = payload['role'] || payload['roles'] || payload['Role'];
            console.log('Alternative role formats found:', roles);
        }

        console.log('Role value:', roles, 'Type:', typeof roles);

        if (roles) {
            const isAdmin = Array.isArray(roles) ? roles.includes('Admin') : roles === 'Admin';
            console.log('Is Admin check result:', isAdmin);
            if (isAdmin) {
                console.log('✓ User is Admin - showing admin button');
                console.log('Setting display to block on element:', adminBtn);
                adminBtn.style.display = 'block';
                console.log('✅ Admin button should now be visible!');
            } else {
                console.log('✗ User is not Admin - hiding admin button. Roles:', roles);
                adminBtn.style.display = 'none';
            }
        } else {
            console.log('✗ No role claim found in token');
            adminBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        adminBtn.style.display = 'none';
    }
}

// RESTAURANTS ADMIN
async function adminAddRestaurant() {
    console.log('🍽️ adminAddRestaurant() called');
    const name = document.getElementById('adm-rest-name');
    const address = document.getElementById('adm-rest-address');

    if (!name || !address) {
        console.error('✗ Form elements not found');
        showToast('ERROR: Form elements not found', 'error');
        return;
    }

    const nameVal = name.value;
    const addressVal = address.value;

    if (!nameVal || !addressVal) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');
    if (!token) {
        showToast('ERROR: No token found. Please login again.', 'error');
        console.error('No JWT token found');
        return;
    }

    console.log(`Adding restaurant: ${nameVal}, ${addressVal}`);

    try {
        const url = `${apiUrl}/admin/restaurants`;
        console.log(`POST ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name: nameVal, address: addressVal })
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            console.error('API Error:', response.status, data);
            showToast(`❌ Error: ${data.Message || data.message || 'Failed to add restaurant'}`, 'error');
            return;
        }

        if (data.Success || data.success) {
            name.value = '';
            address.value = '';
            showToast('✅ Restaurant added successfully!', 'success');
            console.log('✓ Restaurant added');
        } else {
            showToast(data.Message || data.message || 'Failed to add restaurant', 'error');
        }
    } catch (error) {
        console.error('Error adding restaurant:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

async function adminUpdateRestaurant() {
    const id = parseInt(document.getElementById('adm-rest-id').value);
    const name = document.getElementById('adm-rest-name').value;
    const address = document.getElementById('adm-rest-address').value;

    if (!id || !name || !address) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/admin/restaurants/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id, name, address })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            document.getElementById('adm-rest-id').value = '';
            document.getElementById('adm-rest-name').value = '';
            document.getElementById('adm-rest-address').value = '';
            showToast('Restaurant updated successfully!', 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to update restaurant', 'error');
        }
    } catch (error) {
        console.error('Error updating restaurant:', error);
        showToast('Error updating restaurant', 'error');
    }
}

async function adminDeleteRestaurant() {
    const id = parseInt(document.getElementById('adm-rest-id').value);

    if (!id) {
        showToast('Please enter restaurant ID', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this restaurant?')) return;

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/admin/restaurants/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.Success || data.success) {
            document.getElementById('adm-rest-id').value = '';
            document.getElementById('adm-rest-name').value = '';
            document.getElementById('adm-rest-address').value = '';
            showToast('Restaurant deleted successfully!', 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to delete restaurant', 'error');
        }
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        showToast('Error deleting restaurant', 'error');
    }
}

// MENU ITEMS ADMIN
async function adminAddMenuItem() {
    console.log('📋 adminAddMenuItem() called');

    const restId = parseInt(document.getElementById('adm-menu-restId').value);
    const catId = parseInt(document.getElementById('adm-menu-catId').value);
    const name = document.getElementById('adm-menu-name').value;
    const price = parseFloat(document.getElementById('adm-menu-price').value);
    const available = document.getElementById('adm-menu-avail').checked;

    console.log(`Form values: restId=${restId}, catId=${catId}, name=${name}, price=${price}, available=${available}`);

    if (!restId || !catId || !name || !price) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');
    if (!token) {
        showToast('ERROR: No token found. Please login again.', 'error');
        return;
    }

    try {
        const payload = {
            restaurantId: restId,
            categoryId: catId,
            name,
            price,
            isAvailable: available
        };

        console.log('POST to /admin/menuitems with payload:', payload);

        const response = await fetch(`${apiUrl}/admin/menuitems`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            console.error('API Error:', response.status, data);
            showToast(`❌ Error: ${data.Message || data.message || 'Failed to add menu item'}`, 'error');
            return;
        }

        if (data.Success || data.success) {
            document.getElementById('adm-menu-restId').value = '';
            document.getElementById('adm-menu-catId').value = '';
            document.getElementById('adm-menu-name').value = '';
            document.getElementById('adm-menu-price').value = '';
            document.getElementById('adm-menu-avail').checked = false;
            showToast('✅ Menu item added successfully!', 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to add menu item', 'error');
        }
    } catch (error) {
        console.error('Error adding menu item:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

async function adminUpdateMenuItem() {
    const id = parseInt(document.getElementById('adm-menu-id').value);
    const restId = parseInt(document.getElementById('adm-menu-restId').value);
    const catId = parseInt(document.getElementById('adm-menu-catId').value);
    const name = document.getElementById('adm-menu-name').value;
    const price = parseFloat(document.getElementById('adm-menu-price').value);
    const available = document.getElementById('adm-menu-avail').checked;

    if (!id || !restId || !catId || !name || !price) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/admin/menuitems/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id,
                restaurantId: restId,
                categoryId: catId,
                name,
                price,
                isAvailable: available
            })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            showToast('Menu item updated successfully!', 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to update menu item', 'error');
        }
    } catch (error) {
        console.error('Error updating menu item:', error);
        showToast('Error updating menu item', 'error');
    }
}

async function adminDeleteMenuItem() {
    const id = parseInt(document.getElementById('adm-menu-id').value);

    if (!id) {
        showToast('Please enter menu item ID', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this menu item?')) return;

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/admin/menuitems/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.Success || data.success) {
            document.getElementById('adm-menu-id').value = '';
            showToast('Menu item deleted successfully!', 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to delete menu item', 'error');
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        showToast('Error deleting menu item', 'error');
    }
}

// CATEGORIES ADMIN
async function adminAddCategory() {
    const name = document.getElementById('adm-cat-name').value;

    if (!name) {
        showToast('Please enter category name', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/admin/categories`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            document.getElementById('adm-cat-name').value = '';
            showToast('Category added successfully!', 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to add category', 'error');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showToast('Error adding category', 'error');
    }
}

async function adminViewAllOrders() {
    const token = localStorage.getItem('jwtToken');
    const ordersDiv = document.getElementById('admin-orders-container');

    if (!ordersDiv) return;

    ordersDiv.innerHTML = '<p>Loading orders...</p>';

    try {
        const response = await fetch(`${apiUrl}/orders`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        ordersDiv.innerHTML = '';

        if (data.Success || data.success) {
            const orders = data.Data || data.data || [];

            if (orders.length === 0) {
                ordersDiv.innerHTML = '<p>No orders</p>';
                return;
            }

            orders.forEach(order => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h4>Order #${order.id}</h4>
                    <p>Customer: ${order.customerName}</p>
                    <p>Status: ${order.status}</p>
                    <p>Total: $${order.total}</p>
                `;
                ordersDiv.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function adminLoadAllOrders() {
    const token = localStorage.getItem('jwtToken');
    const ordersDiv = document.getElementById('admin-orders-list');

    if (!ordersDiv) return;

    ordersDiv.innerHTML = '<p>Loading orders...</p>';

    try {
        const response = await fetch(`${apiUrl}/orders`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        ordersDiv.innerHTML = '';

        if (data.Success || data.success) {
            const orders = data.Data || data.data || [];

            if (orders.length === 0) {
                ordersDiv.innerHTML = '<p>No orders</p>';
                return;
            }

            orders.forEach(order => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4>Order #${order.id}</h4>
                            <p>Customer ID: ${order.customerId}</p>
                            <p>Status: ${order.orderStatus}</p>
                            <p>Total: $${order.total ? order.total.toFixed(2) : '0.00'}</p>
                            <p>Order Date: ${new Date(order.orderDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                `;
                ordersDiv.appendChild(card);
            });
        } else {
            ordersDiv.innerHTML = `<p>Error: ${data.Message || data.message || 'Failed to load orders'}</p>`;
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersDiv.innerHTML = '<p>Error loading orders</p>';
    }
}

async function adminUpdateOrderStatus() {
    const orderId = document.getElementById('adm-ord-id').value;
    const statusValue = document.getElementById('adm-ord-status').value;

    if (!orderId) {
        showToast('Please enter an Order ID', 'warning');
        return;
    }

    if (!statusValue) {
        showToast('Please select a status', 'warning');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: parseInt(statusValue) })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            showToast('Order status updated successfully!', 'success');
            document.getElementById('adm-ord-id').value = '';
            adminLoadAllOrders(); // Refresh the orders list
        } else {
            showToast(data.Message || data.message || 'Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('Error updating order status', 'error');
    }
}

// ============================================
// IMAGE UPLOAD FUNCTIONS
// ============================================

async function uploadProfileImage() {
    const fileInput = document.getElementById('profile-image-input');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Please select an image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const token = localStorage.getItem('jwtToken');
        const response = await fetch(`${apiUrl}/users/profile-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.Success) {
            showToast('Profile image uploaded successfully', 'success');
            // Display the image
            const imagePreview = document.getElementById('profile-image-preview');
            imagePreview.src = `/uploads/${data.Data.ImagePath}`;
            imagePreview.style.display = 'block';
            fileInput.value = '';
        } else {
            showToast(data.Message || 'Failed to upload image', 'error');
        }
    } catch (error) {
        console.error('Error uploading profile image:', error);
        showToast('Error uploading image', 'error');
    }
}

async function uploadRestaurantImage() {
    const restaurantId = document.getElementById('adm-rest-img-id').value;
    const fileInput = document.getElementById('adm-rest-image-input');
    const file = fileInput.files[0];

    if (!restaurantId) {
        showToast('Please enter restaurant ID', 'error');
        return;
    }

    if (!file) {
        showToast('Please select an image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`${apiUrl}/admin/restaurants/${restaurantId}/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.Success) {
            showToast('Restaurant image uploaded successfully', 'success');
            document.getElementById('adm-rest-img-id').value = '';
            fileInput.value = '';
            loadRestaurants(); // Refresh restaurants list
        } else {
            showToast(data.Message || 'Failed to upload image', 'error');
        }
    } catch (error) {
        console.error('Error uploading restaurant image:', error);
        showToast('Error uploading image', 'error');
    }
}

async function uploadMenuItemImage() {
    const menuItemId = document.getElementById('adm-menu-img-id').value;
    const fileInput = document.getElementById('adm-menu-image-input');
    const file = fileInput.files[0];

    if (!menuItemId) {
        showToast('Please enter menu item ID', 'error');
        return;
    }

    if (!file) {
        showToast('Please select an image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`${apiUrl}/admin/menuitems/${menuItemId}/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.Success) {
            showToast('Menu item image uploaded successfully', 'success');
            document.getElementById('adm-menu-img-id').value = '';
            fileInput.value = '';
            loadMenu(selectedRestaurantId); // Refresh menu
        } else {
            showToast(data.Message || 'Failed to upload image', 'error');
        }
    } catch (error) {
        console.error('Error uploading menu item image:', error);
        showToast('Error uploading image', 'error');
    }
}

// ============================================
// INITIALIZATION
// ============================================

function loadInitialData() {
    loadRestaurants();
    if (isLoggedIn()) {
        loadUserProfile();
        loadCartFromBackend();  // Load cart from backend on page init
    }
}

async function loadUserProfile() {
    try {
        const response = await fetch(`${apiUrl}/users/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        const data = await response.json();
        if (data.Success && data.Data.ProfileImagePath) {
            const imagePreview = document.getElementById('profile-image-preview');
            if (imagePreview) {
                imagePreview.src = `/uploads/${data.Data.ProfileImagePath}`;
                imagePreview.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Check if user is logged in on page load
window.addEventListener('load', () => {
    // Always show app section with restaurants
    showAppSection();
    updateAuthUI();
    loadInitialData();

    // Close modal when clicking outside
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAuthModal();
            }
        });
    }
});

// Debug helper function for console - can be called as: debugAdminToken()
window.debugAdminToken = function() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.log('❌ No token found in localStorage');
        return;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        console.log('❌ Invalid token format');
        return;
    }

    try {
        const payload = JSON.parse(atob(parts[1]));
        console.log('=== TOKEN DEBUG INFO ===');
        console.log('Token exists: ✓');
        console.log('Full Payload:', payload);
        console.log('All Claim Keys:', Object.keys(payload));

        const roleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
        const roles = payload[roleKey];
        console.log(`Role Claim (${roleKey}):`, roles);

        if (roles) {
            const isAdmin = Array.isArray(roles) ? roles.includes('Admin') : roles === 'Admin';
            console.log('Is Admin?', isAdmin ? '✓ YES' : '✗ NO');
        } else {
            console.log('No role claim found');
        }
        console.log('========================');
    } catch (e) {
        console.error('Error decoding token:', e);
    }
};

// Test functions for debugging
window.testAdminButton = function() {
    const btn = document.getElementById('admin-nav-btn');
    console.log('=== ADMIN BUTTON TEST ===');
    console.log('Button element:', btn);
    console.log('Button exists:', !!btn);
    if (btn) {
        console.log('Current display:', window.getComputedStyle(btn).display);
        console.log('Inline display:', btn.style.display);
        btn.style.display = 'block !important';
        console.log('After forcing display=block:', window.getComputedStyle(btn).display);
    }
    console.log('=========================');
};

window.testAdminView = function() {
    const view = document.getElementById('view-admin');
    console.log('=== ADMIN VIEW TEST ===');
    console.log('View element:', view);
    console.log('View exists:', !!view);
    if (view) {
        console.log('View HTML content length:', view.innerHTML.length);
        console.log('View children count:', view.children.length);
        view.style.display = 'block !important';
        console.log('After forcing display=block');
    }
    console.log('========================');
};

window.testAdminForm = function() {
    console.log('=== ADMIN FORM ELEMENTS TEST ===');
    const fields = [
        'adm-rest-id', 'adm-rest-name', 'adm-rest-address',
        'adm-menu-id', 'adm-menu-restId', 'adm-menu-catId', 'adm-menu-name', 'adm-menu-price', 'adm-menu-avail'
    ];
    fields.forEach(id => {
        const elem = document.getElementById(id);
        console.log(`${id}: ${elem ? '✓ EXISTS' : '✗ MISSING'}`);
    });
    console.log('=================================');
};

window.forceShowAdmin = function() {
    console.log('🚀 FORCING ADMIN UI TO SHOW...');
    const adminBtn = document.getElementById('admin-nav-btn');
    const adminView = document.getElementById('view-admin');

    if (adminBtn) {
        adminBtn.style.display = 'block !important';
        console.log('✓ Admin button forced to display');
    }
    if (adminView) {
        adminView.style.display = 'block !important';
        console.log('✓ Admin view forced to display');
    }

    // Hide other views
    document.querySelectorAll('.view').forEach(v => {
        if (v.id !== 'view-admin') v.style.display = 'none';
    });

    console.log('✅ Admin interface should now be visible!');
};

