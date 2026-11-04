const apiUrl = '/api';

// APP STATE
let currentUser = null;
let cart = [];
let categories = [];
let selectedRestaurantId = null;
let selectedRestaurantName = '';

// ============================================
// UTILITY & API CLIENT FUNCTIONS
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

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

function isTokenValid(token) {
    if (!token) return false;
    const payload = parseJwtPayload(token);
    if (!payload) return false;
    if (!payload.exp) return true;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp > nowInSeconds;
}

function isLoggedIn() {
    const token = localStorage.getItem('jwtToken');
    return isTokenValid(token);
}

function clearSessionStorage() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    currentUser = null;
    cart = [];
    updateCartBadge();
}

function validateSessionOnStartup() {
    const token = localStorage.getItem('jwtToken');
    if (token && !isTokenValid(token)) {
        clearSessionStorage();
    }
}

function getAuthHeaders(includeJsonContentType = true) {
    const token = localStorage.getItem('jwtToken');
    const headers = {};
    if (includeJsonContentType) {
        headers['Content-Type'] = 'application/json';
    }
    if (token && isTokenValid(token)) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function extractErrorMessage(data, fallback = 'Operation failed') {
    if (!data) return fallback;
    if (data.Errors || data.errors) {
        const errObj = data.Errors || data.errors;
        const firstKey = Object.keys(errObj)[0];
        if (firstKey && Array.isArray(errObj[firstKey]) && errObj[firstKey].length > 0) {
            return errObj[firstKey][0];
        }
    }
    return data.Message || data.message || data.detail || data.title || fallback;
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = {};

    if (text && text.trim()) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { message: text };
        }
    }

    const headers = options.headers || {};
    const hadToken = !!(headers.Authorization || headers.authorization);

    if (response.status === 401 && hadToken) {
        clearSessionStorage();
        const modal = document.getElementById('auth-modal');
        if (modal) modal.style.display = 'none';
        updateAuthUI();
        showView('restaurants');
        showToast('Your session has expired. Please log in again.', 'error');
        return { response, data, unauthorized: true };
    }

    if (response.status === 403) {
        showToast(extractErrorMessage(data, 'You do not have permission to perform this action.'), 'error');
    }

    return { response, data, unauthorized: false };
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    if (modal.style.display === 'none' || !modal.style.display) {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
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

function saveAuthSession(tokenData) {
    const token = tokenData?.Token || tokenData?.token;
    if (!token) return false;

    localStorage.setItem('jwtToken', token);
    localStorage.setItem('userId', tokenData.UserId || tokenData.userId || '');
    localStorage.setItem('userEmail', tokenData.Email || tokenData.email || '');
    localStorage.setItem('userName', tokenData.UserName || tokenData.userName || '');
    return true;
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
            if (saveAuthSession(tokenData)) {
                showToast('Login successful!', 'success');
                document.getElementById('login-form-modal').reset();
                closeAuthModal();
                updateAuthUI();
                loadInitialData();
            } else {
                showToast('No token received from server', 'error');
            }
        } else {
            showToast(extractErrorMessage(data, 'Invalid email or password.'), 'error');
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
            document.getElementById('register-form-modal').reset();
            const tokenData = data.Data || data.data;

            if (saveAuthSession(tokenData)) {
                showToast('Account created and logged in!', 'success');
                closeAuthModal();
                updateAuthUI();
                loadInitialData();
            } else {
                showToast('Registration successful! Please login.', 'success');
                toggleAuthTab('login');
            }
        } else {
            showToast(extractErrorMessage(data, 'Registration failed'), 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('Network error: Unable to connect to server', 'error');
    }
}

function logout(silent = false) {
    clearSessionStorage();
    selectedRestaurantId = null;

    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';

    const loginForm = document.getElementById('login-form-modal');
    const regForm = document.getElementById('register-form-modal');
    if (loginForm) loginForm.reset();
    if (regForm) regForm.reset();

    updateAuthUI();
    showView('restaurants');
    if (!silent) {
        showToast('Logged out successfully', 'info');
    }
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
    const appSection = document.getElementById('app-section');
    if (appSection) appSection.style.display = 'block';
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
        loadCategories();
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
        loadCategories();
        adminLoadAllOrders();
    }
}

// ============================================
// CATEGORIES, RESTAURANTS & MENUS FUNCTIONS
// ============================================

async function loadCategories() {
    try {
        const { response, data } = await apiFetch(`${apiUrl}/menu/categories`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.ok && (data.Success || data.success)) {
            categories = data.Data || data.data || [];
            renderCategoryFilters();
            renderAdminCategoryHint();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    if (!categories.length) {
        container.innerHTML = '';
        return;
    }

    const pillsHtml = categories.map(cat => {
        const cId = cat.id ?? cat.Id;
        const cName = escapeHtml(cat.name ?? cat.Name);
        return `<button class="pill-btn" onclick="filterMenuByCategory(${cId}, '${cName}')">${cName}</button>`;
    }).join('');

    container.innerHTML = `<span class="pill-label">Categories:</span> ${pillsHtml}`;
}

function renderAdminCategoryHint() {
    const hint = document.getElementById('admin-categories-hint');
    if (!hint) return;

    if (!categories.length) {
        hint.textContent = '';
        return;
    }

    hint.innerHTML = '<strong>Available IDs:</strong> ' + categories
        .map(c => `<span class="badge-muted">#${c.id ?? c.Id}: ${escapeHtml(c.name ?? c.Name)}</span>`)
        .join(' ');
}

async function filterMenuByCategory(categoryId, categoryName) {
    const menuList = document.getElementById('menu-list');
    const menuContainer = document.getElementById('menu-container');
    if (!menuList || !menuContainer) return;

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/menu/category/${categoryId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            const items = data.Data || data.data || [];
            renderMenuItems(items, `Category: ${categoryName}`);
        }
    } catch (error) {
        console.error('Error filtering menu by category:', error);
        showToast('Error loading category items', 'error');
    }
}

function renderRestaurantCards(restaurants) {
    const listElement = document.getElementById('restaurants-list');
    if (!listElement) return;
    listElement.innerHTML = '';

    if (!restaurants || restaurants.length === 0) {
        listElement.innerHTML = '<p class="empty-state">No restaurants found.</p>';
        return;
    }

    restaurants.forEach(restaurant => {
        const rId = restaurant.id ?? restaurant.Id;
        const rName = escapeHtml(restaurant.name ?? restaurant.Name);
        const rAddress = escapeHtml(restaurant.address ?? restaurant.Address);
        const rImg = restaurant.imagePath ?? restaurant.ImagePath;

        const card = document.createElement('div');
        card.className = 'card restaurant-card';
        const imageHtml = rImg
            ? `<img src="/uploads/${encodeURI(rImg)}" alt="${rName}" class="card-img-lg">`
            : `<div class="card-img-placeholder card-img-lg"><span>${rName}</span></div>`;

        card.innerHTML = `
            ${imageHtml}
            <div class="card-header-row">
                <h3>${rName}</h3>
                <span class="badge-muted">ID: #${rId}</span>
            </div>
            <p class="text-muted">${rAddress}</p>
            <button onclick="loadMenu(${rId}, '${rName.replace(/'/g, "\\'")}')" class="btn-primary btn-block">View Menu</button>
        `;
        listElement.appendChild(card);
    });
}

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

        if (response.ok && (data.Success || data.success)) {
            const restaurants = data.Data || data.data || [];
            renderRestaurantCards(restaurants);
        } else {
            listElement.innerHTML = '<p>Failed to load restaurants</p>';
        }
    } catch (error) {
        console.error('Error loading restaurants:', error);
        listElement.innerHTML = '<p>Error loading restaurants</p>';
    }
}

function renderMenuItems(items, titleText) {
    const menuList = document.getElementById('menu-list');
    const menuContainer = document.getElementById('menu-container');
    const menuTitle = document.getElementById('menu-title');

    if (!menuList || !menuContainer) return;
    menuList.innerHTML = '';

    if (menuTitle) menuTitle.textContent = titleText;
    menuContainer.style.display = 'block';

    if (!items || items.length === 0) {
        menuList.innerHTML = '<p class="empty-state">No menu items found.</p>';
        return;
    }

    items.forEach(item => {
        const mId = item.id ?? item.Id;
        const mName = item.name ?? item.Name ?? 'Item';
        const mPrice = item.price ?? item.Price ?? 0;
        const mImg = item.imagePath ?? item.ImagePath;
        const mAvail = item.isAvailable ?? item.IsAvailable ?? true;
        const mCat = item.categoryName ?? item.CategoryName ?? '';
        const mRest = item.restaurantName ?? item.RestaurantName ?? '';
        const safeName = String(mName).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        const card = document.createElement('div');
        card.className = 'card menu-card';
        const imageHtml = mImg
            ? `<img src="/uploads/${encodeURI(mImg)}" alt="${escapeHtml(mName)}" class="card-img-sm">`
            : `<div class="card-img-placeholder card-img-sm"><span>${escapeHtml(mName)}</span></div>`;

        card.innerHTML = `
            ${imageHtml}
            <div class="card-header-row">
                <h4>${escapeHtml(mName)}</h4>
                <span class="badge-muted">ID: #${mId}</span>
            </div>
            <div class="meta-row">
                ${mCat ? `<span class="badge-category">${escapeHtml(mCat)}</span>` : ''}
                ${mRest ? `<span class="text-muted small-note">${escapeHtml(mRest)}</span>` : ''}
            </div>
            <p class="price-tag">$${Number(mPrice).toFixed(2)}</p>
            <div class="menu-action-row">
                <input type="number" min="1" value="1" id="qty-${mId}" class="qty-input">
                <button onclick="addToCart(${mId}, ${mPrice}, '${safeName}')" class="btn-primary" ${!mAvail ? 'disabled' : ''}>
                    ${mAvail ? 'Add to Cart' : 'Unavailable'}
                </button>
            </div>
        `;
        menuList.appendChild(card);
    });
}

async function loadMenu(restaurantId, restaurantName = '') {
    selectedRestaurantId = restaurantId;
    selectedRestaurantName = restaurantName;

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/restaurants/${restaurantId}/menu`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            const items = data.Data || data.data || [];
            const title = restaurantName
                ? `Menu — ${restaurantName} (Restaurant #${restaurantId})`
                : `Menu (Restaurant #${restaurantId})`;
            renderMenuItems(items, title);
            document.getElementById('menu-container')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            showToast(extractErrorMessage(data, 'Could not load menu'), 'error');
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

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/restaurants/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            const restaurants = data.Data || data.data || [];
            renderRestaurantCards(restaurants);
        } else {
            renderRestaurantCards([]);
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

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/menu/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            const items = data.Data || data.data || [];
            renderMenuItems(items, `Menu Search Results for "${query}"`);
        }
    } catch (error) {
        console.error('Error searching menus:', error);
        showToast('Error searching menus', 'error');
    }
}

// ============================================
// CART FUNCTIONS
// ============================================

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    badge.textContent = totalCount;
}

async function addToCart(itemId, price, name) {
    if (!isLoggedIn()) {
        showToast('Please login to add items to cart', 'info');
        toggleAuthModal();
        return;
    }

    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput?.value, 10) || 1;

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
            await loadCartFromBackend();
        } else {
            showToast(extractErrorMessage(data, 'Failed to add item to cart'), 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Error adding item to cart', 'error');
    }
}

async function loadCartFromBackend() {
    if (!isLoggedIn()) {
        cart = [];
        updateCartBadge();
        displayCart();
        return;
    }

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
                itemId: item.MenuItemId ?? item.menuItemId,
                name: item.Name ?? item.name,
                price: item.Price ?? item.price ?? 0,
                quantity: item.Quantity ?? item.quantity ?? 1,
                restaurantName: item.RestaurantName ?? item.restaurantName ?? cartData?.RestaurantName ?? cartData?.restaurantName ?? ''
            }));
        } else {
            cart = [];
        }
        updateCartBadge();
        displayCart();
    } catch (error) {
        console.error('Error loading cart from backend:', error);
        cart = [];
        updateCartBadge();
        displayCart();
    }
}

function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    if (!cartItemsDiv) return;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<div class="card"><p>Your cart is empty. Browse restaurants to add delicious items!</p></div>';
        loadAddressesForCheckout();
        return;
    }

    cartItemsDiv.innerHTML = '';
    let total = 0;

    if (cart[0]?.restaurantName) {
        const restBanner = document.createElement('div');
        restBanner.className = 'cart-restaurant-banner';
        restBanner.innerHTML = `Ordering from: <strong>${escapeHtml(cart[0].restaurantName)}</strong>`;
        cartItemsDiv.appendChild(restBanner);
    }

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'card cart-item-card';
        cartItem.innerHTML = `
            <div class="cart-item-row">
                <div>
                    <h4>${escapeHtml(item.name)}</h4>
                    <p class="text-muted">$${Number(item.price).toFixed(2)} each &bull; Subtotal: <strong>$${itemTotal.toFixed(2)}</strong></p>
                </div>
                <div class="cart-controls">
                    <button onclick="changeCartItemQuantity(${index}, -1)" class="btn-outline btn-qty" title="Decrease quantity">&minus;</button>
                    <span class="cart-qty-display">${item.quantity}</span>
                    <button onclick="changeCartItemQuantity(${index}, 1)" class="btn-outline btn-qty" title="Increase quantity">&#43;</button>
                    <button onclick="removeFromCart(${index})" class="btn-accent btn-small">Remove</button>
                </div>
            </div>
        `;
        cartItemsDiv.appendChild(cartItem);
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'card cart-total-card';
    totalDiv.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
    cartItemsDiv.appendChild(totalDiv);

    loadAddressesForCheckout();
}

async function changeCartItemQuantity(index, delta) {
    const item = cart[index];
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
        await removeFromCart(index);
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/cart/items/${item.itemId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ quantity: newQuantity })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            item.quantity = newQuantity;
            updateCartBadge();
            displayCart();
        } else {
            showToast(extractErrorMessage(data, 'Failed to update quantity'), 'error');
        }
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        showToast('Error updating item quantity', 'error');
    }
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
            updateCartBadge();
            displayCart();
            showToast('Item removed from cart', 'info');
        } else {
            showToast(extractErrorMessage(data, 'Failed to remove item'), 'error');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showToast('Error removing item from cart', 'error');
    }
}

async function loadAddressesForCheckout() {
    const select = document.getElementById('checkout-address');
    const checkoutBtn = document.getElementById('checkout-btn') || document.querySelector('[onclick="checkout()"]');

    if (!select || !isLoggedIn()) return;

    try {
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
                select.innerHTML = '<option value="">No addresses found. Add one in Profile first!</option>';
                if (checkoutBtn) checkoutBtn.disabled = true;
                return;
            }

            addresses.forEach(addr => {
                const option = document.createElement('option');
                option.value = addr.id ?? addr.Id;
                option.textContent = `${addr.city ?? addr.City}, ${addr.street ?? addr.Street}`;
                select.appendChild(option);
            });

            if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
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

    const checkoutBtn = document.getElementById('checkout-btn') || document.querySelector('[onclick="checkout()"]');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Placing order...';
    }

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                addressId: parseInt(addressId, 10)
            })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            cart = [];
            updateCartBadge();
            displayCart();
            showToast('Order placed successfully!', 'success');
            setTimeout(() => {
                showView('orders');
            }, 600);
        } else {
            showToast(extractErrorMessage(data, 'Order creation failed'), 'error');
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

function getStatusBadgeClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'delivered') return 'status-delivered';
    if (normalized === 'cancelled') return 'status-cancelled';
    if (normalized === 'ontheway' || normalized === 'preparing') return 'status-progress';
    return 'status-created';
}

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

        if (response.ok && (data.Success || data.success)) {
            const orders = data.Data || data.data || [];

            if (orders.length === 0) {
                ordersDiv.innerHTML = '<div class="card"><p>No orders yet. Place your first order from the Restaurants tab!</p></div>';
                return;
            }

            orders.forEach(order => {
                const oId = order.id ?? order.Id;
                const oStatus = order.status ?? order.Status ?? 'Created';
                const oTotal = order.totalPrice ?? order.TotalPrice ?? 0;
                const oDate = order.createdAt ?? order.CreatedAt;
                const oRest = order.restaurantName ?? order.RestaurantName ?? `Restaurant #${order.restaurantId ?? order.RestaurantId}`;
                const oAddr = order.deliveryAddress ?? order.DeliveryAddress ?? '';
                const items = order.orderItems ?? order.OrderItems ?? [];

                const canCancel = oStatus === 'Created' || oStatus === 'Confirmed';

                const itemsHtml = items.map(i =>
                    `<li>${escapeHtml(i.name || i.Name)} &times; ${i.quantity || i.Quantity} ($${Number(i.unitPrice ?? i.UnitPrice ?? 0).toFixed(2)})</li>`
                ).join('');

                const card = document.createElement('div');
                card.className = 'card order-card';
                card.innerHTML = `
                    <div class="card-header-row">
                        <h3>Order #${oId}</h3>
                        <span class="status-badge ${getStatusBadgeClass(oStatus)}">${escapeHtml(oStatus)}</span>
                    </div>
                    <p><strong>Restaurant:</strong> ${escapeHtml(oRest)}</p>
                    ${oAddr ? `<p><strong>Delivery Address:</strong> ${escapeHtml(oAddr)}</p>` : ''}
                    <p><strong>Total:</strong> $${Number(oTotal).toFixed(2)}</p>
                    <p class="text-muted small-note">${oDate ? new Date(oDate).toLocaleString() : ''}</p>
                    ${itemsHtml ? `<ul class="order-items-list">${itemsHtml}</ul>` : ''}
                    ${canCancel ? `<button onclick="cancelMyOrder(${oId})" class="btn-accent btn-small section-spacer-sm">Cancel Order</button>` : ''}
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

async function cancelMyOrder(orderId) {
    if (!confirm(`Are you sure you want to cancel Order #${orderId}?`)) return;

    try {
        // OrderState.Cancelled == 5
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: 5 })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast(`Order #${orderId} cancelled`, 'info');
            loadOrders();
        } else {
            showToast(extractErrorMessage(data, 'Failed to cancel order'), 'error');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('Error cancelling order', 'error');
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

        if (response.ok && (data.Success || data.success)) {
            const addresses = data.Data || data.data || [];

            if (addresses.length === 0) {
                addressesDiv.innerHTML = '<p>No addresses added yet</p>';
                return;
            }

            addresses.forEach(addr => {
                const aId = addr.id ?? addr.Id;
                const aCity = escapeHtml(addr.city ?? addr.City);
                const aStreet = escapeHtml(addr.street ?? addr.Street);
                const card = document.createElement('div');
                card.className = 'card address-card';
                card.innerHTML = `
                    <div class="card-header-row">
                        <h4>${aCity}, ${aStreet}</h4>
                        <button onclick="deleteAddress(${aId})" class="btn-accent btn-small">Delete</button>
                    </div>
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
            showToast(extractErrorMessage(data, 'Failed to add address'), 'error');
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
            loadAddressesForCheckout();
        } else {
            showToast(extractErrorMessage(data, 'Failed to delete address'), 'error');
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        showToast('Error deleting address', 'error');
    }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

function checkAdminAccess() {
    const token = localStorage.getItem('jwtToken');
    const adminBtn = document.getElementById('admin-nav-btn');

    if (!token || !adminBtn || !isTokenValid(token)) {
        if (adminBtn) adminBtn.style.display = 'none';
        return;
    }

    const payload = parseJwtPayload(token);
    if (!payload) {
        adminBtn.style.display = 'none';
        return;
    }

    const roles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
        || payload['role']
        || payload['roles']
        || payload['Role'];

    if (roles) {
        const isAdmin = Array.isArray(roles) ? roles.includes('Admin') : roles === 'Admin';
        adminBtn.style.display = isAdmin ? 'block' : 'none';
    } else {
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

        if (response.ok && (data.Success || data.success)) {
            name.value = '';
            address.value = '';
            showToast('Restaurant added successfully!', 'success');
            loadRestaurants();
        } else {
            showToast(extractErrorMessage(data, 'Failed to add restaurant'), 'error');
        }
    } catch (error) {
        console.error('Error adding restaurant:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function adminUpdateRestaurant() {
    const id = parseInt(document.getElementById('adm-rest-id').value, 10);
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
            showToast(extractErrorMessage(data, 'Failed to update restaurant'), 'error');
        }
    } catch (error) {
        console.error('Error updating restaurant:', error);
        showToast('Error updating restaurant', 'error');
    }
}

async function adminDeleteRestaurant() {
    const id = parseInt(document.getElementById('adm-rest-id').value, 10);
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
            showToast(extractErrorMessage(data, 'Failed to delete restaurant'), 'error');
        }
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        showToast('Error deleting restaurant', 'error');
    }
}

async function adminAddMenuItem() {
    const restId = parseInt(document.getElementById('adm-menu-restId').value, 10);
    const catId = parseInt(document.getElementById('adm-menu-catId').value, 10);
    const name = document.getElementById('adm-menu-name').value.trim();
    const price = parseFloat(document.getElementById('adm-menu-price').value);
    const available = document.getElementById('adm-menu-avail').checked;

    if (!restId || !catId || !name || isNaN(price) || price <= 0) {
        showToast('Please provide valid Restaurant ID, Category ID, Name, and Price', 'error');
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
            document.getElementById('adm-menu-avail').checked = true;
            showToast('Menu item added successfully!', 'success');
            if (selectedRestaurantId === restId) {
                loadMenu(restId, selectedRestaurantName);
            }
        } else {
            showToast(extractErrorMessage(data, 'Failed to add menu item'), 'error');
        }
    } catch (error) {
        console.error('Error adding menu item:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function adminUpdateMenuItem() {
    const id = parseInt(document.getElementById('adm-menu-id').value, 10);
    const restId = parseInt(document.getElementById('adm-menu-restId').value, 10) || 0;
    const catId = parseInt(document.getElementById('adm-menu-catId').value, 10);
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
            if (selectedRestaurantId) loadMenu(selectedRestaurantId, selectedRestaurantName);
        } else {
            showToast(extractErrorMessage(data, 'Failed to update menu item'), 'error');
        }
    } catch (error) {
        console.error('Error updating menu item:', error);
        showToast('Error updating menu item', 'error');
    }
}

async function adminDeleteMenuItem() {
    const id = parseInt(document.getElementById('adm-menu-id').value, 10);
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
            if (selectedRestaurantId) loadMenu(selectedRestaurantId, selectedRestaurantName);
        } else {
            showToast(extractErrorMessage(data, 'Failed to delete menu item'), 'error');
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
            const catId = data.Data?.CategoryId ?? data.data?.categoryId;
            showToast(`Category added! (ID: ${catId || 'created'})`, 'success');
            loadCategories();
        } else {
            showToast(extractErrorMessage(data, 'Failed to add category'), 'error');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showToast('Error adding category', 'error');
    }
}

function selectOrderForStatusUpdate(orderId) {
    const input = document.getElementById('adm-ord-id');
    if (input) {
        input.value = orderId;
        input.focus();
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

        if (response.ok && (data.Success || data.success)) {
            const orders = data.Data || data.data || [];

            if (orders.length === 0) {
                ordersDiv.innerHTML = '<p>No orders found</p>';
                return;
            }

            orders.forEach(order => {
                const oId = order.id ?? order.Id;
                const oUser = order.userId ?? order.UserId;
                const oStatus = order.status ?? order.Status ?? 'Created';
                const oTotal = order.totalPrice ?? order.TotalPrice ?? 0;
                const oDate = order.createdAt ?? order.CreatedAt;
                const oRest = order.restaurantName ?? order.RestaurantName ?? `Restaurant #${order.restaurantId ?? order.RestaurantId}`;

                const card = document.createElement('div');
                card.className = 'card order-card';
                card.innerHTML = `
                    <div class="card-header-row">
                        <h4>Order #${oId}</h4>
                        <span class="status-badge ${getStatusBadgeClass(oStatus)}">${escapeHtml(oStatus)}</span>
                    </div>
                    <p><strong>Restaurant:</strong> ${escapeHtml(oRest)}</p>
                    <p class="text-muted small-note"><strong>User ID:</strong> ${escapeHtml(oUser)}</p>
                    <p><strong>Total:</strong> $${Number(oTotal).toFixed(2)}</p>
                    <p class="text-muted small-note">${oDate ? new Date(oDate).toLocaleString() : ''}</p>
                    <button onclick="selectOrderForStatusUpdate(${oId})" class="btn-outline btn-small section-spacer-sm">Select Order #${oId}</button>
                `;
                ordersDiv.appendChild(card);
            });
        } else {
            ordersDiv.innerHTML = `<p>Error: ${escapeHtml(extractErrorMessage(data, 'Failed to load orders'))}</p>`;
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
            body: JSON.stringify({ status: parseInt(statusValue, 10) })
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast(`Order #${orderId} status updated!`, 'success');
            document.getElementById('adm-ord-id').value = '';
            adminLoadAllOrders();
        } else {
            showToast(extractErrorMessage(data, 'Failed to update order status'), 'error');
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
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/users/profile-image`, {
            method: 'POST',
            headers: getAuthHeaders(false),
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
            showToast(extractErrorMessage(data, 'Failed to upload image'), 'error');
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
            headers: getAuthHeaders(false),
            body: formData
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast('Restaurant image uploaded successfully', 'success');
            document.getElementById('adm-rest-img-id').value = '';
            fileInput.value = '';
            loadRestaurants();
        } else {
            showToast(extractErrorMessage(data, 'Failed to upload image'), 'error');
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
            headers: getAuthHeaders(false),
            body: formData
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            showToast('Menu item image uploaded successfully', 'success');
            document.getElementById('adm-menu-img-id').value = '';
            fileInput.value = '';
            if (selectedRestaurantId) loadMenu(selectedRestaurantId, selectedRestaurantName);
        } else {
            showToast(extractErrorMessage(data, 'Failed to upload image'), 'error');
        }
    } catch (error) {
        console.error('Error uploading menu item image:', error);
        showToast('Error uploading image', 'error');
    }
}

async function adminPromoteUser() {
    const emailInput = document.getElementById('adm-promote-email');
    const email = emailInput?.value.trim();

    if (!email) {
        showToast('Please enter a registered user email', 'error');
        return;
    }

    try {
        const { response, data, unauthorized } = await apiFetch(
            `${apiUrl}/admin/users/promote?email=${encodeURIComponent(email)}`,
            {
                method: 'POST',
                headers: getAuthHeaders()
            }
        );

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            emailInput.value = '';
            showToast(data.Message || data.message || `${email} promoted to Admin!`, 'success');
        } else {
            showToast(extractErrorMessage(data, 'Failed to promote user'), 'error');
        }
    } catch (error) {
        console.error('Error promoting user:', error);
        showToast('Error promoting user', 'error');
    }
}
// ============================================
// INITIALIZATION
// ============================================

function loadInitialData() {
    loadCategories();
    loadRestaurants();
    if (isLoggedIn()) {
        loadUserProfile();
        loadCartFromBackend();
    }
}

async function loadUserProfile() {
    if (!isLoggedIn()) return;

    try {
        const { response, data, unauthorized } = await apiFetch(`${apiUrl}/users/profile`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (unauthorized) return;

        if (response.ok && (data.Success || data.success)) {
            const profileData = data.Data || data.data;
            const userNameEl = document.getElementById('profile-username');
            const emailEl = document.getElementById('profile-email');

            if (userNameEl) userNameEl.textContent = `Username: ${profileData?.UserName || profileData?.userName || ''}`;
            if (emailEl) emailEl.textContent = `Email: ${profileData?.Email || profileData?.email || ''}`;

            const imgPath = profileData?.ProfileImagePath || profileData?.profileImagePath;
            const imagePreview = document.getElementById('profile-image-preview');
            if (imagePreview) {
                if (imgPath) {
                    imagePreview.src = `/uploads/${imgPath}`;
                    imagePreview.style.display = 'block';
                } else {
                    imagePreview.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

window.addEventListener('load', () => {
    validateSessionOnStartup();
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