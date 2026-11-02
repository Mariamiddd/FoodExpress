const apiUrl = 'https://localhost:7198/api';

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

function toggleAuth(tab) {
    if (tab === 'login') {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
    } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${apiUrl}/Auth/Login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            localStorage.setItem('jwtToken', data.Data.token);
            showToast('Login successful!', 'success');
            showAppSection();
            loadInitialData();
        } else {
            showToast(data.Message || data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('An error occurred during login', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/Auth/Register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            showToast('Registration successful! Please login.', 'success');
            document.getElementById('register-form').reset();
            toggleAuth('login');
        } else {
            showToast(data.Message || data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('An error occurred during registration', 'error');
    }
}

function logout() {
    localStorage.removeItem('jwtToken');
    currentUser = null;
    cart = [];
    selectedRestaurantId = null;

    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';

    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();

    showToast('Logged out successfully', 'success');
}

// ============================================
// VIEW MANAGEMENT FUNCTIONS
// ============================================

function showAppSection() {
    document.getElementById('auth-section').classList.remove('active-section');
    document.getElementById('app-section').style.display = 'block';
}

function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
    });

    // Show selected view
    const viewId = `view-${viewName}`;
    const view = document.getElementById(viewId);
    if (view) {
        view.style.display = 'block';
    }

    // Load data based on view
    if (viewName === 'restaurants') {
        loadRestaurants();
    } else if (viewName === 'cart') {
        displayCart();
    } else if (viewName === 'orders') {
        loadOrders();
    } else if (viewName === 'profile') {
        loadAddresses();
    } else if (viewName === 'admin') {
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
        const response = await fetch(`${apiUrl}/Restaurants`, {
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
                card.innerHTML = `
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
        const response = await fetch(`${apiUrl}/Menu/restaurant/${restaurantId}`, {
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
                card.innerHTML = `
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
        const response = await fetch(`${apiUrl}/Restaurants/search?name=${encodeURIComponent(query)}`, {
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
        const response = await fetch(`${apiUrl}/Menu/search?name=${encodeURIComponent(query)}`, {
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

function addToCart(itemId, price, name) {
    const quantity = parseInt(document.getElementById(`qty-${itemId}`).value) || 1;

    const existingItem = cart.find(item => item.itemId === itemId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ itemId, name, price, quantity });
    }

    showToast(`${name} added to cart!`, 'success');
}

function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const checkoutAddressSelect = document.getElementById('checkout-address');

    if (!cartItemsDiv) return;

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Your cart is empty</p>';
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

    loadAddressesForCheckout();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    displayCart();
    showToast('Item removed from cart', 'info');
}

async function loadAddressesForCheckout() {
    const token = localStorage.getItem('jwtToken');
    const select = document.getElementById('checkout-address');

    if (!select) return;

    try {
        const response = await fetch(`${apiUrl}/Addresses`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        select.innerHTML = '';

        if (data.Success || data.success) {
            const addresses = data.Data || data.data || [];
            addresses.forEach(addr => {
                const option = document.createElement('option');
                option.value = addr.id;
                option.textContent = `${addr.city}, ${addr.street}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading addresses:', error);
    }
}

async function checkout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const addressId = document.getElementById('checkout-address').value;
    if (!addressId) {
        showToast('Please select an address', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/Orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                restaurantId: selectedRestaurantId,
                addressId: parseInt(addressId),
                items: cart
            })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            cart = [];
            showToast('Order placed successfully!', 'success');
            showView('orders');
        } else {
            showToast(data.Message || data.message || 'Checkout failed', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Error placing order', 'error');
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
        const response = await fetch(`${apiUrl}/Orders`, {
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
        const response = await fetch(`${apiUrl}/Addresses`, {
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
        const response = await fetch(`${apiUrl}/Addresses`, {
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
        const response = await fetch(`${apiUrl}/Addresses/${addressId}`, {
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

    // For now, just show admin panel
    // Later: verify user role from token or API
}

// RESTAURANTS ADMIN
async function adminAddRestaurant() {
    const name = document.getElementById('adm-rest-name').value;
    const address = document.getElementById('adm-rest-address').value;

    if (!name || !address) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/Admin/Restaurants`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, address })
        });

        const data = await response.json();

        if (data.Success || data.success) {
            document.getElementById('adm-rest-name').value = '';
            document.getElementById('adm-rest-address').value = '';
            showToast('Restaurant added successfully!', 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to add restaurant', 'error');
        }
    } catch (error) {
        console.error('Error adding restaurant:', error);
        showToast('Error adding restaurant', 'error');
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
        const response = await fetch(`${apiUrl}/Admin/Restaurants/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, address })
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
        const response = await fetch(`${apiUrl}/Admin/Restaurants/${id}`, {
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
    const restId = parseInt(document.getElementById('adm-menu-restId').value);
    const catId = parseInt(document.getElementById('adm-menu-catId').value);
    const name = document.getElementById('adm-menu-name').value;
    const price = parseFloat(document.getElementById('adm-menu-price').value);
    const available = document.getElementById('adm-menu-avail').checked;

    if (!restId || !catId || !name || !price) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const token = localStorage.getItem('jwtToken');

    try {
        const response = await fetch(`${apiUrl}/Admin/MenuItems`, {
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

        const data = await response.json();

        if (data.Success || data.success) {
            document.getElementById('adm-menu-restId').value = '';
            document.getElementById('adm-menu-catId').value = '';
            document.getElementById('adm-menu-name').value = '';
            document.getElementById('adm-menu-price').value = '';
            document.getElementById('adm-menu-avail').checked = false;
            showToast('Menu item added successfully!', 'success');
        } else {
            showToast(data.Message || data.message || 'Failed to add menu item', 'error');
        }
    } catch (error) {
        console.error('Error adding menu item:', error);
        showToast('Error adding menu item', 'error');
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
        const response = await fetch(`${apiUrl}/Admin/MenuItems/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
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
        const response = await fetch(`${apiUrl}/Admin/MenuItems/${id}`, {
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
        const response = await fetch(`${apiUrl}/Admin/Categories`, {
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
        const response = await fetch(`${apiUrl}/Admin/Orders`, {
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

// ============================================
// INITIALIZATION
// ============================================

function loadInitialData() {
    loadRestaurants();
}

// Check if user is logged in on page load
window.addEventListener('load', () => {
    if (isLoggedIn()) {
        showAppSection();
        loadInitialData();
    }
});
