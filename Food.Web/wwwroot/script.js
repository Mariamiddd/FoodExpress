const apiUrl = '/api';

// APP STATE
let currentUser = null;
let cart = [];
let selectedRestaurantId = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    toast.style.display = 'block';
    toast.style.visibility = 'visible';

    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
        toast.style.display = 'none';
        toast.classList.remove('show');
    }, 3500);
}

function getAuthHeaders() {
    const token = localStorage.getItem('jwtToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = {};
    if (text && text.trim()) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { Message: text };
        }
    }

    const headers = options.headers || {};
    const hadToken = !!(headers.Authorization || headers.authorization);
    if (response.status === 401 && hadToken) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        currentUser = null;
        cart = [];
        selectedRestaurantId = null;
        const modal = document.getElementById('auth-modal');
        if (modal) modal.style.display = 'none';
        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof showView === 'function') showView('restaurants');
        showToast('Session expired. Please log in again.', 'error');
        return { response, data, unauthorized: true };
    }

    return { response, data, unauthorized: false };
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
        tabs.forEach((t, idx) => t.classList.toggle('active', idx === 0));
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs.forEach((t, idx) => t.classList.toggle('active', idx === 1));
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            const tokenData = data.Data || data.data;
            const token = tokenData?.Token || tokenData?.token;
            if (token) {
                localStorage.setItem('jwtToken', token);
                localStorage.setItem('userId', tokenData.UserId || tokenData.userId || '');
                localStorage.setItem('userEmail', tokenData.Email || tokenData.email || '');
                localStorage.setItem('userName', tokenData.UserName || tokenData.userName || '');

                showToast('Login successful!', 'success');
                document.getElementById('login-form-modal').reset();
                closeAuthModal();
                updateAuthUI();
                loadInitialData();
            } else {
                showToast('No token in response', 'error');
            }
        } else {
            let errorMessage = data.Message || data.message || 'Invalid email or password.';
            showToast(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error: Unable to connect to server', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (!username || !email || !password || !confirm) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (password.length < 8) {
        showToast('Password must be at least 8 characters long (with uppercase, lowercase, number, and symbol)', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: username, email, password })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast('Registration successful! Please login.', 'success');
            document.getElementById('register-form-modal').reset();
            toggleAuthTab('login');
        } else {
            let errorMessage = data.Message || data.message || 'Registration failed';
            if (data.Errors || data.errors) {
                const errObj = data.Errors || data.errors;
                const firstKey = Object.keys(errObj)[0];
                if (firstKey && errObj[firstKey]?.length) {
                    errorMessage = errObj[firstKey][0];
                }
            }
            showToast(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('Network error: Unable to connect to server', 'error');
    }
}

function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    currentUser = null;
    cart = [];
    selectedRestaurantId = null;

    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('login-form-modal').reset();
    document.getElementById('register-form-modal').reset();

    updateAuthUI();
    showView('restaurants');
    showToast('Logged out successfully', 'info');
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

    if (isLogged) {
        if (floatingBtn) floatingBtn.style.display = 'none';
        if (loginNavBtn) loginNavBtn.style.display = 'none';
        if (logoutNavBtn) logoutNavBtn.style.display = 'block';
        if (cartNavBtn) cartNavBtn.style.display = 'block';
        if (ordersNavBtn) ordersNavBtn.style.display = 'block';
        if (profileNavBtn) profileNavBtn.style.display = 'block';
        if (loginBanner) loginBanner.style.display = 'none';
        checkAdminAccess();
    } else {
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
    if (['cart', 'orders', 'profile', 'admin'].includes(viewName)) {
        if (!isLoggedIn()) {
            showToast('Please login to access this section', 'info');
            toggleAuthModal();
            return;
        }
    }

    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });

    const view = document.getElementById(`view-${viewName}`);
    if (view) {
        view.style.display = 'block';
    }

    if (viewName === 'restaurants') {
        loadRestaurants();
    } else if (viewName === 'cart') {
        loadCartFromBackend();
    } else if (viewName === 'orders') {
        loadOrders();
    } else if (viewName === 'profile') {
        loadUserProfile();
        loadAddresses();
    } else if (viewName === 'admin') {
        checkAdminAccess();
        adminLoadAllOrders();
    }
}

// ============================================
// RESTAURANTS & MENUS FUNCTIONS
// ============================================

async function loadRestaurants() {
    const listElement = document.getElementById('restaurants-list');
    if (!listElement) return;

    listElement.innerHTML = '<p>Loading restaurants...</p>';

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/restaurants`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;
        listElement.innerHTML = '';

        if (data.Success || data.success) {
            const restaurants = data.Data || data.data || [];
            restaurants.forEach(restaurant => {
                const rId = restaurant.id || restaurant.Id;
                const rName = restaurant.name || restaurant.Name;
                const rAddress = restaurant.address || restaurant.Address;
                const rImg = restaurant.imagePath || restaurant.ImagePath;

                const card = document.createElement('div');
                card.className = 'card';
                const imageHtml = rImg
                    ? `<img src="/uploads/${rImg}" alt="${rName}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">`
                    : '<div style="width: 100%; height: 200px; background: #f0f0f0; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">No Image</div>';

                card.innerHTML = `
                    ${imageHtml}
                    <h3>${rName} <small style="font-size: 0.75rem; color: #888;">(ID: ${rId})</small></h3>
                    <p>${rAddress}</p>
                    <button onclick="loadMenu(${rId})" class="btn-primary">View Menu</button>
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
    const menuList = document.getElementById('menu-list');
    const menuContainer = document.getElementById('menu-container');

    if (!menuList || !menuContainer) return;

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/restaurants/${restaurantId}/menu`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;
        menuList.innerHTML = '';

        if (data.Success || data.success) {
            const items = data.Data || data.data || [];
            if (items.length === 0) {
                menuList.innerHTML = '<p>No menu items for this restaurant yet.</p>';
            }

            items.forEach(item => {
                const mId = item.id || item.Id;
                const mName = item.name || item.Name;
                const mPrice = item.price ?? item.Price ?? 0;
                const mImg = item.imagePath || item.ImagePath;
                const mAvail = item.isAvailable ?? item.IsAvailable ?? true;
                const safeName = String(mName).replace(/'/g, "\\'");

                const card = document.createElement('div');
                card.className = 'card';
                const imageHtml = mImg
                    ? `<img src="/uploads/${mImg}" alt="${mName}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">`
                    : '<div style="width: 100%; height: 150px; background: #f0f0f0; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">No Image</div>';

                card.innerHTML = `
                    ${imageHtml}
                    <h4>${mName} <small style="font-size: 0.75rem; color: #888;">(ID: ${mId})</small></h4>
                    <p><strong>$${Number(mPrice).toFixed(2)}</strong></p>
                    <input type="number" min="1" value="1" id="qty-${mId}" style="width: 70px;">
                    <button onclick="addToCart(${mId}, ${mPrice}, '${safeName}')" class="btn-primary" ${!mAvail ? 'disabled' : ''}>
                        ${mAvail ? 'Add to Cart' : 'Unavailable'}
                    </button>
                `;
                menuList.appendChild(card);
            });

            document.getElementById('menu-title').textContent = `Menu (Restaurant #${restaurantId})`;
            menuContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        showToast('Error loading menu', 'error');
    }
}

async function searchRestaurants() {
    const query = document.getElementById('search-rest').value.trim();
    if (!query) {
        loadRestaurants();
        return;
    }

    const listElement = document.getElementById('restaurants-list');

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/restaurants/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;
        listElement.innerHTML = '';

        if (data.Success || data.success) {
            const restaurants = data.Data || data.data || [];
            if (restaurants.length === 0) {
                listElement.innerHTML = '<p>No restaurants found</p>';
                return;
            }

            restaurants.forEach(restaurant => {
                const rId = restaurant.id || restaurant.Id;
                const rName = restaurant.name || restaurant.Name;
                const rAddress = restaurant.address || restaurant.Address;
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>${rName}</h3>
                    <p>${rAddress}</p>
                    <button onclick="loadMenu(${rId})" class="btn-primary">View Menu</button>
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
    const query = document.getElementById('search-menu').value.trim();
    if (!query) {
        showToast('Please enter a search term', 'info');
        return;
    }

    const menuList = document.getElementById('menu-list');
    const menuContainer = document.getElementById('menu-container');

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/menu/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;
        menuList.innerHTML = '';

        if (data.Success || data.success) {
            const items = data.Data || data.data || [];
            if (items.length === 0) {
                menuList.innerHTML = '<p>No items found</p>';
                menuContainer.style.display = 'block';
                return;
            }

            items.forEach(item => {
                const mId = item.id || item.Id;
                const mName = item.name || item.Name;
                const mPrice = item.price ?? item.Price ?? 0;
                const safeName = String(mName).replace(/'/g, "\\'");

                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h4>${mName}</h4>
                    <p><strong>$${Number(mPrice).toFixed(2)}</strong></p>
                    <input type="number" min="1" value="1" id="qty-${mId}" style="width: 70px;">
                    <button onclick="addToCart(${mId}, ${mPrice}, '${safeName}')" class="btn-primary">Add to Cart</button>
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
        showToast('Please login to add items to cart', 'info');
        toggleAuthModal();
        return;
    }

    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput?.value) || 1;

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/cart/items`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                menuItemId: itemId,
                quantity: quantity
            })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast(`${name} added to cart!`, 'success');
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
    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/cart`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            const cartData = data.Data || data.data;
            const items = cartData?.Items || cartData?.items || [];
            cart = items.map(item => ({
                itemId: item.MenuItemId || item.menuItemId,
                name: item.Name || item.name,
                price: item.Price ?? item.price ?? 0,
                quantity: item.Quantity ?? item.quantity ?? 1
            }));
        } else {
            cart = [];
        }
        displayCart();
    } catch (error) {
        console.error('Error loading cart from backend:', error);
        cart = [];
        displayCart();
    }
}

function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    if (!cartItemsDiv) return;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Your cart is empty</p>';
        loadAddressesForCheckout();
        return;
    }

    cartItemsDiv.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'card';
        cartItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4>${item.name}</h4>
                    <p>$${Number(item.price).toFixed(2)} x ${item.quantity} = $${itemTotal.toFixed(2)}</p>
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

    loadAddressesForCheckout();
}

async function removeFromCart(index) {
    const itemToRemove = cart[index];
    if (!itemToRemove) return;

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/cart/items/${itemToRemove.itemId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            cart.splice(index, 1);
            displayCart();
            showToast('Item removed from cart', 'info');
        } else {
            showToast(data.Message || data.message || 'Failed to remove item', 'error');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showToast('Error removing item from cart', 'error');
    }
}

async function loadAddressesForCheckout() {
    const select = document.getElementById('checkout-address');
    const checkoutBtn = document.querySelector('[onclick="checkout()"]');

    if (!select) return;

    try {
        // Call /api/addresses/my to match AddressesController
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/addresses/my`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;
        select.innerHTML = '';

        if (!response.ok) {
            select.innerHTML = '<option value="">Error loading addresses</option>';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }

        if (data.Success || data.success) {
            const addresses = data.Data || data.data || [];

            if (addresses.length === 0) {
                select.innerHTML = '<option value="">No addresses. Add one in Profile first!</option>';
                if (checkoutBtn) checkoutBtn.disabled = true;
                return;
            }

            addresses.forEach(addr => {
                const option = document.createElement('option');
                option.value = addr.id || addr.Id;
                option.textContent = `${addr.city || addr.City}, ${addr.street || addr.Street}`;
                select.appendChild(option);
            });

            if (checkoutBtn) checkoutBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error loading addresses:', error);
        select.innerHTML = '<option value="">Network error</option>';
        if (checkoutBtn) checkoutBtn.disabled = true;
    }
}

async function checkout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const addressId = document.getElementById('checkout-address').value;
    if (!addressId) {
        showToast('Please add/select a delivery address in Profile first', 'error');
        return;
    }

    const checkoutBtn = document.querySelector('[onclick="checkout()"]');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Placing order...';
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                addressId: parseInt(addressId)
            })
        });

        if (unauthorized) return;

        if (!response.ok) {
            const errorMsg = data.Message || data.message || 'Checkout failed';
            showToast(errorMsg, 'error');
            return;
        }

        if (data.Success || data.success) {
            cart = [];
            displayCart();
            showToast('Order placed successfully!', 'success');
            setTimeout(() => {
                showView('orders');
            }, 800);
        } else {
            showToast(data.Message || data.message || 'Order creation failed', 'error');
        }
    } catch (error) {
        console.error('Checkout exception:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
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
    const ordersDiv = document.getElementById('my-orders-list');
    if (!ordersDiv) return;

    ordersDiv.innerHTML = '<p>Loading orders...</p>';

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/orders/my`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;
        ordersDiv.innerHTML = '';

        if (data.Success || data.success) {
            const orders = data.Data || data.data || [];

            if (orders.length === 0) {
                ordersDiv.innerHTML = '<p>No orders yet</p>';
                return;
            }

            orders.forEach(order => {
                const oId = order.id ?? order.Id;
                const oStatus = order.status ?? order.Status;
                const oTotal = order.totalPrice ?? order.TotalPrice ?? order.total ?? 0;
                const oDate = order.createdAt ?? order.CreatedAt;
                const items = order.orderItems ?? order.OrderItems ?? [];

                const itemsHtml = items.map(i =>
                    `<li>${i.name || i.Name} x${i.quantity || i.Quantity} ($${Number(i.unitPrice ?? i.UnitPrice ?? 0).toFixed(2)})</li>`
                ).join('');

                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>Order #${oId}</h3>
                    <p><strong>Status:</strong> ${oStatus}</p>
                    <p><strong>Total:</strong> $${Number(oTotal).toFixed(2)}</p>
                    <p><strong>Date:</strong> ${oDate ? new Date(oDate).toLocaleString() : ''}</p>
                    ${itemsHtml ? `<ul style="margin-top: 10px; padding-left: 20px;">${itemsHtml}</ul>` : ''}
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
    const addressesDiv = document.getElementById('addresses-list');
    if (!addressesDiv) return;

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/addresses/my`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;
        addressesDiv.innerHTML = '';

        if (data.Success || data.success) {
            const addresses = data.Data || data.data || [];

            if (addresses.length === 0) {
                addressesDiv.innerHTML = '<p>No addresses added yet</p>';
                return;
            }

            addresses.forEach(addr => {
                const aId = addr.id || addr.Id;
                const aCity = addr.city || addr.City;
                const aStreet = addr.street || addr.Street;
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h4>${aCity}, ${aStreet}</h4>
                    <button onclick="deleteAddress(${aId})" class="btn-accent">Delete</button>
                `;
                addressesDiv.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading addresses:', error);
    }
}

async function addAddress() {
    const city = document.getElementById('addr-city').value.trim();
    const street = document.getElementById('addr-street').value.trim();

    if (!city || !street) {
        showToast('Please fill in both City and Street', 'error');
        return;
    }

    if (street.length < 5) {
        showToast('Street must be at least 5 characters long', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/addresses`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ city, street })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            document.getElementById('addr-city').value = '';
            document.getElementById('addr-street').value = '';
            showToast('Address added successfully!', 'success');
            loadAddresses();
            loadAddressesForCheckout();
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

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/addresses/${addressId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
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

    if (!token || !adminBtn) return;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            adminBtn.style.display = 'none';
            return;
        }

        const payload = JSON.parse(atob(parts[1]));
        let roles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
            || payload['role']
            || payload['roles']
            || payload['Role'];

        if (roles) {
            const isAdmin = Array.isArray(roles) ? roles.includes('Admin') : roles === 'Admin';
            adminBtn.style.display = isAdmin ? 'block' : 'none';
        } else {
            adminBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        adminBtn.style.display = 'none';
    }
}

async function adminAddRestaurant() {
    const name = document.getElementById('adm-rest-name');
    const address = document.getElementById('adm-rest-address');

    const nameVal = name?.value.trim();
    const addressVal = address?.value.trim();

    if (!nameVal || !addressVal) {
        showToast('Please enter both Name (2+ chars) and Address (5+ chars)', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/restaurants`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name: nameVal, address: addressVal })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success || data.restaurantId || data.RestaurantId)) {
            name.value = '';
            address.value = '';
            showToast('Restaurant added successfully!', 'success');
            loadRestaurants();
        } else {
            showToast(data.Message || data.message || 'Failed to add restaurant', 'error');
        }
    } catch (error) {
        console.error('Error adding restaurant:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function adminUpdateRestaurant() {
    const id = parseInt(document.getElementById('adm-rest-id').value);
    const name = document.getElementById('adm-rest-name').value.trim();
    const address = document.getElementById('adm-rest-address').value.trim();

    if (!id || !name || !address) {
        showToast('Please fill in ID, Name, and Address', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/restaurants/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id, name, address })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            document.getElementById('adm-rest-id').value = '';
            document.getElementById('adm-rest-name').value = '';
            document.getElementById('adm-rest-address').value = '';
            showToast('Restaurant updated successfully!', 'success');
            loadRestaurants();
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

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/restaurants/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            document.getElementById('adm-rest-id').value = '';
            showToast('Restaurant deleted successfully!', 'success');
            loadRestaurants();
        } else {
            showToast(data.Message || data.message || 'Failed to delete restaurant', 'error');
        }
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        showToast('Error deleting restaurant', 'error');
    }
}

async function adminAddMenuItem() {
    const restId = parseInt(document.getElementById('adm-menu-restId').value);
    const catId = parseInt(document.getElementById('adm-menu-catId').value);
    const name = document.getElementById('adm-menu-name').value.trim();
    const price = parseFloat(document.getElementById('adm-menu-price').value);
    const available = document.getElementById('adm-menu-avail').checked;

    if (!restId || !catId || !name || isNaN(price) || price <= 0) {
        showToast('Please provide valid Restaurant ID, Category ID (1-5), Name, and Price', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/menuitems`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                restaurantId: restId,
                categoryId: catId,
                name,
                price,
                isAvailable: available
            })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            document.getElementById('adm-menu-restId').value = '';
            document.getElementById('adm-menu-catId').value = '';
            document.getElementById('adm-menu-name').value = '';
            document.getElementById('adm-menu-price').value = '';
            document.getElementById('adm-menu-avail').checked = false;
            showToast('Menu item added successfully!', 'success');
            if (selectedRestaurantId === restId) {
                loadMenu(restId);
            }
        } else {
            showToast(data.Message || data.message || 'Failed to add menu item', 'error');
        }
    } catch (error) {
        console.error('Error adding menu item:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function adminUpdateMenuItem() {
    const id = parseInt(document.getElementById('adm-menu-id').value);
    const restId = parseInt(document.getElementById('adm-menu-restId').value) || 0;
    const catId = parseInt(document.getElementById('adm-menu-catId').value);
    const name = document.getElementById('adm-menu-name').value.trim();
    const price = parseFloat(document.getElementById('adm-menu-price').value);
    const available = document.getElementById('adm-menu-avail').checked;

    if (!id || !catId || !name || isNaN(price) || price <= 0) {
        showToast('Please fill in Item ID, Category ID, Name, and Price', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/menuitems/${id}`, {
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

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast('Menu item updated successfully!', 'success');
            if (selectedRestaurantId) loadMenu(selectedRestaurantId);
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

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/menuitems/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            document.getElementById('adm-menu-id').value = '';
            showToast('Menu item deleted successfully!', 'success');
            if (selectedRestaurantId) loadMenu(selectedRestaurantId);
        } else {
            showToast(data.Message || data.message || 'Failed to delete menu item', 'error');
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        showToast('Error deleting menu item', 'error');
    }
}

async function adminAddCategory() {
    const name = document.getElementById('adm-cat-name').value.trim();
    if (!name) {
        showToast('Please enter category name', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/categories`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            document.getElementById('adm-cat-name').value = '';
            const catId = data.Data?.CategoryId || data.data?.categoryId;
            showToast(`Category added! (ID: ${catId || 'created'})`, 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to add category', 'error');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showToast('Error adding category', 'error');
    }
}

async function adminLoadAllOrders() {
    const ordersDiv = document.getElementById('admin-orders-list');
    if (!ordersDiv) return;

    ordersDiv.innerHTML = '<p>Loading orders...</p>';

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/orders`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;
        ordersDiv.innerHTML = '';

        if (data.Success || data.success) {
            const orders = data.Data || data.data || [];

            if (orders.length === 0) {
                ordersDiv.innerHTML = '<p>No orders found</p>';
                return;
            }

            orders.forEach(order => {
                const oId = order.id ?? order.Id;
                const oUser = order.userId ?? order.UserId;
                const oStatus = order.status ?? order.Status;
                const oTotal = order.totalPrice ?? order.TotalPrice ?? 0;
                const oDate = order.createdAt ?? order.CreatedAt;

                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div>
                        <h4>Order #${oId}</h4>
                        <p><strong>User ID:</strong> ${oUser}</p>
                        <p><strong>Status:</strong> ${oStatus}</p>
                        <p><strong>Total:</strong> $${Number(oTotal).toFixed(2)}</p>
                        <p><strong>Order Date:</strong> ${oDate ? new Date(oDate).toLocaleString() : ''}</p>
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
        showToast('Please enter an Order ID', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: parseInt(statusValue) })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast('Order status updated successfully!', 'success');
            document.getElementById('adm-ord-id').value = '';
            adminLoadAllOrders();
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
    const file = fileInput?.files[0];

    if (!file) {
        showToast('Please select an image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const token = localStorage.getItem('jwtToken');
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/users/profile-image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast('Profile image uploaded successfully', 'success');
            const imgPath = data.Data?.ImagePath || data.data?.imagePath;
            const imagePreview = document.getElementById('profile-image-preview');
            if (imagePreview && imgPath) {
                imagePreview.src = `/uploads/${imgPath}`;
                imagePreview.style.display = 'block';
            }
            fileInput.value = '';
        } else {
            showToast(data.Message || data.message || 'Failed to upload image', 'error');
        }
    } catch (error) {
        console.error('Error uploading profile image:', error);
        showToast('Error uploading image', 'error');
    }
}

async function uploadRestaurantImage() {
    const restaurantId = document.getElementById('adm-rest-img-id').value;
    const fileInput = document.getElementById('adm-rest-image-input');
    const file = fileInput?.files[0];

    if (!restaurantId || !file) {
        showToast('Please enter Restaurant ID and select an image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/restaurants/${restaurantId}/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` },
            body: formData
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast('Restaurant image uploaded successfully', 'success');
            document.getElementById('adm-rest-img-id').value = '';
            fileInput.value = '';
            loadRestaurants();
        } else {
            showToast(data.Message || data.message || 'Failed to upload image', 'error');
        }
    } catch (error) {
        console.error('Error uploading restaurant image:', error);
        showToast('Error uploading image', 'error');
    }
}

async function uploadMenuItemImage() {
    const menuItemId = document.getElementById('adm-menu-img-id').value;
    const fileInput = document.getElementById('adm-menu-image-input');
    const file = fileInput?.files[0];

    if (!menuItemId || !file) {
        showToast('Please enter Menu Item ID and select an image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/admin/menuitems/${menuItemId}/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` },
            body: formData
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast('Menu item image uploaded successfully', 'success');
            document.getElementById('adm-menu-img-id').value = '';
            fileInput.value = '';
            if (selectedRestaurantId) loadMenu(selectedRestaurantId);
        } else {
            showToast(data.Message || data.message || 'Failed to upload image', 'error');
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
        loadCartFromBackend();
    }
}

async function loadUserProfile() {
    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/users/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` }
        });

        if (unauthorized) return;
        const profileData = data.Data || data.data;
        const imgPath = profileData?.ProfileImagePath || profileData?.profileImagePath;
        if ((data.Success || data.success) && imgPath) {
            const imagePreview = document.getElementById('profile-image-preview');
            if (imagePreview) {
                imagePreview.src = `/uploads/${imgPath}`;
                imagePreview.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

window.addEventListener('load', () => {
    logout();
    showAppSection();
    updateAuthUI();
    loadInitialData();

    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAuthModal();
            }
        });
    }
});