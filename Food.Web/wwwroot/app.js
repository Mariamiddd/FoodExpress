/**
 * ============================================================================
 * FOODEXPRESS — PRODUCTION FRONTEND APPLICATION (VANILLA ES6+)
 * Complete implementation of all 36 Swagger API operations across 8 tags:
 * Auth, Users, Addresses, Restaurants, Menu, Cart, Orders, Admin
 * ============================================================================
 */

// Same-origin relative base path (edit if hosting API on another port)
const API_BASE = "";

const STORAGE_KEY_AUTH = "foodexpress_auth_session_v1";
const STORAGE_KEY_ADDR = "foodexpress_selected_address_v1";

const ORDER_FLOW = ["Created", "Confirmed", "Preparing", "OnTheWay", "Delivered"];
const NEXT_ORDER_STATE = {
    Created: { next: "Confirmed", label: "Confirm Order" },
    Confirmed: { next: "Preparing", label: "Start Preparing" },
    Preparing: { next: "OnTheWay", label: "Dispatch Courier (On The Way)" },
    OnTheWay: { next: "Delivered", label: "Mark Delivered" }
};

// Centralized Application State
const state = {
    auth: null, // { token, expiresAt, userId, email, userName, roles, isAdmin }
    profile: null,
    addresses: [],
    selectedAddressId: null,

    categories: [],
    discoveryMode: "restaurants", // "restaurants" | "dishes"
    selectedCategoryId: null,
    catalogSearch: "",
    catalogPage: 1,
    catalogPageSize: 12,
    restaurants: [],

    globalDishes: [],

    currentRestaurantId: null,
    currentRestaurant: null,
    currentRestaurantMenu: [],
    storefrontCategoryFilter: null,
    storefrontSearchQuery: "",

    cart: {
        id: null,
        restaurantId: null,
        restaurantName: null,
        totalPrice: 0,
        items: []
    },

    myOrders: [],
    activeOrderModalId: null,

    // Admin Studio state
    adminWorkspace: "restaurants",
    adminRestaurants: [],
    adminSelectedRestaurantId: null,
    adminRestaurantDishes: [],
    adminOrders: [],
    adminOrderStatusFilter: "ALL",
    pendingUploadTarget: null // { type: 'restaurant' | 'menu', id: number }
};

/* ============================================================================
   1. CULINARY SVG PLACEHOLDERS & IMAGE PATH RESOLUTION
   ============================================================================ */

function createSvgPlaceholder(title = "FoodExpress", bg = "#EDE7DD", fg = "#5B6E2C") {
    const safeText = String(title).slice(0, 22).replace(/[<>&"']/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="100%" height="100%" fill="${bg}"/>
    <circle cx="300" cy="175" r="54" fill="${fg}" fill-opacity="0.14"/>
    <path d="M286 152v46M300 152v46M314 152v20c0 8-6 14-14 14" stroke="${fg}" stroke-width="5" stroke-linecap="round" fill="none"/>
    <text x="300" y="275" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#241C15" text-anchor="middle">${safeText}</text>
  </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function resolveImageUrl(imagePath, fallbackTitle = "Kitchen") {
    if (!imagePath || typeof imagePath !== "string") {
        return createSvgPlaceholder(fallbackTitle);
    }
    const trimmed = imagePath.trim();
    const invalidPlaceholders = ["string", "null", "undefined", "none", "n/a"];
    if (!trimmed || invalidPlaceholders.includes(trimmed.toLowerCase())) {
        return createSvgPlaceholder(fallbackTitle);
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
        return trimmed;
    }
    if (trimmed.startsWith("/")) {
        return `${API_BASE}${trimmed}`;
    }
    return `${API_BASE}/${trimmed}`;
}

// Automatically swap any 404 image with a clean culinary SVG placeholder
document.addEventListener(
    "error",
    (e) => {
        const target = e.target;
        if (target && target.tagName === "IMG" && !target.dataset.fallbackApplied) {
            target.dataset.fallbackApplied = "true";
            target.src = createSvgPlaceholder(target.alt || "FoodExpress");
        }
    },
    true
);

function formatCurrency(value) {
    const num = Number(value || 0);
    return `$${num.toFixed(2)}`;
}

function formatDateTime(isoString) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getCategoryIcon(name = "") {
    const lower = name.toLowerCase();
    if (lower.includes("pizza") || lower.includes("italian")) return "🍕";
    if (lower.includes("burger") || lower.includes("grill")) return "🍔";
    if (lower.includes("sushi") || lower.includes("asian") || lower.includes("ramen")) return "🍣";
    if (lower.includes("georgian") || lower.includes("khachapuri") || lower.includes("bakery")) return "🥖";
    if (lower.includes("dessert") || lower.includes("sweet") || lower.includes("cake")) return "🍰";
    if (lower.includes("drink") || lower.includes("coffee") || lower.includes("beverage")) return "☕";
    if (lower.includes("salad") || lower.includes("healthy") || lower.includes("vegan")) return "🥗";
    return "🍽️";
}

/* ============================================================================
   2. UNIFIED API FETCH CLIENT & ENVELOPE / PROBLEMDETAILS UNWRAPPING
   ============================================================================ */

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast-card toast-${type}`;
    toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button type="button" class="btn-icon-close" style="color:inherit;font-size:1.1rem;">&times;</button>
  `;
    toast.querySelector("button").addEventListener("click", () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4600);
}

function showConfirmModal({ title = "Confirm Action", message = "Are you sure?", confirmText = "Confirm" }) {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirmModal");
        document.getElementById("confirmModalTitle").textContent = title;
        document.getElementById("confirmModalMessage").textContent = message;
        const acceptBtn = document.getElementById("confirmModalAcceptBtn");
        const cancelBtn = document.getElementById("confirmModalCancelBtn");
        const crossBtn = document.getElementById("confirmModalCancelCross");

        acceptBtn.textContent = confirmText;
        modal.classList.remove("hidden");

        const cleanup = (result) => {
            modal.classList.add("hidden");
            acceptBtn.onclick = null;
            cancelBtn.onclick = null;
            crossBtn.onclick = null;
            resolve(result);
        };

        acceptBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
        crossBtn.onclick = () => cleanup(false);
    });
}

function extractErrorMessage(payload, status) {
    if (!payload) return `Request failed with status ${status}`;
    const messages = [];

    if (payload.message) messages.push(payload.message);
    if (payload.title && payload.title !== payload.message) messages.push(payload.title);
    if (payload.detail) messages.push(payload.detail);

    if (payload.errors && typeof payload.errors === "object") {
        for (const [field, errArr] of Object.entries(payload.errors)) {
            if (Array.isArray(errArr)) {
                messages.push(`${field ? field + ": " : ""}${errArr.join(", ")}`);
            } else if (typeof errArr === "string") {
                messages.push(errArr);
            }
        }
    }
    return messages.filter(Boolean).join(" • ") || `HTTP Error ${status}`;
}

async function apiFetch(endpoint, options = {}, { silentError = false } = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = new Headers(options.headers || {});

    // Attach JWT token if authenticated
    if (state.auth?.token) {
        headers.set("Authorization", `Bearer ${state.auth.token}`);
    }

    // Automatically set JSON Content-Type unless sending FormData
    const isFormData = options.body instanceof FormData;
    if (!isFormData && options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const fetchConfig = {
        ...options,
        headers
    };

    let response;
    try {
        response = await fetch(url, fetchConfig);
    } catch (networkErr) {
        if (!silentError) {
            showToast(`Network error reaching ${endpoint}. Ensure the FoodExpress API server is running.`, "error");
        }
        throw networkErr;
    }

    let payload = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("json")) {
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
    } else {
        const text = await response.text();
        if (text) {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = { message: text };
            }
        }
    }

    if (response.status === 401) {
        if (state.auth && !endpoint.includes("/api/Auth/Login")) {
            clearAuthSession();
            showToast("Your session has expired. Please sign in again.", "error");
        }
    }

    if (!response.ok || (payload && payload.success === false)) {
        const errMsg = extractErrorMessage(payload, response.status);
        if (!silentError) {
            showToast(errMsg, "error");
        }
        const err = new Error(errMsg);
        err.status = response.status;
        err.payload = payload;
        throw err;
    }

    // Unwrap ApiResponse<T> envelope
    if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
        return {
            success: payload.success,
            message: payload.message,
            data: payload.data,
            raw: payload
        };
    }

    return {
        success: true,
        message: payload?.message || null,
        data: payload,
        raw: payload
    };
}

/* ============================================================================
   3. AUTHENTICATION, JWT DECODING & SESSION PERSISTENCE
   ============================================================================ */

function decodeJwtClaims(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return {};
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(json);
    } catch {
        return {};
    }
}

function detectAdminRole(authData) {
    const roles = Array.isArray(authData?.roles) ? [...authData.roles] : [];
    if (authData?.token) {
        const claims = decodeJwtClaims(authData.token);
        const msRoleClaim = claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        const shortRoleClaim = claims["role"] || claims["roles"];
        [msRoleClaim, shortRoleClaim].forEach((claimVal) => {
            if (Array.isArray(claimVal)) roles.push(...claimVal);
            else if (typeof claimVal === "string") roles.push(claimVal);
        });
    }
    const uniqueRoles = [...new Set(roles)];
    const isAdmin = uniqueRoles.some((r) => String(r).toLowerCase() === "admin");
    return { roles: uniqueRoles, isAdmin };
}

function saveAuthSession(authData) {
    const { roles, isAdmin } = detectAdminRole(authData);
    state.auth = {
        token: authData.token,
        expiresAt: authData.expiresAt,
        userId: authData.userId,
        email: authData.email,
        userName: authData.userName || authData.email,
        roles,
        isAdmin
    };
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(state.auth));
    updateHeaderAuthUI();
}

function loadAuthSessionFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_AUTH);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.expiresAt && new Date(parsed.expiresAt) <= new Date()) {
            localStorage.removeItem(STORAGE_KEY_AUTH);
            return;
        }
        const { roles, isAdmin } = detectAdminRole(parsed);
        state.auth = { ...parsed, roles, isAdmin };
    } catch {
        localStorage.removeItem(STORAGE_KEY_AUTH);
    }
}

function clearAuthSession() {
    state.auth = null;
    state.profile = null;
    state.addresses = [];
    state.selectedAddressId = null;
    state.cart = { id: null, restaurantId: null, restaurantName: null, totalPrice: 0, items: [] };
    state.myOrders = [];
    localStorage.removeItem(STORAGE_KEY_AUTH);
    updateHeaderAuthUI();
    renderCartUI();
    switchView("discovery");
}

function updateHeaderAuthUI() {
    const authBtn = document.getElementById("headerAuthBtn");
    const profileBtn = document.getElementById("headerProfileBtn");
    const myOrdersBtn = document.getElementById("navMyOrdersBtn");
    const adminStudioBtn = document.getElementById("navAdminStudioBtn");
    const adminBadge = document.getElementById("headerAdminBadge");
    const userNameEl = document.getElementById("headerUserName");
    const avatarImg = document.getElementById("headerAvatarImg");

    if (state.auth?.token) {
        authBtn.classList.add("hidden");
        profileBtn.classList.remove("hidden");
        myOrdersBtn.classList.remove("hidden");

        userNameEl.textContent = state.profile?.userName || state.auth.userName || "Account";
        const avatarPath =
            state.profile?.imagePath ||
            state.profile?.profileImagePath ||
            state.profile?.profilePictureUrl ||
            null;
        avatarImg.src = resolveImageUrl(avatarPath, state.auth.userName || "U");

        if (state.auth.isAdmin) {
            adminStudioBtn.classList.remove("hidden");
            adminBadge.classList.remove("hidden");
        } else {
            adminStudioBtn.classList.add("hidden");
            adminBadge.classList.add("hidden");
        }
    } else {
        authBtn.classList.remove("hidden");
        profileBtn.classList.add("hidden");
        myOrdersBtn.classList.add("hidden");
        adminStudioBtn.classList.add("hidden");
        document.getElementById("headerAddressLabel").textContent = "Select delivery address";
    }
}

/* ============================================================================
   4. AUTH & USERS ENDPOINTS (Endpoints #1, #2, #3, #4)
   ============================================================================ */

// Endpoint #1: POST /api/Auth/Register
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const userName = document.getElementById("registerUserName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    const res = await apiFetch("/api/Auth/Register", {
        method: "POST",
        body: JSON.stringify({ userName, email, password })
    });

    if (res.data) {
        saveAuthSession(res.data);
        closeModal("authModal");
        showToast(`Welcome to FoodExpress, ${res.data.userName || userName}!`, "success");
        await bootstrapAuthenticatedUser();
    }
}

// Endpoint #2: POST /api/Auth/Login
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const res = await apiFetch("/api/Auth/Login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });

    if (res.data) {
        saveAuthSession(res.data);
        closeModal("authModal");
        showToast(`Signed in as ${res.data.userName || email}`, "success");
        await bootstrapAuthenticatedUser();
    }
}

// Endpoint #3: GET /api/Users/profile
async function fetchUserProfile() {
    if (!state.auth?.token) return;
    try {
        const res = await apiFetch("/api/Users/profile", { method: "GET" }, { silentError: true });
        if (res.data) {
            state.profile = res.data;
            if (Array.isArray(res.data.roles)) {
                const merged = detectAdminRole({ ...state.auth, roles: res.data.roles });
                state.auth.roles = merged.roles;
                state.auth.isAdmin = merged.isAdmin;
                localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(state.auth));
            }
            updateHeaderAuthUI();
            renderProfileModalContent();
        }
    } catch {
        // Fallback to JWT session claims if profile endpoint returns 404
        renderProfileModalContent();
    }
}

function renderProfileModalContent() {
    if (!state.auth) return;
    const p = state.profile || {};
    const userName = p.userName || p.username || state.auth.userName || "—";
    const email = p.email || state.auth.email || "—";
    const userId = p.id || p.userId || state.auth.userId || "—";
    const imgPath = p.imagePath || p.profileImagePath || p.profilePictureUrl || null;

    document.getElementById("profileModalUserName").textContent = userName;
    document.getElementById("profileModalEmail").textContent = email;
    document.getElementById("profileModalUserId").textContent = userId;
    document.getElementById("profileModalAvatar").src = resolveImageUrl(imgPath, userName);

    const rolesContainer = document.getElementById("profileModalRoles");
    rolesContainer.innerHTML = (state.auth.roles.length ? state.auth.roles : ["Customer"])
        .map((r) => `<span class="role-chip">${escapeHtml(r)}</span>`)
        .join(" ");
}

// Endpoint #4: POST /api/Users/profile-image
async function handleProfileImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    await apiFetch("/api/Users/profile-image", {
        method: "POST",
        body: formData
    });

    showToast("Profile picture updated!", "success");
    await fetchUserProfile();
    e.target.value = "";
}

/* ============================================================================
   5. ADDRESSES ENDPOINTS (Endpoints #5, #6, #7)
   ============================================================================ */

// Endpoint #5: GET /api/Addresses/my
async function fetchMyAddresses() {
    if (!state.auth?.token) return;
    const res = await apiFetch("/api/Addresses/my", { method: "GET" }, { silentError: true });
    state.addresses = Array.isArray(res.data) ? res.data : [];

    const savedId = Number(localStorage.getItem(STORAGE_KEY_ADDR));
    if (savedId && state.addresses.some((a) => a.id === savedId)) {
        state.selectedAddressId = savedId;
    } else if (state.addresses.length > 0) {
        state.selectedAddressId = state.addresses[0].id;
    } else {
        state.selectedAddressId = null;
    }

    renderAddressesUI();
}

function renderAddressesUI() {
    const headerLabel = document.getElementById("headerAddressLabel");
    const selected = state.addresses.find((a) => a.id === Number(state.selectedAddressId));
    headerLabel.textContent = selected
        ? `${selected.street}, ${selected.city}`
        : state.auth
            ? "Add delivery address"
            : "Select delivery address";

    // Checkout dropdown in Cart Drawer
    const checkoutSelect = document.getElementById("checkoutAddressSelect");
    if (state.addresses.length === 0) {
        checkoutSelect.innerHTML = `<option value="">No saved addresses — click '+ Add / Manage'</option>`;
    } else {
        checkoutSelect.innerHTML = state.addresses
            .map(
                (a) =>
                    `<option value="${a.id}" ${a.id === Number(state.selectedAddressId) ? "selected" : ""}>
            ${escapeHtml(a.street)} (${escapeHtml(a.city)})
          </option>`
            )
            .join("");
    }

    // Address Manager Modal List
    const listEl = document.getElementById("savedAddressesList");
    if (!listEl) return;
    if (state.addresses.length === 0) {
        listEl.innerHTML = `<div class="empty-state-box">No delivery addresses saved yet. Add your street and city above.</div>`;
        return;
    }

    listEl.innerHTML = state.addresses
        .map(
            (addr) => `
      <div class="address-row-card">
        <div>
          <strong>${escapeHtml(addr.street)}</strong>
          <div class="cart-item-sub">${escapeHtml(addr.city)} • <span class="mono">ID #${addr.id}</span></div>
        </div>
        <div class="admin-row-actions">
          <button type="button" class="btn-secondary-sm" data-select-addr="${addr.id}">
            ${addr.id === Number(state.selectedAddressId) ? "✓ Active" : "Use This"}
          </button>
          <button type="button" class="btn-danger" data-delete-addr="${addr.id}" title="DELETE /api/Addresses/${addr.id}">
            Delete
          </button>
        </div>
      </div>
    `
        )
        .join("");

    listEl.querySelectorAll("[data-select-addr]").forEach((btn) => {
        btn.addEventListener("click", () => {
            state.selectedAddressId = Number(btn.dataset.selectAddr);
            localStorage.setItem(STORAGE_KEY_ADDR, String(state.selectedAddressId));
            renderAddressesUI();
            updatePlaceOrderButtonState();
            showToast("Delivery address selected", "success");
        });
    });

    listEl.querySelectorAll("[data-delete-addr]").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteAddress(Number(btn.dataset.deleteAddr)));
    });

    updatePlaceOrderButtonState();
}

// Endpoint #6: POST /api/Addresses
async function handleCreateAddressSubmit(e) {
    e.preventDefault();
    if (!state.auth?.token) {
        openModal("authModal");
        return;
    }
    const city = document.getElementById("addressCityInput").value.trim();
    const street = document.getElementById("addressStreetInput").value.trim();

    const res = await apiFetch("/api/Addresses", {
        method: "POST",
        body: JSON.stringify({ street, city })
    });

    document.getElementById("createAddressForm").reset();
    showToast("Delivery address saved!", "success");
    await fetchMyAddresses();
    if (res.data?.id) {
        state.selectedAddressId = res.data.id;
        localStorage.setItem(STORAGE_KEY_ADDR, String(res.data.id));
        renderAddressesUI();
    }
}

// Endpoint #7: DELETE /api/Addresses/{id}
async function handleDeleteAddress(addressId) {
    const confirmed = await showConfirmModal({
        title: "Remove Address",
        message: "Delete this delivery address from your account?",
        confirmText: "Delete Address"
    });
    if (!confirmed) return;

    await apiFetch(`/api/Addresses/${addressId}`, { method: "DELETE" });
    showToast("Address deleted.", "info");
    await fetchMyAddresses();
}

/* ============================================================================
   6. CATEGORIES & DISCOVERY CATALOG (Endpoints #8, #9, #17, #19, #21)
   ============================================================================ */

// Endpoint #17: GET /api/Menu/categories
async function fetchCategories() {
    const res = await apiFetch("/api/Menu/categories", { method: "GET" });
    const rawList = Array.isArray(res.data) ? res.data : [];
    state.categories = rawList.map((c) => ({
        id: c.id ?? c.categoryId,
        name: c.name ?? c.categoryName ?? "Category"
    }));

    document.getElementById("heroStatCategories").textContent = String(state.categories.length);
    renderCategoryPills();
    populateAdminCategorySelects();
    renderAdminCategoriesList();
}

function renderCategoryPills() {
    const track = document.getElementById("discoveryCategoryPills");
    const allActive = state.selectedCategoryId === null ? "active" : "";

    const pillsHtml = [
        `<button type="button" class="category-pill ${allActive}" data-cat-id="">
      <span>✨</span><span>All Categories</span>
    </button>`,
        ...state.categories.map((cat) => {
            const isAct = Number(state.selectedCategoryId) === Number(cat.id) ? "active" : "";
            return `<button type="button" class="category-pill ${isAct}" data-cat-id="${cat.id}">
        <span>${getCategoryIcon(cat.name)}</span>
        <span>${escapeHtml(cat.name)}</span>
      </button>`;
        })
    ].join("");

    track.innerHTML = pillsHtml;

    track.querySelectorAll(".category-pill").forEach((pill) => {
        pill.addEventListener("click", async () => {
            const val = pill.dataset.catId;
            state.selectedCategoryId = val ? Number(val) : null;
            state.catalogPage = 1;
            renderCategoryPills();

            if (state.discoveryMode === "restaurants") {
                await fetchDiscoveryRestaurants();
            } else {
                if (state.selectedCategoryId) {
                    await fetchDishesByCategory(state.selectedCategoryId);
                } else {
                    await searchDishesGlobally(document.getElementById("globalDishSearchInput").value.trim());
                }
            }
        });
    });
}

// Endpoint #8: GET /api/Restaurants?search=&categoryId=&page=&pageSize=
async function fetchDiscoveryRestaurants() {
    const params = new URLSearchParams();
    if (state.catalogSearch) params.set("search", state.catalogSearch);
    if (state.selectedCategoryId) params.set("categoryId", String(state.selectedCategoryId));
    params.set("page", String(state.catalogPage));
    params.set("pageSize", String(state.catalogPageSize));

    const res = await apiFetch(`/api/Restaurants?${params.toString()}`, { method: "GET" });
    const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
    state.restaurants = list;

    if (state.catalogPage === 1 && !state.catalogSearch && !state.selectedCategoryId) {
        document.getElementById("heroStatRestaurants").textContent = String(list.length);
    }

    renderDiscoveryRestaurantsGrid();
}

function renderDiscoveryRestaurantsGrid() {
    const grid = document.getElementById("restaurantsGrid");
    const heading = document.getElementById("restaurantSectionHeading");
    const caption = document.getElementById("restaurantSectionCaption");
    const pageText = document.getElementById("pageIndicatorText");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    const activeCat = state.categories.find((c) => c.id === state.selectedCategoryId);
    heading.textContent = activeCat ? `${activeCat.name} Kitchens` : "All Partner Kitchens";
    caption.textContent = state.catalogSearch
        ? `Filtered by keyword "${state.catalogSearch}"`
        : "Click any open or closed restaurant to inspect its storefront & menu";

    pageText.textContent = `Page ${state.catalogPage}`;
    prevBtn.disabled = state.catalogPage <= 1;
    nextBtn.disabled = state.restaurants.length < state.catalogPageSize;

    if (state.restaurants.length === 0) {
        grid.innerHTML = `
      <div class="empty-state-box" style="grid-column: 1 / -1;">
        <h3>No matching kitchens found</h3>
        <p>Try clearing your search filter or switching to another culinary category.</p>
      </div>
    `;
        return;
    }

    grid.innerHTML = state.restaurants
        .map((rest) => {
            const isOpen = Boolean(rest.isActive);
            const imgUrl = resolveImageUrl(rest.imagePath, rest.name);
            return `
        <article class="restaurant-card ${isOpen ? "" : "is-closed"}" data-rest-id="${rest.id}">
          <div class="restaurant-card-media">
            <img src="${imgUrl}" alt="${escapeHtml(rest.name)}" loading="lazy" />
            <span class="status-pill ${isOpen ? "open" : "closed"}">
              ${isOpen ? "● Open for Delivery" : "● Currently Closed"}
            </span>
          </div>
          <div class="restaurant-card-body">
            <h3 class="restaurant-card-title">${escapeHtml(rest.name)}</h3>
            <p class="restaurant-card-address">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${escapeHtml(rest.address || "Tbilisi")}</span>
            </p>
            <div class="restaurant-card-footer">
              <span>${isOpen ? "Explore Menu & Order" : "Browse Menu (Closed)"}</span>
              <span class="mono">&rarr;</span>
            </div>
          </div>
        </article>
      `;
        })
        .join("");

    grid.querySelectorAll(".restaurant-card").forEach((card) => {
        card.addEventListener("click", () => {
            const restId = Number(card.dataset.restId);
            openRestaurantStorefront(restId);
        });
    });
}

// Endpoint #9: GET /api/Restaurants/search?q=... (Global Header Instant Autocomplete)
let searchDebounceTimer = null;
let autocompleteRequestId = 0;

function normalizeDishList(rawData) {
    const list = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.items) ? rawData.items : [];
    return list.map((d) => {
        const cat = state.categories.find((c) => Number(c.id) === Number(d.categoryId));
        const rest =
            state.restaurants.find((r) => Number(r.id) === Number(d.restaurantId)) ||
            state.adminRestaurants.find((r) => Number(r.id) === Number(d.restaurantId));
        return {
            ...d,
            categoryName: d.categoryName || cat?.name || "Menu",
            restaurantName: d.restaurantName || rest?.name || (d.restaurantId ? `Kitchen #${d.restaurantId}` : "Partner Kitchen"),
            restaurantIsActive: d.restaurantIsActive !== undefined ? d.restaurantIsActive : (rest?.isActive ?? true)
        };
    });
}

function setupGlobalAutocompleteSearch() {
    const input = document.getElementById("globalSearchInput");
    const dropdown = document.getElementById("globalSearchDropdown");

    input.addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        const q = input.value.trim();
        if (!q) {
            autocompleteRequestId++;
            dropdown.classList.add("hidden");
            dropdown.innerHTML = "";
            return;
        }
        searchDebounceTimer = setTimeout(() => runGlobalAutocomplete(q), 220);
    });

    input.addEventListener("Focus", () => {
        if (input.value.trim() && dropdown.innerHTML.trim()) {
            dropdown.classList.remove("hidden");
        }
    });

    input.addEventListener("keydown", async (e) => {
        if (e.key === "Escape") {
            dropdown.classList.add("hidden");
            input.blur();
        } else if (e.key === "Enter") {
            e.preventDefault();
            const q = input.value.trim();
            if (!q) return;
            dropdown.classList.add("hidden");
            // Switch to Discovery view and filter catalog directly
            switchView("discovery");
            if (state.discoveryMode === "dishes") {
                document.getElementById("globalDishSearchInput").value = q;
                await searchDishesGlobally(q);
            } else {
                const catInput = document.getElementById("catalogRestaurantSearchInput");
                catInput.value = q;
                state.catalogSearch = q;
                state.catalogPage = 1;
                document.getElementById("clearCatalogSearchBtn").classList.remove("hidden");
                await fetchDiscoveryRestaurants();
            }
        }
    });

    document.addEventListener("click", (e) => {
        if (!document.getElementById("globalSearchWrap").contains(e.target)) {
            dropdown.classList.add("hidden");
        }
    });
}

async function runGlobalAutocomplete(query) {
    const dropdown = document.getElementById("globalSearchDropdown");
    const currentReqId = ++autocompleteRequestId;

    try {
        const [restRes, dishRes] = await Promise.all([
            apiFetch(`/api/Restaurants/search?q=${encodeURIComponent(query)}`, { method: "GET" }, { silentError: true }).catch(() => ({ data: [] })),
            apiFetch(`/api/Menu/search?q=${encodeURIComponent(query)}`, { method: "GET" }, { silentError: true }).catch(() => ({ data: [] }))
        ]);

        // Ignore stale responses if the user kept typing
        if (currentReqId !== autocompleteRequestId) return;

        const rawRests = Array.isArray(restRes.data) ? restRes.data : restRes.data?.items || [];
        const restaurants = rawRests.slice(0, 5);
        const dishes = normalizeDishList(dishRes.data).slice(0, 6);

        if (restaurants.length === 0 && dishes.length === 0) {
            dropdown.innerHTML = `
                <div class="empty-state-box" style="padding:18px 12px;border:none;">
                    No kitchens or dishes found for "<strong>${escapeHtml(query)}</strong>"
                </div>
            `;
            dropdown.classList.remove("hidden");
            return;
        }

        let html = "";

        if (restaurants.length > 0) {
            html += `
                <div class="autocomplete-group-title">
                    <span>Partner Kitchens</span>
                    <span class="mono">${restaurants.length}</span>
                </div>
            `;
            html += restaurants
                .map(
                    (r) => `
                    <button type="button" class="autocomplete-item" data-jump-rest="${r.id}">
                        <span class="autocomplete-item-left">
                            <img src="${resolveImageUrl(r.imagePath, r.name)}" class="autocomplete-thumb" alt="${escapeHtml(r.name)}" />
                            <span class="autocomplete-meta">
                                <span class="autocomplete-title">${escapeHtml(r.name)}</span>
                                <span class="autocomplete-sub">${escapeHtml(r.address || "Local Kitchen")}</span>
                            </span>
                        </span>
                        <span class="autocomplete-right">
                            <span class="dish-avail-badge ${r.isActive ? "in-stock" : "sold-out"}">
                                ${r.isActive ? "Open" : "Closed"}
                            </span>
                        </span>
                    </button>
                `
                )
                .join("");
        }

        if (dishes.length > 0) {
            html += `
                <div class="autocomplete-group-title">
                    <span>Menu Dishes</span>
                    <span class="mono">${dishes.length}</span>
                </div>
            `;
            html += dishes
                .map(
                    (d) => `
                    <button type="button" class="autocomplete-item" data-jump-dish="${d.id}">
                        <span class="autocomplete-item-left">
                            <img src="${resolveImageUrl(d.imagePath, d.name)}" class="autocomplete-thumb" alt="${escapeHtml(d.name)}" />
                            <span class="autocomplete-meta">
                                <span class="autocomplete-title">${escapeHtml(d.name)}</span>
                                <span class="autocomplete-sub">${escapeHtml(d.restaurantName)} • ${escapeHtml(d.categoryName)}</span>
                            </span>
                        </span>
                        <span class="autocomplete-right">
                            <span class="mono dish-price">${formatCurrency(d.price)}</span>
                        </span>
                    </button>
                `
                )
                .join("");
        }

        dropdown.innerHTML = html;
        dropdown.classList.remove("hidden");

        dropdown.querySelectorAll("[data-jump-rest]").forEach((btn) => {
            btn.addEventListener("click", () => {
                dropdown.classList.add("hidden");
                openRestaurantStorefront(Number(btn.dataset.jumpRest));
            });
        });

        dropdown.querySelectorAll("[data-jump-dish]").forEach((btn) => {
            btn.addEventListener("click", () => {
                dropdown.classList.add("hidden");
                openDishQuickViewModal(Number(btn.dataset.jumpDish));
            });
        });
    } catch {
        if (currentReqId === autocompleteRequestId) {
            dropdown.classList.add("hidden");
        }
    }
}

// Endpoint #19: GET /api/Menu/category/{categoryId}
async function fetchDishesByCategory(categoryId) {
    const res = await apiFetch(`/api/Menu/category/${categoryId}`, { method: "GET" });
    state.globalDishes = normalizeDishList(res.data);
    const cat = state.categories.find((c) => Number(c.id) === Number(categoryId));
    document.getElementById("dishExplorerHeading").textContent = cat
        ? `All ${cat.name} Dishes Across Kitchens`
        : "Dishes by Category";
    renderGlobalDishesGrid();
}

// Endpoint #21 (Global mode): GET /api/Menu/search?q=...
async function searchDishesGlobally(query = "") {
    const q = query.trim() || "a";
    const res = await apiFetch(`/api/Menu/search?q=${encodeURIComponent(q)}`, { method: "GET" });
    state.globalDishes = normalizeDishList(res.data);
    document.getElementById("dishExplorerHeading").textContent = query.trim()
        ? `Dish Search Results for "${query.trim()}"`
        : "Featured Dishes Across All Kitchens";
    renderGlobalDishesGrid();
}


function renderGlobalDishesGrid() {
    const container = document.getElementById("globalDishesGrid");
    if (state.globalDishes.length === 0) {
        container.innerHTML = `
      <div class="empty-state-box" style="grid-column: 1 / -1;">
        <h3>No dishes found</h3>
        <p>Select another category pill above or search by dish keyword.</p>
      </div>
    `;
        return;
    }
    container.innerHTML = state.globalDishes.map((dish) => renderDishCardHtml(dish, true)).join("");
    bindDishCardEvents(container);
}

/* ============================================================================
   7. RESTAURANT STOREFRONT & MENU ENDPOINTS (Endpoints #10, #11, #21, #22)
   ============================================================================ */

// Endpoint #10: GET /api/Restaurants/{id} & Endpoint #11: GET /api/Restaurants/{id}/menu
async function openRestaurantStorefront(restaurantId) {
    state.currentRestaurantId = restaurantId;
    state.storefrontCategoryFilter = null;
    state.storefrontSearchQuery = "";
    document.getElementById("storefrontMenuSearchInput").value = "";
    document.getElementById("clearStorefrontSearchBtn").classList.add("hidden");

    switchView("storefront");

    const [restRes, menuRes] = await Promise.all([
        apiFetch(`/api/Restaurants/${restaurantId}`, { method: "GET" }),
        apiFetch(`/api/Restaurants/${restaurantId}/menu`, { method: "GET" })
    ]);

    state.currentRestaurant = restRes.data;
    state.currentRestaurantMenu = Array.isArray(menuRes.data)
        ? menuRes.data
        : Array.isArray(restRes.data?.menuItems)
            ? restRes.data.menuItems
            : [];

    renderStorefrontView();
}

function renderStorefrontView() {
    const rest = state.currentRestaurant;
    if (!rest) return;

    const isOpen = Boolean(rest.isActive);
    document.getElementById("storefrontTitle").textContent = rest.name;
    document.getElementById("storefrontAddress").textContent = rest.address || "";
    document.getElementById("storefrontHeroMedia").innerHTML = `
    <img src="${resolveImageUrl(rest.imagePath, rest.name)}" alt="${escapeHtml(rest.name)}" />
  `;
    document.getElementById("storefrontHeroBadges").innerHTML = `
    <span class="status-pill ${isOpen ? "open" : "closed"}" style="position:static;">
      ${isOpen ? "● Open for Delivery" : "● Temporarily Closed"}
    </span>
  `;

    const closedBanner = document.getElementById("storefrontClosedBanner");
    closedBanner.classList.toggle("hidden", isOpen);

    // Build Storefront Category Tabs from the restaurant's menu
    const uniqueCats = [];
    const seen = new Set();
    state.currentRestaurantMenu.forEach((item) => {
        if (item.categoryId && !seen.has(item.categoryId)) {
            seen.add(item.categoryId);
            uniqueCats.push({
                id: item.categoryId,
                name: item.categoryName || state.categories.find((c) => c.id === item.categoryId)?.name || "Menu"
            });
        }
    });

    const tabsEl = document.getElementById("storefrontCategoryTabs");
    tabsEl.innerHTML = [
        `<button type="button" class="category-pill ${state.storefrontCategoryFilter === null ? "active" : ""}" data-sf-cat="">
      All Items (${state.currentRestaurantMenu.length})
    </button>`,
        ...uniqueCats.map(
            (c) => `
      <button type="button" class="category-pill ${state.storefrontCategoryFilter === c.id ? "active" : ""}" data-sf-cat="${c.id}">
        ${getCategoryIcon(c.name)} ${escapeHtml(c.name)}
      </button>
    `
        )
    ].join("");

    tabsEl.querySelectorAll("[data-sf-cat]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const val = btn.dataset.sfCat;
            state.storefrontCategoryFilter = val ? Number(val) : null;
            renderStorefrontView();
        });
    });

    renderStorefrontMenuList(state.currentRestaurantMenu);
}

function renderStorefrontMenuList(items) {
    const container = document.getElementById("storefrontMenuContainer");
    const filtered = state.storefrontCategoryFilter
        ? items.filter((i) => Number(i.categoryId) === Number(state.storefrontCategoryFilter))
        : items;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state-box">No menu items match this filter.</div>`;
        return;
    }

    // Group by category
    const groups = new Map();
    filtered.forEach((dish) => {
        const catName =
            dish.categoryName ||
            state.categories.find((c) => c.id === dish.categoryId)?.name ||
            "House Specialties";
        if (!groups.has(catName)) groups.set(catName, []);
        groups.get(catName).push(dish);
    });

    let html = "";
    for (const [catName, dishList] of groups.entries()) {
        html += `
      <div class="menu-category-block">
        <h3 class="menu-category-heading">${getCategoryIcon(catName)} ${escapeHtml(catName)}</h3>
        <div class="dishes-grid">
          ${dishList.map((d) => renderDishCardHtml(d, false)).join("")}
        </div>
      </div>
    `;
    }

    container.innerHTML = html;
    bindDishCardEvents(container);
}

// Endpoint #21 (Scoped to Restaurant): GET /api/Menu/search?q=...&restaurantId={currentRestaurantId}
async function handleStorefrontMenuSearch(query) {
    if (!state.currentRestaurantId) return;
    const cleanQuery = query.trim();
    if (!cleanQuery) {
        renderStorefrontMenuList(state.currentRestaurantMenu);
        return;
    }

    // Reset category filter while searching so matching items in other tabs aren't hidden
    state.storefrontCategoryFilter = null;
    document.querySelectorAll("#storefrontCategoryTabs .category-pill").forEach((btn) => {
        btn.classList.toggle("active", !btn.dataset.sfCat);
    });

    const res = await apiFetch(
        `/api/Menu/search?q=${encodeURIComponent(cleanQuery)}&restaurantId=${state.currentRestaurantId}`,
        { method: "GET" }
    );
    const results = normalizeDishList(res.data);
    renderStorefrontMenuList(results);
}

function renderDishCardHtml(dish, showRestaurantName = false) {
    const restaurantIsActive =
        dish.restaurantIsActive !== undefined
            ? Boolean(dish.restaurantIsActive)
            : state.currentRestaurant
                ? Boolean(state.currentRestaurant.isActive)
                : true;

    const canOrder = Boolean(dish.isAvailable) && restaurantIsActive;
    const cartItem = state.cart.items.find((ci) => ci.menuItemId === dish.id);
    const qtyInCart = cartItem ? cartItem.quantity : 0;

    let actionControlHtml = "";
    if (qtyInCart > 0 && canOrder) {
        actionControlHtml = `
      <div class="dish-stepper-pill" data-stop-prop="true">
        <button type="button" data-step-dish="${dish.id}" data-step-delta="-1" aria-label="Decrease quantity">&minus;</button>
        <span>${qtyInCart}</span>
        <button type="button" data-step-dish="${dish.id}" data-step-delta="1" aria-label="Increase quantity">+</button>
      </div>
    `;
    } else {
        actionControlHtml = `
      <button
        type="button"
        class="btn-add-dish"
        data-add-dish="${dish.id}"
        data-dish-rest-id="${dish.restaurantId || state.currentRestaurantId || ""}"
        data-dish-rest-name="${escapeHtml(dish.restaurantName || state.currentRestaurant?.name || "")}"
        data-dish-name="${escapeHtml(dish.name)}"
        ${canOrder ? "" : "disabled"}
      >
        ${!restaurantIsActive ? "Closed" : dish.isAvailable ? "+ Add" : "Sold Out"}
      </button>
    `;
    }

    return `
    <article class="dish-card ${canOrder ? "" : "unavailable"}" data-open-dish="${dish.id}">
      <div class="dish-info-col">
        <div>
          <div class="dish-meta-top">
            ${dish.categoryName ? `<span class="dish-category-tag">${escapeHtml(dish.categoryName)}</span>` : ""}
            ${showRestaurantName && dish.restaurantName ? `<span class="dish-restaurant-tag">${escapeHtml(dish.restaurantName)}</span>` : ""}
          </div>
          <h4 class="dish-name">${escapeHtml(dish.name)}</h4>
        </div>
        <div class="dish-price-row">
          <span class="dish-price">${formatCurrency(dish.price)}</span>
          <span class="dish-avail-badge ${dish.isAvailable ? "in-stock" : "sold-out"}">
            ${dish.isAvailable ? "Available" : "Sold Out"}
          </span>
        </div>
      </div>
      <div class="dish-media-col">
        <img src="${resolveImageUrl(dish.imagePath, dish.name)}" alt="${escapeHtml(dish.name)}" loading="lazy" />
        <div class="dish-floating-action">
          ${actionControlHtml}
        </div>
      </div>
    </article>
  `;
}

function bindDishCardEvents(root) {
    root.querySelectorAll("[data-open-dish]").forEach((card) => {
        card.addEventListener("click", (e) => {
            if (
                e.target.closest("[data-add-dish]") ||
                e.target.closest("[data-step-dish]") ||
                e.target.closest("[data-stop-prop]")
            ) {
                return;
            }
            openDishQuickViewModal(Number(card.dataset.openDish));
        });
    });

    root.querySelectorAll("[data-add-dish]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            handleAddToCart({
                menuItemId: Number(btn.dataset.addDish),
                quantity: 1,
                restaurantId: Number(btn.dataset.dishRestId),
                restaurantName: btn.dataset.dishRestName,
                dishName: btn.dataset.dishName
            });
        });
    });

    root.querySelectorAll("[data-step-dish]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const menuItemId = Number(btn.dataset.stepDish);
            const delta = Number(btn.dataset.stepDelta);
            const existing = state.cart.items.find((i) => i.menuItemId === menuItemId);
            if (!existing) return;
            const nextQty = existing.quantity + delta;
            if (nextQty <= 0) {
                handleRemoveCartItem(menuItemId);
            } else {
                handleUpdateCartItemQuantity(menuItemId, nextQty);
            }
        });
    });
}

// Endpoint #22: GET /api/Menu/{id} (Dish Quick-View Modal)
async function openDishQuickViewModal(menuItemId) {
    openModal("dishQuickViewModal");
    const body = document.getElementById("dishQuickViewBody");
    body.innerHTML = `<div class="empty-state-box">Loading dish details...</div>`;

    const res = await apiFetch(`/api/Menu/${menuItemId}`, { method: "GET" });
    const dish = res.data;
    if (!dish) return;

    document.getElementById("quickViewModalTitle").textContent = dish.name;
    const canOrder = Boolean(dish.isAvailable) && (dish.restaurantIsActive !== false);

    body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <img
        src="${resolveImageUrl(dish.imagePath, dish.name)}"
        alt="${escapeHtml(dish.name)}"
        style="width:100%;height:230px;object-fit:cover;border-radius:14px;background:var(--bg-sand-muted);"
      />
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <span class="dish-category-tag">${escapeHtml(dish.categoryName || "Menu")}</span>
          <span class="dish-restaurant-tag">Kitchen: ${escapeHtml(dish.restaurantName || "#" + dish.restaurantId)}</span>
        </div>
        <span class="dish-avail-badge ${canOrder ? "in-stock" : "sold-out"}">
          ${!dish.restaurantIsActive ? "Kitchen Closed" : dish.isAvailable ? "Available Now" : "Sold Out"}
        </span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border-warm);">
        <div>
          <span class="meta-label">Unit Price</span>
          <div class="dish-price" style="font-size:1.4rem;">${formatCurrency(dish.price)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="number" id="quickViewQtyInput" class="input-earth mono" value="1" min="1" max="50" style="width:76px;" ${canOrder ? "" : "disabled"} />
          <button type="button" class="btn-primary" id="quickViewAddBtn" ${canOrder ? "" : "disabled"}>
            Add to Order
          </button>
        </div>
      </div>
    </div>
  `;

    const addBtn = document.getElementById("quickViewAddBtn");
    if (addBtn) {
        addBtn.addEventListener("click", async () => {
            const qty = Math.max(1, Number(document.getElementById("quickViewQtyInput").value) || 1);
            await handleAddToCart({
                menuItemId: dish.id,
                quantity: qty,
                restaurantId: dish.restaurantId,
                restaurantName: dish.restaurantName,
                dishName: dish.name
            });
            closeModal("dishQuickViewModal");
        });
    }
}

/* ============================================================================
   8. SHOPPING CART ENDPOINTS (Endpoints #27, #28, #29, #30)
   ============================================================================ */

// Endpoint #27: GET /api/Cart
async function fetchCart() {
    if (!state.auth?.token) {
        state.cart = { id: null, restaurantId: null, restaurantName: null, totalPrice: 0, items: [] };
        renderCartUI();
        return;
    }

    const res = await apiFetch("/api/Cart", { method: "GET" }, { silentError: true });
    if (res.data) {
        state.cart = {
            id: res.data.id,
            userId: res.data.userId,
            restaurantId: res.data.restaurantId,
            restaurantName: res.data.restaurantName,
            totalPrice: Number(res.data.totalPrice || 0),
            items: Array.isArray(res.data.items) ? res.data.items : []
        };
    }
    renderCartUI();
    // Refresh dish card steppers if viewing storefront or global dishes
    if (!document.getElementById("viewStorefront").classList.contains("hidden")) {
        renderStorefrontMenuList(state.currentRestaurantMenu);
    }
}

// Endpoint #28: POST /api/Cart/items (with Same-Restaurant Guard)
async function handleAddToCart({ menuItemId, quantity = 1, restaurantId, restaurantName, dishName }) {
    if (!state.auth?.token) {
        showToast("Please sign in to add dishes to your basket.", "info");
        openModal("authModal");
        return;
    }

    // Same-Restaurant Rule check
    if (
        state.cart.items.length > 0 &&
        state.cart.restaurantId &&
        restaurantId &&
        Number(state.cart.restaurantId) !== Number(restaurantId)
    ) {
        const confirmed = await showConfirmModal({
            title: "Start a New Basket?",
            message: `Your cart currently contains items from "${state.cart.restaurantName || "another kitchen"}". All items in an order must come from the same restaurant. Clear current cart and add "${dishName || "this dish"}" instead?`,
            confirmText: "Clear & Add"
        });
        if (!confirmed) return;

        for (const item of state.cart.items) {
            await apiFetch(`/api/Cart/items/${item.menuItemId}`, { method: "DELETE" });
        }
    }

    await apiFetch("/api/Cart/items", {
        method: "POST",
        body: JSON.stringify({ menuItemId, quantity })
    });

    showToast(`Added ${dishName || "item"} to your basket`, "success");
    await fetchCart();
}

// Endpoint #29: PUT /api/Cart/items/{menuItemId}
async function handleUpdateCartItemQuantity(menuItemId, quantity) {
    await apiFetch(`/api/Cart/items/${menuItemId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity })
    });
    await fetchCart();
}

// Endpoint #30: DELETE /api/Cart/items/{menuItemId}
async function handleRemoveCartItem(menuItemId) {
    await apiFetch(`/api/Cart/items/${menuItemId}`, {
        method: "DELETE"
    });
    showToast("Item removed from basket", "info");
    await fetchCart();
}

function renderCartUI() {
    const items = state.cart.items || [];
    const totalCount = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

    document.getElementById("headerCartCount").textContent = String(totalCount);
    document.getElementById("headerCartTotal").textContent = formatCurrency(state.cart.totalPrice);

    const subTitle = document.getElementById("cartDrawerRestaurantName");
    subTitle.textContent = state.cart.restaurantName
        ? `Kitchen: ${state.cart.restaurantName}`
        : "No items selected yet";

    const body = document.getElementById("cartDrawerBody");
    if (items.length === 0) {
        body.innerHTML = `
      <div class="empty-state-box">
        <h4>Your basket is empty</h4>
        <p style="font-size:0.84rem;margin-top:4px;">Explore local kitchens and add dishes to begin your order.</p>
      </div>
    `;
    } else {
        body.innerHTML = items
            .map(
                (item) => `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <h4>${escapeHtml(item.name)}</h4>
            <div class="cart-item-sub mono">
              ${formatCurrency(item.price)} &times; ${item.quantity} = <strong>${formatCurrency(item.lineTotal)}</strong>
            </div>
          </div>
          <div class="cart-item-controls">
            <div class="dish-stepper-pill">
              <button type="button" data-cart-dec="${item.menuItemId}">&minus;</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-inc="${item.menuItemId}">+</button>
            </div>
            <button type="button" class="btn-danger" data-cart-del="${item.menuItemId}" title="Remove item" style="padding:5px 9px;">
              &times;
            </button>
          </div>
        </div>
      `
            )
            .join("");

        body.querySelectorAll("[data-cart-dec]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = Number(btn.dataset.cartDec);
                const current = items.find((i) => i.menuItemId === id);
                if (!current) return;
                if (current.quantity <= 1) handleRemoveCartItem(id);
                else handleUpdateCartItemQuantity(id, current.quantity - 1);
            });
        });

        body.querySelectorAll("[data-cart-inc]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = Number(btn.dataset.cartInc);
                const current = items.find((i) => i.menuItemId === id);
                if (current) handleUpdateCartItemQuantity(id, current.quantity + 1);
            });
        });

        body.querySelectorAll("[data-cart-del]").forEach((btn) => {
            btn.addEventListener("click", () => handleRemoveCartItem(Number(btn.dataset.cartDel)));
        });
    }

    document.getElementById("cartDrawerTotalAmount").textContent = formatCurrency(state.cart.totalPrice);
    updatePlaceOrderButtonState();
}

function updatePlaceOrderButtonState() {
    const placeBtn = document.getElementById("placeOrderBtn");
    const hasItems = (state.cart.items?.length || 0) > 0;
    const addrId = Number(document.getElementById("checkoutAddressSelect")?.value || state.selectedAddressId);
    placeBtn.disabled = !(hasItems && addrId > 0);
}

/* ============================================================================
   9. ORDERS & STATE MACHINE ENDPOINTS (Endpoints #31, #32, #33, #34, #35)
   ============================================================================ */

// Endpoint #31: POST /api/Orders
async function handlePlaceOrder() {
    const addressId = Number(document.getElementById("checkoutAddressSelect").value || state.selectedAddressId);
    if (!addressId) {
        showToast("Please select or add a delivery address first.", "error");
        return;
    }

    const res = await apiFetch("/api/Orders", {
        method: "POST",
        body: JSON.stringify({ addressId })
    });

    showToast("Order placed! Kitchen has received your ticket.", "success");
    toggleCartDrawer(false);
    await Promise.all([fetchCart(), fetchMyOrders()]);
    switchView("myOrders");

    if (res.data?.id) {
        openOrderDetailModal(res.data.id);
    }
}

// Endpoint #32: GET /api/Orders/my
async function fetchMyOrders() {
    if (!state.auth?.token) return;
    const res = await apiFetch("/api/Orders/my", { method: "GET" }, { silentError: true });
    state.myOrders = Array.isArray(res.data) ? res.data : [];

    // Show pulse dot if user has an active in-progress order
    const hasActive = state.myOrders.some(
        (o) => o.status !== "Delivered" && o.status !== "Cancelled"
    );
    document.getElementById("activeOrderDot").classList.toggle("hidden", !hasActive);

    renderMyOrdersView();
}

function renderOrderProgressBarHtml(status) {
    if (status === "Cancelled") {
        return `<div class="closed-kitchen-banner" style="margin:6px 0;">Order was Cancelled</div>`;
    }
    const currentIdx = ORDER_FLOW.indexOf(status);
    return `
    <div class="state-progress-track">
      ${ORDER_FLOW.map((step, idx) => {
        let cls = "";
        if (idx < currentIdx || status === "Delivered") cls = "completed";
        else if (idx === currentIdx) cls = "current";
        return `
          <div class="state-step ${cls}">
            <div class="state-step-bar"></div>
            <span class="state-step-label">${step}</span>
          </div>
        `;
    }).join("")}
    </div>
  `;
}

function renderMyOrdersView() {
    const container = document.getElementById("myOrdersContent");
    if (!container) return;

    if (state.myOrders.length === 0) {
        container.innerHTML = `
      <div class="empty-state-box">
        <h3>No orders yet</h3>
        <p>Once you place an order, you can track its live kitchen &amp; courier progress right here.</p>
      </div>
    `;
        return;
    }

    const sorted = [...state.myOrders].sort((a, b) => b.id - a.id);
    container.innerHTML = `
    <div class="orders-grid-list">
      ${sorted
            .map((order) => {
                const canCancel = order.status === "Created" || order.status === "Confirmed";
                return `
            <article class="order-card">
              <div class="order-card-top">
                <div>
                  <span class="order-id-badge">Order #${order.id}</span>
                  <strong style="margin-left:10px;font-size:1.08rem;">${escapeHtml(order.restaurantName || "Kitchen")}</strong>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span class="order-status-pill status-${order.status}">${escapeHtml(order.status)}</span>
                  <strong class="mono" style="color:var(--brand-terracotta);font-size:1.05rem;">${formatCurrency(order.totalPrice)}</strong>
                </div>
              </div>

              ${renderOrderProgressBarHtml(order.status)}

              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;font-size:0.84rem;color:var(--text-walnut);">
                <div>
                  <span>Placed ${formatDateTime(order.createdAt)}</span> •
                  <span>Deliver to: <strong>${escapeHtml(order.deliveryAddress || "Saved Address")}</strong></span>
                </div>
                <div class="admin-row-actions">
                  ${canCancel
                        ? `<button type="button" class="btn-danger" data-cancel-order="${order.id}">Cancel Order</button>`
                        : ""
                    }
                  <button type="button" class="btn-secondary-sm" data-inspect-order="${order.id}">
                    Live Tracker &amp; Receipt)
                  </button>
                </div>
              </div>
            </article>
          `;
            })
            .join("")}
    </div>
  `;

    container.querySelectorAll("[data-inspect-order]").forEach((btn) => {
        btn.addEventListener("click", () => openOrderDetailModal(Number(btn.dataset.inspectOrder)));
    });

    container.querySelectorAll("[data-cancel-order]").forEach((btn) => {
        btn.addEventListener("click", () =>
            handleOrderStatusPatch(Number(btn.dataset.cancelOrder), "Cancelled")
        );
    });
}

// Endpoint #34: GET /api/Orders/{id}
async function openOrderDetailModal(orderId) {
    state.activeOrderModalId = orderId;
    openModal("orderDetailModal");
    await loadOrderDetailModalContent(orderId);
}

async function loadOrderDetailModalContent(orderId) {
    const body = document.getElementById("orderDetailModalBody");
    document.getElementById("orderDetailModalTitle").textContent = `Order #${orderId}`;

    const res = await apiFetch(`/api/Orders/${orderId}`, { method: "GET" });
    const order = res.data;
    if (!order) return;

    const canCustomerCancel = order.status === "Created" || order.status === "Confirmed";
    const nextAdminStep = NEXT_ORDER_STATE[order.status];

    const itemsHtml = (order.orderItems || [])
        .map(
            (item) => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td class="mono">${item.quantity}</td>
        <td class="mono">${formatCurrency(item.unitPrice ?? item.priceAtTimeOfOrder)}</td>
        <td class="mono">${formatCurrency(item.priceAtTimeOfOrder)}</td>
        <td class="mono text-right"><strong>${formatCurrency(item.lineTotal)}</strong></td>
      </tr>
    `
        )
        .join("");

    body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h4 style="font-size:1.15rem;">${escapeHtml(order.restaurantName || "Kitchen")}</h4>
          <p style="font-size:0.84rem;color:var(--text-walnut);">
            Customer: <strong>${escapeHtml(order.userName || "—")}</strong> (${escapeHtml(order.userEmail || "—")})
          </p>
          <p style="font-size:0.84rem;color:var(--text-walnut);">
            Delivery Address: <strong>${escapeHtml(order.deliveryAddress || "—")}</strong> • Placed ${formatDateTime(order.createdAt)}
          </p>
        </div>
        <span class="order-status-pill status-${order.status}" style="font-size:0.9rem;">
          ${escapeHtml(order.status)}
        </span>
      </div>

      ${renderOrderProgressBarHtml(order.status)}

      <div class="admin-table-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Price at Order</th>
              <th class="text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--border-warm);flex-wrap:wrap;gap:12px;">
        <div>
          <span class="meta-label">Total Order Price</span>
          <div class="mono" style="font-size:1.45rem;font-weight:700;color:var(--brand-terracotta);">
            ${formatCurrency(order.totalPrice)}
          </div>
        </div>
        <div class="admin-row-actions">
          ${state.auth?.isAdmin && nextAdminStep
            ? `<button type="button" class="btn-olive" id="modalAdvanceOrderBtn">
                  ${escapeHtml(nextAdminStep.label)} (&rarr; ${nextAdminStep.next})
                </button>`
            : ""
        }
          ${canCustomerCancel
            ? `<button type="button" class="btn-danger" id="modalCancelOrderBtn">
                  Cancel Order
                </button>`
            : ""
        }
        </div>
      </div>
    </div>
  `;

    const advanceBtn = document.getElementById("modalAdvanceOrderBtn");
    if (advanceBtn && nextAdminStep) {
        advanceBtn.addEventListener("click", async () => {
            await handleOrderStatusPatch(order.id, nextAdminStep.next);
            await loadOrderDetailModalContent(order.id);
        });
    }

    const cancelBtn = document.getElementById("modalCancelOrderBtn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", async () => {
            await handleOrderStatusPatch(order.id, "Cancelled");
            await loadOrderDetailModalContent(order.id);
        });
    }
}

// Endpoint #35: PATCH /api/Orders/{id}/status
async function handleOrderStatusPatch(orderId, targetStatus) {
    if (targetStatus === "Cancelled") {
        const confirmed = await showConfirmModal({
            title: `Cancel Order #${orderId}?`,
            message: "Orders can only be cancelled while in Created or Confirmed state. Proceed?",
            confirmText: "Yes, Cancel Order"
        });
        if (!confirmed) return;
    }

    await apiFetch(`/api/Orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus })
    });

    showToast(`Order #${orderId} transitioned to ${targetStatus}`, "success");
    await fetchMyOrders();
    if (state.auth?.isAdmin) {
        await fetchAdminAllOrders();
    }
}

/* ============================================================================
   10. ADMIN STUDIO WORKSPACES (Endpoints #12–16, #18, #20, #23–26, #33, #36)
   ============================================================================ */

async function loadAdminStudioData() {
    if (!state.auth?.isAdmin) return;
    await Promise.all([
        fetchAdminRestaurants(),
        fetchCategories(),
        fetchAdminAllOrders()
    ]);
}

// Admin Workspace 1: Restaurants Directory & Instant Active/Inactive Toggle
async function fetchAdminRestaurants() {
    const res = await apiFetch("/api/Restaurants?page=1&pageSize=100", { method: "GET" });
    state.adminRestaurants = Array.isArray(res.data) ? res.data : res.data?.items || [];

    const total = state.adminRestaurants.length;
    const activeCount = state.adminRestaurants.filter((r) => r.isActive).length;
    document.getElementById("adminKpiTotalRestaurants").textContent = String(total);
    document.getElementById("adminKpiActiveRestaurants").textContent = String(activeCount);
    document.getElementById("adminKpiInactiveRestaurants").textContent = String(total - activeCount);

    renderAdminRestaurantsTable();
    populateAdminRestaurantSelects();

    if (!state.adminSelectedRestaurantId && state.adminRestaurants.length > 0) {
        state.adminSelectedRestaurantId = state.adminRestaurants[0].id;
        document.getElementById("adminMenuRestaurantSelect").value = String(state.adminSelectedRestaurantId);
        await fetchAdminDishesForRestaurant(state.adminSelectedRestaurantId);
    }
}

function renderAdminRestaurantsTable() {
    const tbody = document.getElementById("adminRestaurantsTableBody");
    const q = document.getElementById("adminRestaurantFilterInput").value.trim().toLowerCase();
    const statusFilter = document.getElementById("adminRestaurantStatusFilter").value;

    const filtered = state.adminRestaurants.filter((r) => {
        const matchesQ =
            !q ||
            String(r.name || "").toLowerCase().includes(q) ||
            String(r.address || "").toLowerCase().includes(q) ||
            String(r.id).includes(q);
        const matchesStatus =
            statusFilter === "ALL" ||
            (statusFilter === "ACTIVE" && r.isActive) ||
            (statusFilter === "INACTIVE" && !r.isActive);
        return matchesQ && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state-box">No restaurants match the filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered
        .map(
            (r) => `
      <tr>
        <td>
          <div class="admin-kitchen-cell">
            <img src="${resolveImageUrl(r.imagePath, r.name)}" class="admin-kitchen-thumb" alt="" />
            <div>
              <strong>${escapeHtml(r.name)}</strong>
              <div class="cart-item-sub mono">ID #${r.id}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(r.address)}</td>
        <td>
          <div class="status-toggle-wrap">
            <button
              type="button"
              class="toggle-switch-btn ${r.isActive ? "is-on" : "is-off"}"
              data-toggle-rest="${r.id}"
              title="Instant PUT /api/Restaurants/${r.id}"
            >
              <span class="toggle-knob"></span>
            </button>
            <span class="dish-avail-badge ${r.isActive ? "in-stock" : "sold-out"}">
              ${r.isActive ? "Active (Open)" : "Inactive (Closed)"}
            </span>
          </div>
        </td>
        <td class="text-right">
          <div class="admin-row-actions">
            <button type="button" class="btn-secondary-sm" data-admin-upload-rest="${r.id}" title="POST /api/Restaurants/${r.id}/image">
              Photo
            </button>
            <button type="button" class="btn-secondary-sm" data-admin-manage-menu="${r.id}" title="GET /api/Menu/restaurant/${r.id}">
              Menu &amp; Quick-Add
            </button>
            <button type="button" class="btn-secondary-sm" data-admin-edit-rest="${r.id}" title="PUT /api/Restaurants/${r.id}">
              Edit
            </button>
            <button type="button" class="btn-danger" data-admin-del-rest="${r.id}" title="DELETE /api/Restaurants/${r.id}">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `
        )
        .join("");

    // Instant Active/Inactive Toggle (Endpoint #13: PUT /api/Restaurants/{id})
    tbody.querySelectorAll("[data-toggle-rest]").forEach((btn) => {
        btn.addEventListener("click", () => handleInstantToggleRestaurantActive(Number(btn.dataset.toggleRest)));
    });

    // Upload Cover Photo (Endpoint #15: POST /api/Restaurants/{id}/image)
    tbody.querySelectorAll("[data-admin-upload-rest]").forEach((btn) => {
        btn.addEventListener("click", () => triggerSharedImageUpload("restaurant", Number(btn.dataset.adminUploadRest)));
    });

    // Jump to Menu Manager for this Restaurant
    tbody.querySelectorAll("[data-admin-manage-menu]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const restId = Number(btn.dataset.adminManageMenu);
            state.adminSelectedRestaurantId = restId;
            switchAdminWorkspace("menu");
            document.getElementById("adminMenuRestaurantSelect").value = String(restId);
            await fetchAdminDishesForRestaurant(restId);
        });
    });

    // Open Full Edit Restaurant Modal
    tbody.querySelectorAll("[data-admin-edit-rest]").forEach((btn) => {
        btn.addEventListener("click", () => openEditRestaurantModal(Number(btn.dataset.adminEditRest)));
    });

    // Delete Restaurant (Endpoint #14: DELETE /api/Restaurants/{id})
    tbody.querySelectorAll("[data-admin-del-rest]").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteRestaurant(Number(btn.dataset.adminDelRest)));
    });
}

// Endpoint #13 (Instant Toggle): PUT /api/Restaurants/{id}
async function handleInstantToggleRestaurantActive(restaurantId) {
    const rest = state.adminRestaurants.find((r) => r.id === restaurantId);
    if (!rest) return;

    const updatedDto = {
        id: rest.id,
        name: rest.name,
        address: rest.address,
        imagePath: rest.imagePath || null,
        isActive: !rest.isActive
    };

    await apiFetch(`/api/Restaurants/${restaurantId}`, {
        method: "PUT",
        body: JSON.stringify(updatedDto)
    });

    rest.isActive = updatedDto.isActive;
    showToast(
        `${rest.name} is now ${rest.isActive ? "Active (Open)" : "Inactive (Closed)"}`,
        rest.isActive ? "success" : "info"
    );
    await Promise.all([fetchAdminRestaurants(), fetchDiscoveryRestaurants()]);
}

function openCreateRestaurantModal() {
    document.getElementById("adminRestaurantModalTitle").textContent = "Create New Restaurant (POST /api/Restaurants)";
    document.getElementById("adminRestaurantForm").reset();
    document.getElementById("adminRestaurantIdInput").value = "";
    document.getElementById("adminRestaurantActiveInput").checked = true;
    openModal("adminRestaurantModal");
}

function openEditRestaurantModal(restaurantId) {
    const rest = state.adminRestaurants.find((r) => r.id === restaurantId);
    if (!rest) return;

    document.getElementById("adminRestaurantModalTitle").textContent = `Edit Restaurant #${rest.id} (PUT /api/Restaurants/${rest.id})`;
    document.getElementById("adminRestaurantIdInput").value = String(rest.id);
    document.getElementById("adminRestaurantNameInput").value = rest.name || "";
    document.getElementById("adminRestaurantAddressInput").value = rest.address || "";
    document.getElementById("adminRestaurantImageInput").value = rest.imagePath || "";
    document.getElementById("adminRestaurantActiveInput").checked = Boolean(rest.isActive);
    openModal("adminRestaurantModal");
}

// Endpoint #12: POST /api/Restaurants & Endpoint #13: PUT /api/Restaurants/{id}
async function handleAdminRestaurantFormSubmit(e) {
    e.preventDefault();
    const idVal = document.getElementById("adminRestaurantIdInput").value;
    const name = document.getElementById("adminRestaurantNameInput").value.trim();
    const address = document.getElementById("adminRestaurantAddressInput").value.trim();
    const imagePath = document.getElementById("adminRestaurantImageInput").value.trim() || null;
    const isActive = document.getElementById("adminRestaurantActiveInput").checked;

    if (idVal) {
        const id = Number(idVal);
        await apiFetch(`/api/Restaurants/${id}`, {
            method: "PUT",
            body: JSON.stringify({ id, name, address, imagePath, isActive })
        });
        showToast(`Updated ${name}`, "success");
    } else {
        await apiFetch("/api/Restaurants", {
            method: "POST",
            body: JSON.stringify({ name, address, imagePath, isActive })
        });
        showToast(`Created restaurant "${name}"`, "success");
    }

    closeModal("adminRestaurantModal");
    await Promise.all([fetchAdminRestaurants(), fetchDiscoveryRestaurants()]);
}

// Endpoint #14: DELETE /api/Restaurants/{id}
async function handleDeleteRestaurant(restaurantId) {
    const rest = state.adminRestaurants.find((r) => r.id === restaurantId);
    const confirmed = await showConfirmModal({
        title: `Delete "${rest?.name || "Restaurant"}"?`,
        message: "Note: The backend blocks deletion if historical customer orders exist for this restaurant.",
        confirmText: "Delete Restaurant"
    });
    if (!confirmed) return;

    await apiFetch(`/api/Restaurants/${restaurantId}`, { method: "DELETE" });
    showToast("Restaurant deleted.", "info");
    await Promise.all([fetchAdminRestaurants(), fetchDiscoveryRestaurants()]);
}

// Shared Image Uploader for Endpoint #15 (POST /api/Restaurants/{id}/image) & Endpoint #26 (POST /api/Menu/{id}/image)
function triggerSharedImageUpload(type, id) {
    state.pendingUploadTarget = { type, id };
    const fileInput = document.getElementById("adminSharedImageUploader");
    fileInput.value = "";
    fileInput.click();
}

async function handleSharedImageFileSelected(e) {
    const file = e.target.files?.[0];
    const target = state.pendingUploadTarget;
    if (!file || !target) return;

    const formData = new FormData();
    formData.append("image", file);

    if (target.type === "restaurant") {
        // Endpoint #15: POST /api/Restaurants/{id}/image
        await apiFetch(`/api/Restaurants/${target.id}/image`, {
            method: "POST",
            body: formData
        });
        showToast(`Cover image uploaded for Restaurant #${target.id}`, "success");
        await Promise.all([fetchAdminRestaurants(), fetchDiscoveryRestaurants()]);
    } else if (target.type === "menu") {
        // Endpoint #26: POST /api/Menu/{id}/image
        await apiFetch(`/api/Menu/${target.id}/image`, {
            method: "POST",
            body: formData
        });
        showToast(`Photo uploaded for Dish #${target.id}`, "success");
        if (state.adminSelectedRestaurantId) {
            await fetchAdminDishesForRestaurant(state.adminSelectedRestaurantId);
        }
    }
    state.pendingUploadTarget = null;
}

// Admin Workspace 2: Categories & Menu Items
function renderAdminCategoriesList() {
    const container = document.getElementById("adminCategoriesList");
    if (!container) return;
    if (state.categories.length === 0) {
        container.innerHTML = `<span class="cart-item-sub">No categories yet.</span>`;
        return;
    }
    container.innerHTML = state.categories
        .map(
            (c) => `
      <span class="admin-cat-chip">
        <span>${getCategoryIcon(c.name)}</span>
        <span>${escapeHtml(c.name)}</span>
        <code class="mono">#${c.id}</code>
      </span>
    `
        )
        .join("");
}

// Endpoint #18: POST /api/Menu/categories
async function handleCreateCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById("newCategoryNameInput").value.trim();
    if (!name) return;

    await apiFetch("/api/Menu/categories", {
        method: "POST",
        body: JSON.stringify({ name })
    });

    document.getElementById("newCategoryNameInput").value = "";
    showToast(`Category "${name}" created!`, "success");
    await fetchCategories();
}

function populateAdminCategorySelects() {
    const select = document.getElementById("adminMenuItemCategorySelect");
    if (!select) return;
    select.innerHTML = state.categories
        .map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (#${c.id})</option>`)
        .join("");
}

function populateAdminRestaurantSelects() {
    const filterSelect = document.getElementById("adminMenuRestaurantSelect");
    const modalSelect = document.getElementById("adminMenuItemRestaurantSelect");
    const optionsHtml = state.adminRestaurants
        .map((r) => `<option value="${r.id}">${escapeHtml(r.name)} (#${r.id})</option>`)
        .join("");
    if (filterSelect) {
        filterSelect.innerHTML = optionsHtml;
        if (state.adminSelectedRestaurantId) {
            filterSelect.value = String(state.adminSelectedRestaurantId);
        }
    }
    if (modalSelect) modalSelect.innerHTML = optionsHtml;
}

// Endpoint #20: GET /api/Menu/restaurant/{restaurantId}
async function fetchAdminDishesForRestaurant(restaurantId) {
    if (!restaurantId) return;
    state.adminSelectedRestaurantId = Number(restaurantId);
    const res = await apiFetch(`/api/Menu/restaurant/${restaurantId}`, { method: "GET" });
    state.adminRestaurantDishes = Array.isArray(res.data) ? res.data : [];
    renderAdminRestaurantDishes();
}

function renderAdminRestaurantDishes() {
    const container = document.getElementById("adminMenuDishesContainer");
    if (!container) return;

    if (state.adminRestaurantDishes.length === 0) {
        container.innerHTML = `
      <div class="empty-state-box">
        No dishes in this restaurant yet. Use "+ Quick-Add to Kitchen" or "+ Create Menu Item".
      </div>
    `;
        return;
    }

    container.innerHTML = state.adminRestaurantDishes
        .map(
            (d) => `
      <div class="admin-dish-row">
        <div class="admin-kitchen-cell">
          <img src="${resolveImageUrl(d.imagePath, d.name)}" class="admin-kitchen-thumb" alt="" />
          <div>
            <strong>${escapeHtml(d.name)}</strong>
            <div class="cart-item-sub">
              <span class="mono" style="color:var(--brand-terracotta);font-weight:700;">${formatCurrency(d.price)}</span>
              • ${escapeHtml(d.categoryName || "Category #" + d.categoryId)}
              • <code class="mono">ID #${d.id}</code>
            </div>
          </div>
        </div>
        <div class="admin-row-actions">
          <div class="status-toggle-wrap" title="Instant PUT /api/Menu/${d.id}">
            <button
              type="button"
              class="toggle-switch-btn ${d.isAvailable ? "is-on" : "is-off"}"
              data-toggle-dish="${d.id}"
            >
              <span class="toggle-knob"></span>
            </button>
            <span class="dish-avail-badge ${d.isAvailable ? "in-stock" : "sold-out"}">
              ${d.isAvailable ? "Available" : "Sold Out"}
            </span>
          </div>
          <button type="button" class="btn-secondary-sm" data-upload-dish="${d.id}" title="POST /api/Menu/${d.id}/image">
            Photo
          </button>
          <button type="button" class="btn-secondary-sm" data-edit-dish="${d.id}" title="PUT /api/Menu/${d.id}">
            Edit
          </button>
          <button type="button" class="btn-danger" data-del-dish="${d.id}" title="DELETE /api/Menu/${d.id}">
            Delete
          </button>
        </div>
      </div>
    `
        )
        .join("");

    container.querySelectorAll("[data-toggle-dish]").forEach((btn) => {
        btn.addEventListener("click", () => handleInstantToggleDishAvailability(Number(btn.dataset.toggleDish)));
    });

    container.querySelectorAll("[data-upload-dish]").forEach((btn) => {
        btn.addEventListener("click", () => triggerSharedImageUpload("menu", Number(btn.dataset.uploadDish)));
    });

    container.querySelectorAll("[data-edit-dish]").forEach((btn) => {
        btn.addEventListener("click", () => openEditMenuItemModal(Number(btn.dataset.editDish)));
    });

    container.querySelectorAll("[data-del-dish]").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteMenuItem(Number(btn.dataset.delDish)));
    });
}

// Open Menu Item Modal in 3 modes:
// 1. GLOBAL (POST /api/Menu)
// 2. RESTAURANT_SCOPED (POST /api/Restaurants/{id}/menu)
// 3. EDIT (PUT /api/Menu/{id})
function openCreateMenuItemModal(mode = "GLOBAL", fixedRestaurantId = null) {
    document.getElementById("adminMenuItemForm").reset();
    document.getElementById("adminMenuItemIdInput").value = "";
    document.getElementById("adminMenuItemEndpointMode").value = mode;
    document.getElementById("adminMenuItemAvailableInput").checked = true;
    document.getElementById("adminMenuItemImageGroup").classList.add("hidden");

    const restSelect = document.getElementById("adminMenuItemRestaurantSelect");
    if (fixedRestaurantId) {
        restSelect.value = String(fixedRestaurantId);
    }

    document.getElementById("adminMenuItemModalTitle").textContent =
        mode === "RESTAURANT_SCOPED"
            ? `Quick-Add Dish to Restaurant #${fixedRestaurantId} (POST /api/Restaurants/${fixedRestaurantId}/menu)`
            : "Create Menu Item (POST /api/Menu)";

    openModal("adminMenuItemModal");
}

function openEditMenuItemModal(dishId) {
    const dish = state.adminRestaurantDishes.find((d) => d.id === dishId);
    if (!dish) return;

    document.getElementById("adminMenuItemModalTitle").textContent = `Edit Dish #${dish.id} (PUT /api/Menu/${dish.id})`;
    document.getElementById("adminMenuItemIdInput").value = String(dish.id);
    document.getElementById("adminMenuItemEndpointMode").value = "EDIT";
    document.getElementById("adminMenuItemNameInput").value = dish.name || "";
    document.getElementById("adminMenuItemPriceInput").value = dish.price || 0.01;
    document.getElementById("adminMenuItemCategorySelect").value = String(dish.categoryId);
    document.getElementById("adminMenuItemRestaurantSelect").value = String(dish.restaurantId || state.adminSelectedRestaurantId);
    document.getElementById("adminMenuItemImageInput").value = dish.imagePath || "";
    document.getElementById("adminMenuItemAvailableInput").checked = Boolean(dish.isAvailable);
    document.getElementById("adminMenuItemImageGroup").classList.remove("hidden");

    openModal("adminMenuItemModal");
}

// Endpoints #16 (POST /api/Restaurants/{id}/menu), #23 (POST /api/Menu), #24 (PUT /api/Menu/{id})
async function handleAdminMenuItemFormSubmit(e) {
    e.preventDefault();
    const mode = document.getElementById("adminMenuItemEndpointMode").value;
    const idVal = document.getElementById("adminMenuItemIdInput").value;
    const name = document.getElementById("adminMenuItemNameInput").value.trim();
    const price = Number(document.getElementById("adminMenuItemPriceInput").value);
    const categoryId = Number(document.getElementById("adminMenuItemCategorySelect").value);
    const restaurantId = Number(document.getElementById("adminMenuItemRestaurantSelect").value);
    const isAvailable = document.getElementById("adminMenuItemAvailableInput").checked;
    const imagePath = document.getElementById("adminMenuItemImageInput").value.trim() || null;

    if (mode === "EDIT" && idVal) {
        const id = Number(idVal);
        // Endpoint #24: PUT /api/Menu/{id}
        await apiFetch(`/api/Menu/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                id,
                name,
                price,
                isAvailable,
                imagePath,
                categoryId,
                restaurantId
            })
        });
        showToast(`Updated dish "${name}"`, "success");
    } else if (mode === "RESTAURANT_SCOPED") {
        // Endpoint #16: POST /api/Restaurants/{id}/menu
        await apiFetch(`/api/Restaurants/${restaurantId}/menu`, {
            method: "POST",
            body: JSON.stringify({
                name,
                price,
                isAvailable,
                restaurantId,
                categoryId
            })
        });
        showToast(`Added "${name}" directly to Restaurant #${restaurantId} menu!`, "success");
    } else {
        // Endpoint #23: POST /api/Menu
        await apiFetch("/api/Menu", {
            method: "POST",
            body: JSON.stringify({
                name,
                price,
                isAvailable,
                restaurantId,
                categoryId
            })
        });
        showToast(`Created menu item "${name}"!`, "success");
    }

    closeModal("adminMenuItemModal");
    state.adminSelectedRestaurantId = restaurantId;
    document.getElementById("adminMenuRestaurantSelect").value = String(restaurantId);
    await fetchAdminDishesForRestaurant(restaurantId);
}

// Endpoint #24 (Quick Availability Toggle): PUT /api/Menu/{id}
async function handleInstantToggleDishAvailability(dishId) {
    const dish = state.adminRestaurantDishes.find((d) => d.id === dishId);
    if (!dish) return;

    const updated = {
        id: dish.id,
        name: dish.name,
        price: dish.price,
        isAvailable: !dish.isAvailable,
        imagePath: dish.imagePath || null,
        categoryId: dish.categoryId,
        restaurantId: dish.restaurantId || state.adminSelectedRestaurantId
    };

    await apiFetch(`/api/Menu/${dishId}`, {
        method: "PUT",
        body: JSON.stringify(updated)
    });

    dish.isAvailable = updated.isAvailable;
    showToast(
        `${dish.name} marked as ${dish.isAvailable ? "Available" : "Sold Out"}`,
        dish.isAvailable ? "success" : "info"
    );
    renderAdminRestaurantDishes();
}

// Endpoint #25: DELETE /api/Menu/{id}
async function handleDeleteMenuItem(dishId) {
    const dish = state.adminRestaurantDishes.find((d) => d.id === dishId);
    const confirmed = await showConfirmModal({
        title: `Delete "${dish?.name || "Dish"}"?`,
        message: "Dishes that are part of historical customer orders cannot be deleted.",
        confirmText: "Delete Dish"
    });
    if (!confirmed) return;

    await apiFetch(`/api/Menu/${dishId}`, { method: "DELETE" });
    showToast("Menu item deleted.", "info");
    await fetchAdminDishesForRestaurant(state.adminSelectedRestaurantId);
}

// Admin Workspace 3: Platform Orders Dispatch (Endpoint #33: GET /api/Orders)
async function fetchAdminAllOrders() {
    if (!state.auth?.isAdmin) return;
    const res = await apiFetch("/api/Orders", { method: "GET" }, { silentError: true });
    state.adminOrders = Array.isArray(res.data) ? res.data : [];
    renderAdminOrdersList();
}

function renderAdminOrdersList() {
    const container = document.getElementById("adminOrdersListContainer");
    if (!container) return;

    const filtered =
        state.adminOrderStatusFilter === "ALL"
            ? state.adminOrders
            : state.adminOrders.filter((o) => o.status === state.adminOrderStatusFilter);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state-box">No platform orders in "${state.adminOrderStatusFilter}" state.</div>`;
        return;
    }

    const sorted = [...filtered].sort((a, b) => b.id - a.id);
    container.innerHTML = `
    <div class="orders-grid-list">
      ${sorted
            .map((order) => {
                const nextStep = NEXT_ORDER_STATE[order.status];
                const canCancel = order.status === "Created" || order.status === "Confirmed";
                return `
            <article class="order-card">
              <div class="order-card-top">
                <div>
                  <span class="order-id-badge">Order #${order.id}</span>
                  <strong style="margin-left:8px;">${escapeHtml(order.restaurantName || "Kitchen #" + order.restaurantId)}</strong>
                  <span class="cart-item-sub" style="margin-left:8px;">
                    Customer: ${escapeHtml(order.userName || order.userEmail || "User")}
                  </span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span class="order-status-pill status-${order.status}">${escapeHtml(order.status)}</span>
                  <strong class="mono" style="color:var(--brand-terracotta);">${formatCurrency(order.totalPrice)}</strong>
                </div>
              </div>

              ${renderOrderProgressBarHtml(order.status)}

              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;font-size:0.82rem;color:var(--text-walnut);">
                <div>
                  <span>${formatDateTime(order.createdAt)}</span> •
                  <span>Address: <strong>${escapeHtml(order.deliveryAddress || "—")}</strong></span>
                </div>
                <div class="admin-row-actions">
                  ${nextStep
                        ? `<button type="button" class="btn-olive" data-admin-advance="${order.id}" data-next-status="${nextStep.next}">
                          ${escapeHtml(nextStep.label)}
                        </button>`
                        : ""
                    }
                  ${canCancel
                        ? `<button type="button" class="btn-danger" data-admin-cancel="${order.id}">
                          Cancel Order
                        </button>`
                        : ""
                    }
                  <button type="button" class="btn-secondary-sm" data-admin-inspect-order="${order.id}">
                    Details
                  </button>
                </div>
              </div>
            </article>
          `;
            })
            .join("")}
    </div>
  `;

    container.querySelectorAll("[data-admin-advance]").forEach((btn) => {
        btn.addEventListener("click", () =>
            handleOrderStatusPatch(Number(btn.dataset.adminAdvance), btn.dataset.nextStatus)
        );
    });

    container.querySelectorAll("[data-admin-cancel]").forEach((btn) => {
        btn.addEventListener("click", () =>
            handleOrderStatusPatch(Number(btn.dataset.adminCancel), "Cancelled")
        );
    });

    container.querySelectorAll("[data-admin-inspect-order]").forEach((btn) => {
        btn.addEventListener("click", () =>
            openOrderDetailModal(Number(btn.dataset.adminInspectOrder))
        );
    });
}

// Admin Workspace 4: Promote User to Admin (Endpoint #36: POST /api/Admin/users/promote?email=...)
async function handlePromoteUserSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("promoteUserEmailInput").value.trim();
    if (!email) return;

    const res = await apiFetch(`/api/Admin/users/promote?email=${encodeURIComponent(email)}`, {
        method: "POST"
    });

    showToast(res.message || `User ${email} promoted to Admin role!`, "success");
    document.getElementById("adminPromoteUserForm").reset();
}

/* ============================================================================
   11. VIEW NAVIGATION, MODALS & BOOTSTRAP WIRING
   ============================================================================ */

function switchView(viewName) {
    const views = {
        discovery: document.getElementById("viewDiscovery"),
        storefront: document.getElementById("viewStorefront"),
        myOrders: document.getElementById("viewMyOrders"),
        adminStudio: document.getElementById("viewAdminStudio")
    };

    Object.values(views).forEach((el) => el.classList.add("hidden"));
    if (views[viewName]) views[viewName].classList.remove("hidden");

    document.getElementById("navExploreBtn").classList.toggle("active", viewName === "discovery" || viewName === "storefront");
    document.getElementById("navMyOrdersBtn").classList.toggle("active", viewName === "myOrders");
    document.getElementById("navAdminStudioBtn").classList.toggle("active-studio", viewName === "adminStudio");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchAdminWorkspace(workspaceKey) {
    state.adminWorkspace = workspaceKey;
    const map = {
        restaurants: document.getElementById("adminWorkspaceRestaurants"),
        menu: document.getElementById("adminWorkspaceMenu"),
        orders: document.getElementById("adminWorkspaceOrders"),
        roles: document.getElementById("adminWorkspaceRoles")
    };
    Object.values(map).forEach((el) => el.classList.add("hidden"));
    if (map[workspaceKey]) map[workspaceKey].classList.remove("hidden");

    document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.workspace === workspaceKey);
    });
}

function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove("hidden");
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add("hidden");
}

function toggleCartDrawer(open) {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("cartDrawerBackdrop");
    const shouldOpen = open !== undefined ? open : !drawer.classList.contains("open");
    drawer.classList.toggle("open", shouldOpen);
    backdrop.classList.toggle("hidden", !shouldOpen);
}

async function bootstrapAuthenticatedUser() {
    if (!state.auth?.token) return;
    await Promise.all([
        fetchUserProfile(),
        fetchMyAddresses(),
        fetchCart(),
        fetchMyOrders()
    ]);
}

function bindGlobalEvents() {
    // Header Navigation
    document.getElementById("brandLogoBtn").addEventListener("click", (e) => {
        e.preventDefault();
        switchView("discovery");
    });

    document.getElementById("navExploreBtn").addEventListener("click", () => switchView("discovery"));

    document.getElementById("navMyOrdersBtn").addEventListener("click", async () => {
        switchView("myOrders");
        await fetchMyOrders();
    });

    document.getElementById("navAdminStudioBtn").addEventListener("click", async () => {
        switchView("adminStudio");
        await loadAdminStudioData();
    });

    document.getElementById("exitAdminStudioBtn").addEventListener("click", () => switchView("discovery"));

    // Address Pill & Modal
    document.getElementById("headerAddressBtn").addEventListener("click", () => {
        if (!state.auth?.token) {
            showToast("Sign in to manage your delivery addresses.", "info");
            openModal("authModal");
            return;
        }
        openModal("addressModal");
    });

    document.getElementById("createAddressForm").addEventListener("submit", handleCreateAddressSubmit);

    // Cart Drawer
    document.getElementById("headerCartBtn").addEventListener("click", () => toggleCartDrawer(true));
    document.getElementById("closeCartDrawerBtn").addEventListener("click", () => toggleCartDrawer(false));
    document.getElementById("cartDrawerBackdrop").addEventListener("click", () => toggleCartDrawer(false));
    document.getElementById("cartManageAddressesBtn").addEventListener("click", () => {
        toggleCartDrawer(false);
        openModal("addressModal");
    });
    document.getElementById("checkoutAddressSelect").addEventListener("change", (e) => {
        state.selectedAddressId = Number(e.target.value) || null;
        if (state.selectedAddressId) {
            localStorage.setItem(STORAGE_KEY_ADDR, String(state.selectedAddressId));
        }
        renderAddressesUI();
    });
    document.getElementById("placeOrderBtn").addEventListener("click", handlePlaceOrder);

    // Auth Modal Tabs & Forms
    document.getElementById("headerAuthBtn").addEventListener("click", () => openModal("authModal"));
    document.getElementById("tabLoginBtn").addEventListener("click", () => {
        document.getElementById("tabLoginBtn").classList.add("active");
        document.getElementById("tabRegisterBtn").classList.remove("active");
        document.getElementById("loginForm").classList.remove("hidden");
        document.getElementById("registerForm").classList.add("hidden");
    });
    document.getElementById("tabRegisterBtn").addEventListener("click", () => {
        document.getElementById("tabRegisterBtn").classList.add("active");
        document.getElementById("tabLoginBtn").classList.remove("active");
        document.getElementById("registerForm").classList.remove("hidden");
        document.getElementById("loginForm").classList.add("hidden");
    });
    document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
    document.getElementById("registerForm").addEventListener("submit", handleRegisterSubmit);

    // Profile Modal
    document.getElementById("headerProfileBtn").addEventListener("click", async () => {
        openModal("profileModal");
        await fetchUserProfile();
    });
    document.getElementById("profileImageInput").addEventListener("change", handleProfileImageUpload);
    document.getElementById("profileOpenAddressesBtn").addEventListener("click", () => {
        closeModal("profileModal");
        openModal("addressModal");
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
        closeModal("profileModal");
        clearAuthSession();
        showToast("Signed out safely.", "info");
    });

    // Discovery Mode Switch (Restaurants Catalog vs. Global Dishes Explorer)
    document.getElementById("modeRestaurantsBtn").addEventListener("click", async () => {
        state.discoveryMode = "restaurants";
        document.getElementById("modeRestaurantsBtn").classList.add("active");
        document.getElementById("modeDishesBtn").classList.remove("active");
        document.getElementById("discoveryRestaurantsPanel").classList.remove("hidden");
        document.getElementById("discoveryDishesPanel").classList.add("hidden");
        await fetchDiscoveryRestaurants();
    });

    document.getElementById("modeDishesBtn").addEventListener("click", async () => {
        state.discoveryMode = "dishes";
        document.getElementById("modeDishesBtn").classList.add("active");
        document.getElementById("modeRestaurantsBtn").classList.remove("active");
        document.getElementById("discoveryDishesPanel").classList.remove("hidden");
        document.getElementById("discoveryRestaurantsPanel").classList.add("hidden");
        if (state.selectedCategoryId) {
            await fetchDishesByCategory(state.selectedCategoryId);
        } else if (state.categories.length > 0) {
            await fetchDishesByCategory(state.categories[0].id);
        } else {
            await searchDishesGlobally("a");
        }
    });

    // Discovery Catalog Search & Pagination
    let catalogSearchTimer = null;
    const catSearchInput = document.getElementById("catalogRestaurantSearchInput");
    const clearCatBtn = document.getElementById("clearCatalogSearchBtn");
    catSearchInput.addEventListener("input", () => {
        clearTimeout(catalogSearchTimer);
        state.catalogSearch = catSearchInput.value.trim();
        clearCatBtn.classList.toggle("hidden", !state.catalogSearch);
        catalogSearchTimer = setTimeout(() => {
            state.catalogPage = 1;
            fetchDiscoveryRestaurants();
        }, 280);
    });

    clearCatBtn.addEventListener("click", () => {
        catSearchInput.value = "";
        state.catalogSearch = "";
        clearCatBtn.classList.add("hidden");
        state.catalogPage = 1;
        fetchDiscoveryRestaurants();
    });

    document.getElementById("catalogPageSizeSelect").addEventListener("change", (e) => {
        state.catalogPageSize = Number(e.target.value) || 12;
        state.catalogPage = 1;
        fetchDiscoveryRestaurants();
    });

    document.getElementById("prevPageBtn").addEventListener("click", () => {
        if (state.catalogPage > 1) {
            state.catalogPage--;
            fetchDiscoveryRestaurants();
        }
    });

    document.getElementById("nextPageBtn").addEventListener("click", () => {
        state.catalogPage++;
        fetchDiscoveryRestaurants();
    });

    // Dish Explorer Global Search
    document.getElementById("runGlobalDishSearchBtn").addEventListener("click", () => {
        const q = document.getElementById("globalDishSearchInput").value.trim();
        searchDishesGlobally(q);
    });
    document.getElementById("globalDishSearchInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            searchDishesGlobally(e.target.value.trim());
        }
    });

    // Storefront Navigation & In-Restaurant Search
    document.getElementById("backToDiscoveryBtn").addEventListener("click", () => switchView("discovery"));
    document.getElementById("refreshStorefrontMenuBtn").addEventListener("click", async () => {
        if (!state.currentRestaurantId) return;
        const res = await apiFetch(`/api/Restaurants/${state.currentRestaurantId}/menu`, { method: "GET" });
        state.currentRestaurantMenu = Array.isArray(res.data) ? res.data : [];
        renderStorefrontView();
        showToast("Menu refreshed from server", "info");
    });

    let sfSearchTimer = null;
    const sfSearchInput = document.getElementById("storefrontMenuSearchInput");
    const clearSfBtn = document.getElementById("clearStorefrontSearchBtn");
    sfSearchInput.addEventListener("input", () => {
        clearTimeout(sfSearchTimer);
        const q = sfSearchInput.value.trim();
        clearSfBtn.classList.toggle("hidden", !q);
        sfSearchTimer = setTimeout(() => handleStorefrontMenuSearch(q), 250);
    });
    clearSfBtn.addEventListener("click", () => {
        sfSearchInput.value = "";
        clearSfBtn.classList.add("hidden");
        renderStorefrontMenuList(state.currentRestaurantMenu);
    });

    // Orders Refresh Buttons
    document.getElementById("refreshMyOrdersBtn").addEventListener("click", fetchMyOrders);
    document.getElementById("refreshSingleOrderBtn").addEventListener("click", () => {
        if (state.activeOrderModalId) loadOrderDetailModalContent(state.activeOrderModalId);
    });

    // Admin Studio Navigation & Controls
    document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchAdminWorkspace(btn.dataset.workspace));
    });

    document.getElementById("openCreateRestaurantModalBtn").addEventListener("click", openCreateRestaurantModal);
    document.getElementById("adminRestaurantForm").addEventListener("submit", handleAdminRestaurantFormSubmit);
    document.getElementById("adminRestaurantFilterInput").addEventListener("input", renderAdminRestaurantsTable);
    document.getElementById("adminRestaurantStatusFilter").addEventListener("change", renderAdminRestaurantsTable);

    document.getElementById("adminCreateCategoryForm").addEventListener("submit", handleCreateCategorySubmit);
    document.getElementById("adminMenuRestaurantSelect").addEventListener("change", (e) => {
        fetchAdminDishesForRestaurant(Number(e.target.value));
    });
    document.getElementById("openGlobalCreateMenuModalBtn").addEventListener("click", () =>
        openCreateMenuItemModal("GLOBAL", state.adminSelectedRestaurantId)
    );
    document.getElementById("adminQuickAddForSelectedRestBtn").addEventListener("click", () => {
        const restId = Number(document.getElementById("adminMenuRestaurantSelect").value);
        openCreateMenuItemModal("RESTAURANT_SCOPED", restId);
    });
    document.getElementById("adminMenuItemForm").addEventListener("submit", handleAdminMenuItemFormSubmit);

    document.getElementById("adminRefreshOrdersBtn").addEventListener("click", fetchAdminAllOrders);
    document.querySelectorAll("#adminOrderStatusTabs .status-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll("#adminOrderStatusTabs .status-tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            state.adminOrderStatusFilter = tab.dataset.status;
            renderAdminOrdersList();
        });
    });

    document.getElementById("adminPromoteUserForm").addEventListener("submit", handlePromoteUserSubmit);
    document.getElementById("adminSharedImageUploader").addEventListener("change", handleSharedImageFileSelected);

    // Generic Modal Close Triggers
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
        btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop && backdrop.id !== "confirmModal") {
                backdrop.classList.add("hidden");
            }
        });
    });

    // Keyboard "/" shortcut to focus global search
    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
            e.preventDefault();
            document.getElementById("globalSearchInput").focus();
        }
    });
}

/* ============================================================================
   12. APPLICATION INITIALIZATION
   ============================================================================ */

async function initApp() {
    loadAuthSessionFromStorage();
    updateHeaderAuthUI();
    bindGlobalEvents();
    setupGlobalAutocompleteSearch();

    await Promise.all([
        fetchCategories(),
        fetchDiscoveryRestaurants()
    ]);

    if (state.auth?.token) {
        await bootstrapAuthenticatedUser();
    }
}

document.addEventListener("DOMContentLoaded", initApp);