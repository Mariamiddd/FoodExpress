/**
 * ============================================================================
 * FOODEXPRESS — PRODUCTION FRONT-END APPLICATION (app.js)
 * Vanilla ES6+ JavaScript • 100% Live API Driven • Zero Mocked Data
 * ============================================================================
 */

const API_BASE = ""; // Relative to host (e.g. wwwroot/index.html); set to "https://localhost:7xxx" if hosted separately
const AUTH_STORAGE_KEY = "foodexpress_auth_session";

/* ============================================================================
   1. APPLICATION STATE
   ============================================================================ */
const state = {
    auth: {
        token: null,
        userId: null,
        userName: null,
        email: null,
        roles: [],
        expiresAt: null,
        profileImage: null
    },
    addresses: [],
    selectedAddressId: null,

    // Discovery & Catalog
    categories: [],
    adminCategories: [],
    restaurantsFeed: [],
    allRestaurantsCache: [],
    filters: {
        search: "",
        categoryId: "",
        page: 1,
        pageSize: 9,
        totalCount: 0,
        totalPages: 1
    },

    // Active Storefront View
    activeStorefrontId: null,
    activeStorefrontData: null,
    activeStorefrontMenu: [],

    // Preview Drawer & Dish Modal
    previewRestaurantId: null,
    activeModalDish: null,

    // Shopping Cart
    cart: {
        id: null,
        restaurantId: null,
        restaurantName: null,
        totalPrice: 0,
        items: []
    },
    pendingConflictItem: null, // { menuItemId, quantity, restaurantId, dishName }

    // Admin State
    adminSelectedRestaurantMenu: [],
    adminOrders: [],
    adminOrderFilter: "ALL"
};

/* ============================================================================
   2. ORDER STATE MACHINE DEFINITIONS
   ============================================================================ */
const ORDER_STATES = {
    0: { code: 0, key: "Created", label: "Created", next: 1, canCancel: true },
    1: { code: 1, key: "Confirmed", label: "Confirmed", next: 2, canCancel: true },
    2: { code: 2, key: "Preparing", label: "Preparing", next: 3, canCancel: false },
    3: { code: 3, key: "OnTheWay", label: "On The Way", next: 4, canCancel: false },
    4: { code: 4, key: "Delivered", label: "Delivered", next: null, canCancel: false },
    5: { code: 5, key: "Cancelled", label: "Cancelled", next: null, canCancel: false }
};

const ORDER_NAME_TO_CODE = {
    created: 0,
    confirmed: 1,
    preparing: 2,
    ontheway: 3,
    delivered: 4,
    cancelled: 5
};

function normalizeOrderStatus(rawStatus) {
    if (typeof rawStatus === "number" && ORDER_STATES[rawStatus]) {
        return ORDER_STATES[rawStatus];
    }
    if (typeof rawStatus === "string") {
        const num = Number(rawStatus);
        if (!Number.isNaN(num) && ORDER_STATES[num]) return ORDER_STATES[num];
        const mapped = ORDER_NAME_TO_CODE[rawStatus.toLowerCase().replace(/\s+/g, "")];
        if (mapped !== undefined) return ORDER_STATES[mapped];
    }
    return ORDER_STATES[0];
}

/* ============================================================================
   3. EARTHY SVG PLACEHOLDERS & IMAGE NORMALIZATION (ZERO BROKEN IMAGES)
   ============================================================================ */
function getEarthySvgPlaceholder(type = "dish", title = "") {
    const initials = (title || "FE")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("");

    if (type === "avatar") {
        return `
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="User Avatar">
        <rect width="120" height="120" fill="#B87C4C"/>
        <circle cx="60" cy="44" r="20" fill="#FAF6F0" opacity="0.9"/>
        <path d="M24 106c6-22 24-32 36-32s30 10 36 32" fill="#FAF6F0" opacity="0.9"/>
      </svg>`;
    }

    if (type === "restaurant") {
        return `
      <svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Kitchen Cover">
        <rect width="600" height="360" fill="#F2ECE1"/>
        <circle cx="490" cy="80" r="110" fill="#FADA7A" opacity="0.38"/>
        <path d="M0 290 Q180 230 360 285 T600 265 L600 360 L0 360 Z" fill="#677E61" opacity="0.22"/>
        <g transform="translate(260, 115)" stroke="#703B3B" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 26h68l-6 44H12L6 26z" fill="#FAF6F0"/>
          <path d="M2 26c0-10 16-18 38-18s38 8 38 18"/>
          <line x1="26" y1="42" x2="26" y2="56"/>
          <line x1="54" y1="42" x2="54" y2="56"/>
        </g>
        <text x="300" y="235" text-anchor="middle" fill="#703B3B" font-family="Fraunces, Georgia, serif" font-size="22" font-weight="600">${escapeHtml(initials)}</text>
      </svg>`;
    }

    return `
    <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Dish Illustration">
      <rect width="480" height="300" fill="#F2ECE1"/>
      <circle cx="240" cy="145" r="76" fill="#FAF6F0" stroke="#B87C4C" stroke-width="3"/>
      <circle cx="240" cy="145" r="54" fill="none" stroke="#677E61" stroke-width="2" stroke-dasharray="6 5"/>
      <text x="240" y="153" text-anchor="middle" fill="#703B3B" font-family="Fraunces, Georgia, serif" font-size="24" font-weight="700">${escapeHtml(initials)}</text>
    </svg>`;
}

function resolveImageUrl(imagePath) {
    if (!imagePath || typeof imagePath !== "string" || !imagePath.trim()) {
        return null;
    }
    const clean = imagePath.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
        return clean;
    }
    if (clean.startsWith("/")) {
        return `${API_BASE}${clean}`;
    }
    return `${API_BASE}/${clean}`;
}

function renderMediaWithFallback(imagePath, type = "dish", title = "") {
    const resolved = resolveImageUrl(imagePath);
    if (!resolved) {
        return getEarthySvgPlaceholder(type, title);
    }
    const encodedFallbackType = escapeHtml(type);
    const encodedTitle = escapeHtml(title);
    return `<img src="${escapeHtml(resolved)}" alt="${encodedTitle}" loading="lazy" data-fallback-type="${encodedFallbackType}" data-fallback-title="${encodedTitle}" onerror="window.__handleBrokenImage(this)" />`;
}

window.__handleBrokenImage = function (imgEl) {
    if (!imgEl || !imgEl.parentElement) return;
    const type = imgEl.getAttribute("data-fallback-type") || "dish";
    const title = imgEl.getAttribute("data-fallback-title") || "FE";
    imgEl.outerHTML = getEarthySvgPlaceholder(type, title);
};

/* ============================================================================
   4. TOAST NOTIFICATION SYSTEM & CENTRAL API FETCH HELPER
   ============================================================================ */
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    const typeClass = type === "error" ? "toast-error" : type === "warn" ? "toast-warn" : "";
    toast.className = `toast ${typeClass}`.trim();

    toast.innerHTML = `
    <div>${escapeHtml(message)}</div>
    <button type="button" aria-label="Dismiss notification" style="font-weight:700;color:inherit;">&times;</button>
  `;

    toast.querySelector("button").addEventListener("click", () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4800);
}

function extractApiErrorMessage(payload, status) {
    if (!payload) return `Request failed with HTTP status ${status}.`;

    // Validation errors dictionary: { errors: { field: ["msg1", "msg2"] } }
    if (payload.errors && typeof payload.errors === "object") {
        const messages = [];
        for (const [field, arr] of Object.entries(payload.errors)) {
            if (Array.isArray(arr)) {
                messages.push(`${field}: ${arr.join(", ")}`);
            } else if (typeof arr === "string") {
                messages.push(`${field}: ${arr}`);
            }
        }
        if (messages.length > 0) return messages.join(" | ");
    }

    // Standard wrapper message
    if (payload.message && typeof payload.message === "string") {
        return payload.message;
    }

    // ASP.NET ProblemDetails
    if (payload.detail && typeof payload.detail === "string") {
        return payload.detail;
    }
    if (payload.title && typeof payload.title === "string") {
        return payload.title;
    }

    return `Server returned HTTP ${status}.`;
}

/**
 * Central API Fetch Helper
 * Automatically attaches Bearer token, supports FormData without Content-Type override,
 * unwraps `{ success, message, data, errors }`, and triggers Toast notifications on errors.
 */
async function apiFetch(endpoint, options = {}) {
    const {
        method = "GET",
        body = undefined,
        isFormData = false,
        silentError = false,
        showSuccessToast = false
    } = options;

    const headers = { ...(options.headers || {}) };

    if (state.auth.token) {
        headers["Authorization"] = `Bearer ${state.auth.token}`;
    }

    let fetchBody = body;
    if (body !== undefined && body !== null) {
        if (isFormData || body instanceof FormData) {
            // CRITICAL: Do NOT set Content-Type when sending FormData; browser sets boundary automatically
            delete headers["Content-Type"];
            fetchBody = body;
        } else if (typeof body === "object") {
            headers["Content-Type"] = "application/json";
            fetchBody = JSON.stringify(body);
        }
    }

    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: fetchBody
        });

        let json = null;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json") || contentType.includes("application/problem+json")) {
            json = await response.json().catch(() => null);
        } else {
            const text = await response.text().catch(() => "");
            if (text) {
                try {
                    json = JSON.parse(text);
                } catch {
                    json = { message: text };
                }
            }
        }

        const isSuccessWrapper = json && typeof json === "object" && "success" in json;
        if (!response.ok || (isSuccessWrapper && json.success === false)) {
            const errMsg = extractApiErrorMessage(json, response.status);
            if (!silentError) {
                showToast(errMsg, "error");
            }
            const err = new Error(errMsg);
            err.status = response.status;
            err.payload = json;
            throw err;
        }

        if (showSuccessToast && json && json.message) {
            showToast(json.message, "success");
        }

        return isSuccessWrapper ? json.data : json;
    } catch (error) {
        if (!error.status && !silentError) {
            showToast(error.message || "Network connection error.", "error");
        }
        throw error;
    }
}

/* ============================================================================
   5. UTILITIES & FORMATTERS
   ============================================================================ */
function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `$${num.toFixed(2)}`;
}

function formatDateTime(isoString) {
    if (!isoString) return "Just now";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function isUserAuthenticated() {
    return Boolean(state.auth.token);
}

function isUserAdmin() {
    if (!Array.isArray(state.auth.roles)) return false;
    return state.auth.roles.some((r) => String(r).toLowerCase() === "admin");
}

/* ============================================================================
   6. AUTHENTICATION & SESSION MANAGEMENT
   Endpoints:
   (1) POST /api/Auth/Register
   (2) POST /api/Auth/Login
   ============================================================================ */
function loadSessionFromStorage() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.token) return;

        if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return;
        }

        state.auth = {
            token: parsed.token,
            userId: parsed.userId || null,
            userName: parsed.userName || "Member",
            email: parsed.email || "",
            roles: Array.isArray(parsed.roles) ? parsed.roles : [],
            expiresAt: parsed.expiresAt || null,
            profileImage: parsed.profileImage || null
        };
    } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }
}

function saveSessionToStorage(authData) {
    const roles = Array.isArray(authData.roles)
        ? authData.roles
        : authData.role
            ? [authData.role]
            : [];

    state.auth = {
        token: authData.token,
        userId: authData.userId ?? authData.id ?? null,
        userName: authData.userName ?? authData.username ?? "Member",
        email: authData.email ?? "",
        roles,
        expiresAt: authData.expiresAt ?? null,
        profileImage: authData.imagePath ?? authData.profileImageUrl ?? state.auth.profileImage ?? null
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.auth));
    syncAuthUI();
}

function clearSession() {
    state.auth = {
        token: null,
        userId: null,
        userName: null,
        email: null,
        roles: [],
        expiresAt: null,
        profileImage: null
    };
    state.addresses = [];
    state.selectedAddressId = null;
    state.cart = { id: null, restaurantId: null, restaurantName: null, totalPrice: 0, items: [] };
    localStorage.removeItem(AUTH_STORAGE_KEY);
    syncAuthUI();
    renderCartUI();
    renderAddressSelectors();
    switchMainView("homeDiscoveryView");
    showToast("Signed out of FoodExpress.", "success");
}

function syncAuthUI() {
    const loggedIn = isUserAuthenticated();
    const admin = isUserAdmin();

    document.getElementById("authTriggerBtn").classList.toggle("hidden", loggedIn);
    document.getElementById("headerSignOutBtn").classList.toggle("hidden", !loggedIn);
    document.getElementById("userProfileTriggerBtn").classList.toggle("hidden", !loggedIn);
    document.getElementById("topAddressPillWrap").classList.toggle("hidden", !loggedIn);
    document.getElementById("navMyOrdersBtn").classList.toggle("hidden", !loggedIn);
    document.getElementById("navAdminBtn").classList.toggle("hidden", !admin);
    document.getElementById("openStorefrontAddDishModalBtn").classList.toggle("hidden", !admin);

    if (loggedIn) {
        document.getElementById("topUserNameShort").textContent = state.auth.userName || "Account";
        const avatarMini = document.getElementById("topUserAvatarMini");
        if (state.auth.profileImage) {
            avatarMini.innerHTML = renderMediaWithFallback(state.auth.profileImage, "avatar", state.auth.userName);
        } else {
            const initials = (state.auth.userName || "FE").slice(0, 2).toUpperCase();
            avatarMini.textContent = initials;
        }
    }
}

// Endpoint 1: POST /api/Auth/Register
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const userName = document.getElementById("regUserName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;

    const data = await apiFetch("/api/Auth/Register", {
        method: "POST",
        body: { userName, email, password },
        showSuccessToast: true
    });

    if (data && data.token) {
        saveSessionToStorage(data);
        closeModal("authModal");
        document.getElementById("registerForm").reset();
        await initializeAuthenticatedUserState();
        showToast(`Welcome to FoodExpress, ${state.auth.userName}!`, "success");
    } else {
        showToast("Registration succeeded! Please sign in.", "success");
        switchAuthTab("login");
    }
}

// Endpoint 2: POST /api/Auth/Login
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const data = await apiFetch("/api/Auth/Login", {
        method: "POST",
        body: { email, password },
        showSuccessToast: true
    });

    if (data && data.token) {
        saveSessionToStorage(data);
        closeModal("authModal");
        document.getElementById("loginForm").reset();
        await initializeAuthenticatedUserState();
        showToast(`Welcome back, ${state.auth.userName}!`, "success");
    }
}

async function initializeAuthenticatedUserState() {
    if (!isUserAuthenticated()) return;
    await Promise.allSettled([
        fetchUserProfile(),
        fetchMyAddresses(),
        fetchCart()
    ]);
    if (isUserAdmin()) {
        await syncAdminDropdownData();
    }
}

/* ============================================================================
   7. USER PROFILE & SAVED ADDRESSES
   Endpoints:
   (3) GET /api/Users/profile
   (4) POST /api/Users/profile-image
   (5) GET /api/Addresses/my
   (6) POST /api/Addresses
   (7) DELETE /api/Addresses/{id}
   ============================================================================ */

// Endpoint 3: GET /api/Users/profile
async function fetchUserProfile() {
    if (!isUserAuthenticated()) return null;
    const profile = await apiFetch("/api/Users/profile", { silentError: true });
    if (!profile) return null;

    state.auth.userName = profile.userName ?? profile.username ?? state.auth.userName;
    state.auth.email = profile.email ?? state.auth.email;
    if (Array.isArray(profile.roles)) {
        state.auth.roles = profile.roles;
    }
    state.auth.profileImage =
        profile.imagePath ?? profile.profileImageUrl ?? profile.avatarUrl ?? state.auth.profileImage;

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.auth));
    syncAuthUI();
    renderProfileModalContent(profile);
    return profile;
}

function renderProfileModalContent(profile) {
    const userName = profile?.userName || state.auth.userName || "Member";
    const email = profile?.email || state.auth.email || "";
    const imagePath = profile?.imagePath ?? profile?.profileImageUrl ?? state.auth.profileImage;

    document.getElementById("profileNameDisplay").textContent = userName;
    document.getElementById("profileEmailDisplay").textContent = email;
    document.getElementById("profileAvatarFrame").innerHTML = renderMediaWithFallback(
        imagePath,
        "avatar",
        userName
    );

    const rolesWrap = document.getElementById("profileRolesBadges");
    const roles = state.auth.roles.length ? state.auth.roles : ["Customer"];
    rolesWrap.innerHTML = roles
        .map((r) => `<span class="badge-moss" style="margin-right:0.35rem;">${escapeHtml(r)}</span>`)
        .join("");
}

// Endpoint 4: POST /api/Users/profile-image
async function handleProfileImageUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById("profileImageInput");
    if (!fileInput.files || !fileInput.files[0]) {
        showToast("Please choose an image file first.", "warn");
        return;
    }

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    const result = await apiFetch("/api/Users/profile-image", {
        method: "POST",
        body: formData,
        isFormData: true,
        showSuccessToast: true
    });

    if (result && (result.imagePath || typeof result === "string")) {
        state.auth.profileImage = typeof result === "string" ? result : result.imagePath;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.auth));
    }

    document.getElementById("profileImageLivePreviewWrap").classList.add("hidden");
    fileInput.value = "";
    await fetchUserProfile();
    showToast("Profile avatar updated!", "success");
}

// Endpoint 5: GET /api/Addresses/my
async function fetchMyAddresses() {
    if (!isUserAuthenticated()) return [];
    const data = await apiFetch("/api/Addresses/my", { silentError: true });
    const list = Array.isArray(data) ? data : data?.items || [];
    state.addresses = list;

    if (list.length > 0) {
        const stillExists = list.some((a) => String(a.id) === String(state.selectedAddressId));
        if (!stillExists) {
            state.selectedAddressId = list[0].id;
        }
    } else {
        state.selectedAddressId = null;
    }

    renderAddressSelectors();
    renderSavedAddressesList();
    return list;
}

function renderAddressSelectors() {
    const topSelect = document.getElementById("topAddressSelect");
    const checkoutSelect = document.getElementById("checkoutAddressSelect");

    if (!state.addresses.length) {
        const emptyOption = `<option value="">No saved addresses — add one</option>`;
        topSelect.innerHTML = emptyOption;
        checkoutSelect.innerHTML = emptyOption;
        return;
    }

    const optionsHtml = state.addresses
        .map((addr) => {
            const selected = String(addr.id) === String(state.selectedAddressId) ? "selected" : "";
            return `<option value="${escapeHtml(addr.id)}" ${selected}>${escapeHtml(addr.street)}, ${escapeHtml(addr.city)}</option>`;
        })
        .join("");

    topSelect.innerHTML = optionsHtml;
    checkoutSelect.innerHTML = optionsHtml;
}

function renderSavedAddressesList() {
    const container = document.getElementById("savedAddressesList");
    if (!container) return;

    if (!state.addresses.length) {
        container.innerHTML = `<p class="muted-helper">No delivery addresses saved yet. Add one below.</p>`;
        return;
    }

    container.innerHTML = state.addresses
        .map(
            (addr) => `
      <div class="saved-address-item">
        <div>
          <strong>${escapeHtml(addr.street)}</strong>
          <div class="muted-helper">${escapeHtml(addr.city)} &bull; ID #${escapeHtml(addr.id)}</div>
        </div>
        <button
          type="button"
          class="btn-danger btn-sm"
          data-delete-address-id="${escapeHtml(addr.id)}"
          title="Delete address"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>
    `
        )
        .join("");
}

// Endpoint 6: POST /api/Addresses
async function createNewAddress(street, city) {
    const created = await apiFetch("/api/Addresses", {
        method: "POST",
        body: { street, city },
        showSuccessToast: true
    });

    await fetchMyAddresses();
    if (created && created.id) {
        state.selectedAddressId = created.id;
        renderAddressSelectors();
    } else if (state.addresses.length > 0) {
        state.selectedAddressId = state.addresses[state.addresses.length - 1].id;
        renderAddressSelectors();
    }
    showToast("Delivery address added and selected!", "success");
}

// Endpoint 7: DELETE /api/Addresses/{id}
async function deleteSavedAddress(addressId) {
    await apiFetch(`/api/Addresses/${encodeURIComponent(addressId)}`, {
        method: "DELETE",
        showSuccessToast: true
    });
    await fetchMyAddresses();
    showToast("Address removed.", "success");
}

/* ============================================================================
   8. DISCOVERY FEED, RESTAURANTS & MENUS
   Endpoints:
   (8)  GET /api/Restaurants?search={kw}&categoryId={catId}&page={page}&pageSize={size}
   (9)  GET /api/Restaurants/search?q={query}
   (10) GET /api/Restaurants/{id}
   (11) GET /api/Restaurants/{id}/menu
   (12) GET /api/Menu/restaurant/{restaurantId}
   (13) GET /api/Menu/categories
   (14) GET /api/Menu/category/{categoryId}
   (15) GET /api/Menu/search?q={term}&restaurantId={optionalId}
   (16) GET /api/Menu/{id}
   ============================================================================ */

// Endpoint 13: GET /api/Menu/categories
async function fetchPublicCategories() {
    const data = await apiFetch("/api/Menu/categories", { silentError: true });
    const list = Array.isArray(data) ? data : data?.items || [];
    state.categories = list;
    document.getElementById("heroCategoryCount").textContent = list.length;
    renderCategoryRibbon();
    populateStorefrontCategoryDropdown();
    return list;
}

function renderCategoryRibbon() {
    const ribbon = document.getElementById("categoryRibbon");
    const activeCat = String(state.filters.categoryId || "");

    const allPill = `
    <button type="button" class="category-pill ${activeCat === "" ? "active" : ""}" data-category-id="">
      All Kitchens
    </button>
  `;

    const catPills = state.categories
        .map((cat) => {
            const isActive = String(cat.id) === activeCat;
            return `
        <button
          type="button"
          class="category-pill ${isActive ? "active" : ""}"
          data-category-id="${escapeHtml(cat.id)}"
          data-category-name="${escapeHtml(cat.name)}"
        >
          ${escapeHtml(cat.name)}
        </button>
      `;
        })
        .join("");

    ribbon.innerHTML = allPill + catPills;
    document.getElementById("clearCategoryFilterBtn").classList.toggle("hidden", activeCat === "");
}

// Endpoint 14: GET /api/Menu/category/{categoryId}
async function fetchDishesByCategory(categoryId, categoryName = "Selected Category") {
    const section = document.getElementById("categoryDishesSection");
    const grid = document.getElementById("categoryDishesGrid");
    const titleEl = document.getElementById("categoryDishesTitle");

    if (!categoryId) {
        section.classList.add("hidden");
        return;
    }

    section.classList.remove("hidden");
    titleEl.textContent = `Explore ${categoryName} Dishes Across FoodExpress`;
    grid.innerHTML = `<p class="muted-helper">Loading dishes in ${escapeHtml(categoryName)}...</p>`;

    const data = await apiFetch(`/api/Menu/category/${encodeURIComponent(categoryId)}`);
    const dishes = Array.isArray(data) ? data : data?.items || [];

    if (!dishes.length) {
        grid.innerHTML = `<p class="muted-helper">No dishes currently listed in ${escapeHtml(categoryName)}.</p>`;
        return;
    }

    grid.innerHTML = dishes.map((dish) => renderDishCardHtml(dish)).join("");
}

// Endpoint 8: GET /api/Restaurants?search={kw}&categoryId={catId}&page={page}&pageSize={size}
async function fetchRestaurantsFeed() {
    const { search, categoryId, page, pageSize } = state.filters;
    const params = new URLSearchParams();
    if (search && search.trim()) params.set("search", search.trim());
    if (categoryId !== "" && categoryId !== null && categoryId !== undefined) {
        params.set("categoryId", categoryId);
    }
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const grid = document.getElementById("restaurantsGrid");
    const metaLabel = document.getElementById("restaurantsMetaLabel");
    metaLabel.textContent = "Syncing kitchens...";

    const data = await apiFetch(`/api/Restaurants?${params.toString()}`);

    // Support both paged response object and flat array
    let items = [];
    let totalCount = 0;
    let totalPages = 1;

    if (Array.isArray(data)) {
        items = data;
        totalCount = data.length;
        totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    } else if (data && typeof data === "object") {
        items = data.items || data.restaurants || data.data || [];
        totalCount = data.totalCount ?? data.totalItems ?? items.length;
        totalPages = data.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
    }

    state.restaurantsFeed = items;
    state.filters.totalCount = totalCount;
    state.filters.totalPages = totalPages;

    document.getElementById("heroRestaurantCount").textContent = totalCount || items.length;
    metaLabel.textContent = `Showing ${items.length} restaurant(s) • Page ${page} of ${totalPages}`;

    renderRestaurantsGrid(items);
    renderPaginationControls();
}

function restaurantIsOpen(restaurant) {
    if (!restaurant) return true;
    return restaurant.isActive !== false && restaurant.IsActive !== false;
}

function rememberRestaurant(restaurant) {
    if (!restaurant || restaurant.id == null) return;
    state.restaurantStatusCache = state.restaurantStatusCache || {};
    state.restaurantStatusCache[String(restaurant.id)] = restaurantIsOpen(restaurant);
}

function restaurantOpenById(restaurantId, fallbackDish) {
    if (fallbackDish && (fallbackDish.restaurantIsActive === false || fallbackDish.RestaurantIsActive === false)) {
        return false;
    }
    const id = restaurantId == null ? "" : String(restaurantId);
    const cached = (state.restaurantsFeed || []).find((r) => String(r.id) === id)
        || (state.allRestaurantsCache || []).find((r) => String(r.id) === id)
        || (state.activeStorefrontData && String(state.activeStorefrontData.id) === id ? state.activeStorefrontData : null);
    if (cached) return restaurantIsOpen(cached);
    if (state.restaurantStatusCache && Object.prototype.hasOwnProperty.call(state.restaurantStatusCache, id)) {
        return state.restaurantStatusCache[id] !== false;
    }
    return true;
}

function statusLabel(isOpen) {
    return isOpen ? "Open" : "Temporarily Closed";
}

function renderRestaurantsGrid(restaurants) {
    const grid = document.getElementById("restaurantsGrid");
    if (!restaurants.length) {
        grid.innerHTML = `
      <div class="admin-card" style="grid-column: 1 / -1; text-align:center;">
        <h3>No kitchens match your current filter</h3>
        <p class="muted-helper">Try clearing your search keyword or switching categories.</p>
      </div>
    `;
        return;
    }

    grid.innerHTML = restaurants
        .map((r) => {
            rememberRestaurant(r);
            const open = restaurantIsOpen(r);
            return `
      <article class="restaurant-card${open ? "" : " is-closed"}" data-restaurant-card-id="${escapeHtml(r.id)}">
        <div class="restaurant-card-media" data-open-storefront-id="${escapeHtml(r.id)}">
          ${renderMediaWithFallback(r.imagePath, "restaurant", r.name)}
          <span class="restaurant-card-badge ${open ? "open" : "closed"}">${statusLabel(open)}</span>
        </div>
        <div class="restaurant-card-body">
          <div>
            <h3 class="restaurant-card-title" data-open-storefront-id="${escapeHtml(r.id)}">
              ${escapeHtml(r.name)}
            </h3>
            <p class="restaurant-card-address">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${escapeHtml(r.address || "Local Kitchen")}</span>
            </p>
          </div>
          <div class="restaurant-card-actions">
            <button
              type="button"
              class="btn-secondary btn-sm"
              data-preview-dishes-id="${escapeHtml(r.id)}"
              data-preview-dishes-name="${escapeHtml(r.name)}"
            >
              Preview Dishes
            </button>
            <button
              type="button"
              class="btn-primary btn-sm"
              data-open-storefront-id="${escapeHtml(r.id)}"
            >
              View menu &rarr;
            </button>
          </div>
        </div>
      </article>
    `;
        })
        .join("");
}

function renderPaginationControls() {
    const { page, totalPages } = state.filters;
    const currentHasFullPage = state.restaurantsFeed.length >= state.filters.pageSize;

    document.getElementById("paginationInfo").textContent = `Page ${page} of ${Math.max(1, totalPages)}`;
    document.getElementById("prevPageBtn").disabled = page <= 1;
    document.getElementById("nextPageBtn").disabled = page >= totalPages && !currentHasFullPage;
}

// Endpoint 9: GET /api/Restaurants/search?q={query}
async function runQuickRestaurantSearch() {
    const input = document.getElementById("quickRestaurantSearchInput");
    const resultsWrap = document.getElementById("quickRestaurantResults");
    const q = input.value.trim();

    if (!q) {
        resultsWrap.innerHTML = `<p class="muted-helper">Enter a restaurant name or street address.</p>`;
        return;
    }

    resultsWrap.innerHTML = `<p class="muted-helper">Searching "${escapeHtml(q)}"...</p>`;
    const data = await apiFetch(`/api/Restaurants/search?q=${encodeURIComponent(q)}`);
    const list = Array.isArray(data) ? data : data?.items || [];

    if (!list.length) {
        resultsWrap.innerHTML = `<p class="muted-helper">No restaurants found for "${escapeHtml(q)}".</p>`;
        return;
    }

    resultsWrap.innerHTML = list
        .map(
            (r) => `
      <div class="quick-result-item" data-open-storefront-id="${escapeHtml(r.id)}">
        <div>
          <strong>${escapeHtml(r.name)}</strong>
          <div class="muted-helper">${escapeHtml(r.address || "")}</div>
        </div>
        <span class="badge-moss">${statusLabel(restaurantIsOpen(r))}</span>
      </div>
    `
        )
        .join("");
}

// Endpoint 10: GET /api/Restaurants/{id} & Endpoint 11: GET /api/Restaurants/{id}/menu
async function openRestaurantStorefront(restaurantId) {
    if (!restaurantId) return;
    state.activeStorefrontId = Number(restaurantId);

    switchMainView("storefrontView");
    document.getElementById("quickFinderPopover").classList.add("hidden");
    closePreviewDishesDrawer();

    document.getElementById("storefrontName").textContent = "Loading kitchen...";
    document.getElementById("storefrontAddress").textContent = "";
    document.getElementById("storefrontMenuGrid").innerHTML = `<p class="muted-helper">Loading menu items...</p>`;

    const [restaurantData, menuData] = await Promise.all([
        apiFetch(`/api/Restaurants/${encodeURIComponent(restaurantId)}`),
        apiFetch(`/api/Restaurants/${encodeURIComponent(restaurantId)}/menu`)
    ]);

    state.activeStorefrontData = restaurantData;
    const menuItems = Array.isArray(menuData)
        ? menuData
        : menuData?.items || restaurantData?.menuItems || [];
    state.activeStorefrontMenu = menuItems;

    renderStorefrontHero(restaurantData);
    renderStorefrontMenu(menuItems);
}

async function refreshActiveStorefrontMenu() {
    if (!state.activeStorefrontId) return;
    const menuData = await apiFetch(
        `/api/Restaurants/${encodeURIComponent(state.activeStorefrontId)}/menu`
    );
    const menuItems = Array.isArray(menuData) ? menuData : menuData?.items || [];
    state.activeStorefrontMenu = menuItems;
    renderStorefrontMenu(menuItems);
    showToast("Kitchen menu refreshed.", "success");
}

function renderStorefrontHero(r) {
    if (!r) return;
    rememberRestaurant(r);
    const open = restaurantIsOpen(r);
    const statusBadge = document.getElementById("storefrontStatusBadge");
    statusBadge.textContent = statusLabel(open);
    statusBadge.className = `status-pill ${open ? "open" : "closed"}`;
    document.getElementById("storefrontClosedNote").classList.toggle("hidden", open);
    document.getElementById("storefrontName").textContent = r.name || "Restaurant";
    document.getElementById("storefrontAddress").textContent = r.address || "";
    document.getElementById("storefrontBannerWrap").innerHTML = renderMediaWithFallback(
        r.imagePath,
        "restaurant",
        r.name
    );
}

function renderStorefrontMenu(dishes) {
    const grid = document.getElementById("storefrontMenuGrid");
    document.getElementById("storefrontDishCount").textContent = dishes.length;

    if (!dishes.length) {
        grid.innerHTML = `
      <div class="admin-card" style="grid-column: 1 / -1; text-align:center;">
        <h3>No dishes found</h3>
        <p class="muted-helper">This kitchen has no matching dishes right now.</p>
      </div>
    `;
        return;
    }

    grid.innerHTML = dishes
        .map((dish) =>
            renderDishCardHtml({
                ...dish,
                restaurantId: dish.restaurantId ?? state.activeStorefrontId,
                restaurantName: dish.restaurantName ?? state.activeStorefrontData?.name
            })
        )
        .join("");
}

// Endpoint 12: GET /api/Menu/restaurant/{restaurantId} (Used in Preview Drawer & Admin Menu Manager)
async function openPreviewDishesDrawer(restaurantId, restaurantName = "Kitchen") {
    state.previewRestaurantId = Number(restaurantId);
    document.getElementById("previewDrawerRestaurantName").textContent = restaurantName;
    document.getElementById("previewDishesBackdrop").classList.remove("hidden");
    document.getElementById("previewDishesDrawer").classList.remove("hidden");

    const listWrap = document.getElementById("previewDishesList");
    listWrap.innerHTML = `<p class="muted-helper">Loading dishes...</p>`;

    const data = await apiFetch(`/api/Menu/restaurant/${encodeURIComponent(restaurantId)}`);
    const dishes = Array.isArray(data) ? data : data?.items || [];

    if (!dishes.length) {
        listWrap.innerHTML = `<p class="muted-helper">No dishes published for this kitchen yet.</p>`;
        return;
    }

    listWrap.innerHTML = dishes
        .map(
            (d) => `
      <div class="cart-item-row">
        <div class="cart-item-info" style="cursor:pointer;" data-open-dish-modal-id="${escapeHtml(d.id)}">
          <h4>${escapeHtml(d.name)}</h4>
          <span>${formatCurrency(d.price)} &bull; ${escapeHtml(d.categoryName || "Menu Item")}</span>
        </div>
        <button
          type="button"
          class="btn-add-dish"
          ${d.isAvailable === false || restaurantOpenById(d.restaurantId ?? restaurantId, d) === false ? "disabled" : ""}
          data-quick-add-dish-id="${escapeHtml(d.id)}"
          data-quick-add-rest-id="${escapeHtml(d.restaurantId ?? restaurantId)}"
          data-quick-add-dish-name="${escapeHtml(d.name)}"
        >
          ${restaurantOpenById(d.restaurantId ?? restaurantId, d) === false ? "Closed" : d.isAvailable === false ? "Sold Out" : "+ Add"}
        </button>
      </div>
    `
        )
        .join("");
}

function closePreviewDishesDrawer() {
    document.getElementById("previewDishesBackdrop").classList.add("hidden");
    document.getElementById("previewDishesDrawer").classList.add("hidden");
}

// Endpoint 15: GET /api/Menu/search?q={term}&restaurantId={optionalId}
async function searchDishes(term, optionalRestaurantId = null) {
    const params = new URLSearchParams();
    params.set("q", term);
    if (optionalRestaurantId) {
        params.set("restaurantId", String(optionalRestaurantId));
    }

    const data = await apiFetch(`/api/Menu/search?${params.toString()}`);
    return Array.isArray(data) ? data : data?.items || [];
}

// Global Dish Search Handler (Home View)
async function handleGlobalDishSearchSubmit(e) {
    e.preventDefault();
    const q = document.getElementById("globalDishSearchInput").value.trim();
    if (!q) {
        showToast("Type a dish keyword to search across all kitchens.", "warn");
        return;
    }

    switchMainView("homeDiscoveryView");
    const section = document.getElementById("dishSearchResultsSection");
    const grid = document.getElementById("dishSearchResultsGrid");
    const titleEl = document.getElementById("dishSearchTitle");

    section.classList.remove("hidden");
    titleEl.textContent = `Dishes Matching "${q}"`;
    grid.innerHTML = `<p class="muted-helper">Searching dishes...</p>`;

    const results = await searchDishes(q);
    if (!results.length) {
        grid.innerHTML = `<p class="muted-helper">No dishes matched "${escapeHtml(q)}".</p>`;
        return;
    }
    grid.innerHTML = results.map((d) => renderDishCardHtml(d)).join("");
}

// Storefront In-Restaurant Dish Search Handler
async function handleStorefrontDishSearchSubmit(e) {
    e.preventDefault();
    if (!state.activeStorefrontId) return;
    const q = document.getElementById("storefrontDishSearchInput").value.trim();
    const clearBtn = document.getElementById("clearStorefrontSearchBtn");

    if (!q) {
        clearBtn.classList.add("hidden");
        renderStorefrontMenu(state.activeStorefrontMenu);
        return;
    }

    clearBtn.classList.remove("hidden");
    const results = await searchDishes(q, state.activeStorefrontId);
    renderStorefrontMenu(results);
}

// Reusable Dish Card Template
function renderDishCardHtml(dish) {
    const restId = dish.restaurantId ?? state.activeStorefrontId ?? "";
    const kitchenOpen = restaurantOpenById(restId, dish);
    const available = dish.isAvailable !== false && kitchenOpen;
    return `
    <article class="dish-card" data-dish-card-id="${escapeHtml(dish.id)}">
      <div class="dish-card-media" data-open-dish-modal-id="${escapeHtml(dish.id)}">
        ${renderMediaWithFallback(dish.imagePath, "dish", dish.name)}
        <span class="dish-status-pill ${available ? "available" : "soldout"}">
          ${available ? "Available" : "Sold Out"}
        </span>
        <span class="dish-price-tag">${formatCurrency(dish.price)}</span>
      </div>
      <div class="dish-card-body">
        <div>
          <h3 class="dish-card-title" data-open-dish-modal-id="${escapeHtml(dish.id)}">
            ${escapeHtml(dish.name)}
          </h3>
          <p class="dish-card-sub">
            ${escapeHtml(dish.categoryName || "Specialty")}
            ${dish.restaurantName ? ` &bull; ${escapeHtml(dish.restaurantName)}` : ""}
          </p>
        </div>
        <div class="dish-card-footer">
          <button
            type="button"
            class="btn-text-link"
            data-open-dish-modal-id="${escapeHtml(dish.id)}"
          >
            Quick View
          </button>
          <button
            type="button"
            class="btn-add-dish"
            ${!available ? "disabled" : ""}
            data-quick-add-dish-id="${escapeHtml(dish.id)}"
            data-quick-add-rest-id="${escapeHtml(restId)}"
            data-quick-add-dish-name="${escapeHtml(dish.name)}"
          >
            ${!kitchenOpen ? "Closed" : available ? "+ Add" : "Unavailable"}
          </button>
        </div>
      </div>
    </article>
  `;
}

// Endpoint 16: GET /api/Menu/{id} (Dish Detail Modal)
async function openDishDetailModal(dishId) {
    if (!dishId) return;
    openModal("dishDetailModal");
    document.getElementById("dishModalName").textContent = "Loading dish...";
    document.getElementById("dishModalQtyInput").value = "1";

    const dish = await apiFetch(`/api/Menu/${encodeURIComponent(dishId)}`);
    state.activeModalDish = dish;

    const kitchenOpen = restaurantOpenById(dish.restaurantId, dish);
    const available = dish.isAvailable !== false && kitchenOpen;
    document.getElementById("dishModalImageWrap").innerHTML = renderMediaWithFallback(
        dish.imagePath,
        "dish",
        dish.name
    );
    document.getElementById("dishModalCategoryBadge").textContent = dish.categoryName || "Menu Item";
    const availBadge = document.getElementById("dishModalAvailabilityBadge");
    availBadge.textContent = available ? "Available Now" : "Currently Sold Out";
    availBadge.className = `dish-status-pill ${available ? "available" : "soldout"}`;

    document.getElementById("dishModalName").textContent = dish.name;
    document.getElementById("dishModalRestaurantName").textContent =
        dish.restaurantName || state.activeStorefrontData?.name || `Kitchen #${dish.restaurantId || "—"}`;
    document.getElementById("dishModalPrice").textContent = formatCurrency(dish.price);
    document.getElementById("dishModalIdLabel").textContent = `Dish ID #${dish.id}`;

    const addBtn = document.getElementById("dishModalAddToCartBtn");
    addBtn.disabled = !available;
    addBtn.textContent = !kitchenOpen ? "Temporarily Closed" : available ? `Add to Basket • ${formatCurrency(dish.price)}` : "Sold Out";
}

/* ============================================================================
   9. SHOPPING CART & SINGLE-RESTAURANT CONFLICT HANDLER
   Endpoints:
   (17) GET /api/Cart
   (18) POST /api/Cart/items
   (19) PUT /api/Cart/items/{menuItemId}
   (20) DELETE /api/Cart/items/{menuItemId}
   ============================================================================ */

// Endpoint 17: GET /api/Cart
async function fetchCart() {
    if (!isUserAuthenticated()) {
        state.cart = { id: null, restaurantId: null, restaurantName: null, totalPrice: 0, items: [] };
        renderCartUI();
        return state.cart;
    }

    try {
        const data = await apiFetch("/api/Cart", { silentError: true });
        if (data && typeof data === "object") {
            state.cart = {
                id: data.id ?? null,
                restaurantId: data.restaurantId ?? null,
                restaurantName: data.restaurantName ?? null,
                totalPrice: Number(data.totalPrice) || 0,
                items: Array.isArray(data.items) ? data.items : []
            };
        } else {
            state.cart = { id: null, restaurantId: null, restaurantName: null, totalPrice: 0, items: [] };
        }
    } catch {
        state.cart = { id: null, restaurantId: null, restaurantName: null, totalPrice: 0, items: [] };
    }

    renderCartUI();
    return state.cart;
}

function renderCartUI() {
    const items = state.cart.items || [];
    const totalCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalPrice =
        state.cart.totalPrice ||
        items.reduce((sum, item) => sum + (Number(item.lineTotal) || Number(item.price) * Number(item.quantity) || 0), 0);

    document.getElementById("cartCountBadge").textContent = String(totalCount);
    document.getElementById("cartTotalPriceLabel").textContent = formatCurrency(totalPrice);
    document.getElementById("cartDrawerTotal").textContent = formatCurrency(totalPrice);

    const banner = document.getElementById("cartRestaurantBanner");
    if (items.length > 0 && (state.cart.restaurantName || state.cart.restaurantId)) {
        banner.classList.remove("hidden");
        document.getElementById("cartRestaurantNameLabel").textContent =
            state.cart.restaurantName || `Kitchen #${state.cart.restaurantId}`;
        document.getElementById("cartRestaurantIdLabel").textContent = state.cart.restaurantId
            ? `ID #${state.cart.restaurantId}`
            : "";
    } else {
        banner.classList.add("hidden");
    }

    const listEl = document.getElementById("cartItemsList");
    const placeOrderBtn = document.getElementById("placeOrderBtn");

    if (!items.length) {
        listEl.innerHTML = `
      <div style="text-align:center; padding: 2.2rem 1rem;">
        <p class="muted-helper">Your basket is currently empty.</p>
        <p class="muted-helper" style="font-size:0.78rem; margin-top:0.35rem;">
          Add dishes from any local kitchen to begin checkout.
        </p>
      </div>
    `;
        placeOrderBtn.disabled = true;
        return;
    }

    placeOrderBtn.disabled = false;
    listEl.innerHTML = items
        .map((item) => {
            const lineTotal = item.lineTotal ?? Number(item.price) * Number(item.quantity);
            return `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <h4>${escapeHtml(item.name)}</h4>
            <span>${formatCurrency(item.price)} each &bull; Subtotal: <strong>${formatCurrency(lineTotal)}</strong></span>
          </div>
          <div class="cart-item-controls">
            <div class="qty-stepper">
              <button
                type="button"
                class="qty-btn"
                data-cart-step-id="${escapeHtml(item.menuItemId)}"
                data-cart-step-qty="${Number(item.quantity) - 1}"
                aria-label="Decrease quantity"
              >&minus;</button>
              <input type="text" value="${escapeHtml(item.quantity)}" readonly aria-label="Quantity" />
              <button
                type="button"
                class="qty-btn"
                data-cart-step-id="${escapeHtml(item.menuItemId)}"
                data-cart-step-qty="${Number(item.quantity) + 1}"
                aria-label="Increase quantity"
              >+</button>
            </div>
            <button
              type="button"
              class="btn-danger btn-sm"
              data-cart-remove-id="${escapeHtml(item.menuItemId)}"
              title="Remove item"
            >&times;</button>
          </div>
        </div>
      `;
        })
        .join("");
}

// Endpoint 18: POST /api/Cart/items (With Single-Restaurant Business Rule Enforcement)
async function addItemToCart(menuItemId, quantity = 1, targetRestaurantId = null, dishName = "Dish") {
    if (!isUserAuthenticated()) {
        showToast("Please sign in to add dishes to your basket.", "warn");
        openModal("authModal");
        return;
    }

    const cleanDishId = Number(menuItemId);
    const cleanQty = Math.max(1, Number(quantity) || 1);
    const cleanRestId = targetRestaurantId ? Number(targetRestaurantId) : null;

    if (cleanRestId && !restaurantOpenById(cleanRestId)) {
        showToast("This restaurant is temporarily closed and not accepting orders.", "warn");
        return;
    }

    // Proactive client-side check if cart already has items from a different restaurant
    if (
        state.cart.items.length > 0 &&
        state.cart.restaurantId &&
        cleanRestId &&
        Number(state.cart.restaurantId) !== cleanRestId
    ) {
        promptCartConflictModal(cleanDishId, cleanQty, cleanRestId, dishName);
        return;
    }

    try {
        await apiFetch("/api/Cart/items", {
            method: "POST",
            body: { menuItemId: cleanDishId, quantity: cleanQty },
            silentError: true
        });
        await fetchCart();
        showToast(`Added ${cleanQty}x "${dishName}" to your basket!`, "success");
    } catch (error) {
        // If backend rejected due to different restaurant conflict, open conflict resolution modal
        const msg = (error.message || "").toLowerCase();
        if (
            state.cart.items.length > 0 &&
            (msg.includes("restaurant") || msg.includes("different") || error.status === 400 || error.status === 409)
        ) {
            promptCartConflictModal(cleanDishId, cleanQty, cleanRestId, dishName, error.message);
        } else {
            showToast(error.message || "Could not add item to cart.", "error");
        }
    }
}

function promptCartConflictModal(menuItemId, quantity, restaurantId, dishName, customMessage = null) {
    state.pendingConflictItem = { menuItemId, quantity, restaurantId, dishName };
    const msgEl = document.getElementById("cartConflictMessage");
    msgEl.textContent =
        customMessage ||
        `Your basket currently holds items from "${state.cart.restaurantName || `Kitchen #${state.cart.restaurantId}`}". Would you like to clear your current basket and add "${dishName}" instead?`;
    openModal("cartConflictModal");
}

async function resolveCartConflictAndAdd() {
    const pending = state.pendingConflictItem;
    if (!pending) return;

    closeModal("cartConflictModal");
    // Delete all existing items in the cart via DELETE /api/Cart/items/{menuItemId}
    for (const item of state.cart.items) {
        await apiFetch(`/api/Cart/items/${encodeURIComponent(item.menuItemId)}`, {
            method: "DELETE",
            silentError: true
        });
    }
    await fetchCart();
    state.pendingConflictItem = null;
    await addItemToCart(pending.menuItemId, pending.quantity, pending.restaurantId, pending.dishName);
}

// Endpoint 19: PUT /api/Cart/items/{menuItemId} & Endpoint 20: DELETE /api/Cart/items/{menuItemId}
async function updateCartItemQuantity(menuItemId, newQuantity) {
    const qty = Number(newQuantity);
    if (qty < 1) {
        await removeCartItem(menuItemId);
        return;
    }

    await apiFetch(`/api/Cart/items/${encodeURIComponent(menuItemId)}`, {
        method: "PUT",
        body: { quantity: qty }
    });
    await fetchCart();
}

async function removeCartItem(menuItemId) {
    await apiFetch(`/api/Cart/items/${encodeURIComponent(menuItemId)}`, {
        method: "DELETE"
    });
    await fetchCart();
    showToast("Item removed from basket.", "success");
}

/* ============================================================================
   10. CHECKOUT & ORDER STATE MACHINE
   Endpoints:
   (21) POST /api/Orders
   (22) GET /api/Orders/my
   (23) GET /api/Orders/{id}
   (24) GET /api/Orders
   (25) PATCH /api/Orders/{id}/status
   ============================================================================ */

// Endpoint 21: POST /api/Orders
async function handlePlaceOrder() {
    if (!isUserAuthenticated()) {
        openModal("authModal");
        return;
    }

    if (!state.cart.items.length) {
        showToast("Your basket is empty.", "warn");
        return;
    }

    if (state.cart.restaurantId && !restaurantOpenById(state.cart.restaurantId)) {
        showToast("This restaurant is temporarily closed and not accepting orders.", "warn");
        return;
    }

    const checkoutSelect = document.getElementById("checkoutAddressSelect");
    const addressId = Number(checkoutSelect.value || state.selectedAddressId);

    if (!addressId) {
        showToast("Please select or add a delivery address before placing your order.", "warn");
        document.getElementById("cartAddAddressForm").classList.remove("hidden");
        return;
    }

    const orderData = await apiFetch("/api/Orders", {
        method: "POST",
        body: { addressId },
        showSuccessToast: true
    });

    closeCartDrawer();
    await fetchCart();
    showToast("Order dispatched to kitchen!", "success");

    // Switch to My Orders view and open receipt if ID returned
    await openMyOrdersView();
    if (orderData && orderData.id) {
        await openOrderDetailModal(orderData.id);
    }
}

// Endpoint 22: GET /api/Orders/my
async function openMyOrdersView() {
    if (!isUserAuthenticated()) {
        openModal("authModal");
        return;
    }
    switchMainView("myOrdersView");
    await fetchMyOrders();
}

async function fetchMyOrders() {
    const grid = document.getElementById("myOrdersGrid");
    grid.innerHTML = `<p class="muted-helper">Loading your orders...</p>`;

    const data = await apiFetch("/api/Orders/my");
    const orders = Array.isArray(data) ? data : data?.items || [];

    if (!orders.length) {
        grid.innerHTML = `
      <div class="admin-card" style="grid-column: 1 / -1; text-align:center;">
        <h3>No orders placed yet</h3>
        <p class="muted-helper">Explore local restaurants on the Discovery Feed to place your first order.</p>
      </div>
    `;
        return;
    }

    grid.innerHTML = orders
        .map((order) => {
            const st = normalizeOrderStatus(order.status);
            // Customer cancellation rule: ONLY allowed if status is Created (0) or Confirmed (1)
            const canCustomerCancel = st.code === 0 || st.code === 1;

            return `
        <article class="order-card">
          <div class="order-card-header">
            <div>
              <h3 class="order-id-title">Order #${escapeHtml(order.id)}</h3>
              <span class="order-timestamp">${escapeHtml(formatDateTime(order.createdAt || order.orderDate))}</span>
            </div>
            <span class="status-badge status-${st.code}">${st.code} &bull; ${escapeHtml(st.label)}</span>
          </div>

          <div>
            ${order.restaurantName ? `<p><strong>Kitchen:</strong> ${escapeHtml(order.restaurantName)}</p>` : ""}
            ${order.deliveryAddress || order.address ? `<p class="muted-helper"><strong>Deliver to:</strong> ${escapeHtml(order.deliveryAddress || order.address)}</p>` : ""}
            <p style="margin-top:0.35rem;"><strong>Total:</strong> ${formatCurrency(order.totalPrice ?? order.totalAmount)}</p>
          </div>

          <div class="order-card-footer">
            <button
              type="button"
              class="btn-secondary btn-sm"
              data-view-order-id="${escapeHtml(order.id)}"
            >
              View Receipt / Track Order
            </button>
            ${canCustomerCancel
                    ? `<button
                     type="button"
                     class="btn-danger btn-sm"
                     data-cancel-order-id="${escapeHtml(order.id)}"
                   >
                     Cancel Order
                   </button>`
                    : ""
                }
          </div>
        </article>
      `;
        })
        .join("");
}

// Endpoint 23: GET /api/Orders/{id} (Order Detail Modal)
async function openOrderDetailModal(orderId) {
    if (!orderId) return;
    openModal("orderDetailModal");
    document.getElementById("orderModalTitle").textContent = `Order #${orderId}`;
    const bodyEl = document.getElementById("orderDetailModalBody");
    bodyEl.innerHTML = `<p class="muted-helper">Loading itemized receipt via GET /api/Orders/${escapeHtml(orderId)}...</p>`;

    const order = await apiFetch(`/api/Orders/${encodeURIComponent(orderId)}`);
    const st = normalizeOrderStatus(order.status);
    const items = order.orderItems || order.items || [];

    const itemsRowsHtml = items.length
        ? items
            .map((item) => {
                const unitPrice = item.unitPrice ?? item.priceAtTimeOfOrder ?? item.price ?? 0;
                const priceAtOrder = item.priceAtTimeOfOrder ?? item.unitPrice ?? item.price ?? 0;
                const lineTotal = item.lineTotal ?? Number(priceAtOrder) * Number(item.quantity || 1);
                return `
            <tr>
              <td><strong>${escapeHtml(item.name || item.menuItemName || `Item #${item.menuItemId || ""}`)}</strong></td>
              <td>${escapeHtml(item.quantity)}</td>
              <td>${formatCurrency(unitPrice)}</td>
              <td>${formatCurrency(priceAtOrder)}</td>
              <td><strong>${formatCurrency(lineTotal)}</strong></td>
            </tr>
          `;
            })
            .join("")
        : `<tr><td colspan="5" class="muted-helper">No line items returned for this order.</td></tr>`;

    bodyEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
      <div>
        <p><strong>Placed:</strong> ${escapeHtml(formatDateTime(order.createdAt || order.orderDate))}</p>
        ${order.restaurantName ? `<p><strong>Restaurant:</strong> ${escapeHtml(order.restaurantName)}</p>` : ""}
        ${order.deliveryAddress || order.address ? `<p><strong>Delivery Address:</strong> ${escapeHtml(order.deliveryAddress || order.address)}</p>` : ""}
      </div>
      <span class="status-badge status-${st.code}" style="font-size:0.88rem; padding:0.35rem 0.85rem;">
        Status: ${st.code} (${escapeHtml(st.label)})
      </span>
    </div>

    <table class="receipt-table">
      <thead>
        <tr>
          <th>Dish</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Price at Order</th>
          <th>Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
      </tbody>
    </table>

    <div style="display:flex; justify-content:flex-end; margin-top:1.1rem; font-size:1.15rem;">
      <span>Order Total: <strong style="color:var(--espresso);">${formatCurrency(order.totalPrice ?? order.totalAmount)}</strong></span>
    </div>
  `;
}

// Endpoint 25: PATCH /api/Orders/{id}/status
async function updateOrderStatus(orderId, nextStatusInt) {
    const numericStatus = Number(nextStatusInt);
    await apiFetch(`/api/Orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        body: { status: numericStatus },
        showSuccessToast: true
    });

    const targetState = ORDER_STATES[numericStatus];
    showToast(`Order #${orderId} updated to ${targetState ? targetState.label : numericStatus}.`, "success");

    // Refresh whichever order view is active
    if (!document.getElementById("myOrdersView").classList.contains("hidden")) {
        await fetchMyOrders();
    }
    if (!document.getElementById("adminDashboardView").classList.contains("hidden")) {
        await fetchAdminAllOrders();
    }
}

/* ============================================================================
   11. FRICTIONLESS ADMIN CONTROL CENTER (100% DROPDOWN-DRIVEN UX)
   Endpoints:
   (26) POST /api/Admin/restaurants
   (27) POST /api/Restaurants
   (28) PUT /api/Admin/restaurants/{id}
   (29) DELETE /api/Admin/restaurants/{id}
   (30) POST /api/Admin/restaurants/{id}/image
   (31) GET /api/Admin/categories
   (32) POST /api/Admin/categories
   (33) POST /api/Admin/menuitems
   (34) POST /api/Restaurants/{id}/menu
   (35) PUT /api/Admin/menuitems/{id}
   (36) DELETE /api/Admin/menuitems/{id}
   (37) POST /api/Admin/menuitems/{id}/image
   (38) POST /api/Admin/users/promote?email=...
   (24) GET /api/Orders
   ============================================================================ */

async function syncAdminDropdownData() {
    if (!isUserAdmin()) return;
    await Promise.allSettled([
        fetchAllRestaurantsForAdminDropdowns(),
        fetchAdminCategories(),
        fetchAdminAllOrders()
    ]);
}

async function fetchAllRestaurantsForAdminDropdowns() {
    const data = await apiFetch("/api/Restaurants?page=1&pageSize=200", { silentError: true });
    const list = Array.isArray(data) ? data : data?.items || data?.restaurants || [];
    state.allRestaurantsCache = list;

    const restSelect1 = document.getElementById("adminRestaurantSelect");
    const restSelect2 = document.getElementById("adminMenuRestaurantSelect");
    const restSelect3 = document.getElementById("adminNewDishRestaurantSelect");

    const prevVal1 = restSelect1.value;
    const prevVal2 = restSelect2.value;
    const prevVal3 = restSelect3.value;

    const options = list
        .map(
            (r) =>
                `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)} — ${restaurantIsOpen(r) ? "Open" : "Temporarily Closed"}</option>`
        )
        .join("");

    restSelect1.innerHTML = `<option value="">-- Choose a restaurant to manage --</option>${options}`;
    restSelect2.innerHTML = `<option value="">-- Select Restaurant --</option>${options}`;
    restSelect3.innerHTML = `<option value="">-- Select Target Restaurant --</option>${options}`;

    if (prevVal1 && list.some((r) => String(r.id) === String(prevVal1))) {
        restSelect1.value = prevVal1;
        handleAdminRestaurantDropdownChange();
    } else {
        resetAdminRestaurantEditor();
    }

    if (prevVal2 && list.some((r) => String(r.id) === String(prevVal2))) {
        restSelect2.value = prevVal2;
    }
    if (prevVal3 && list.some((r) => String(r.id) === String(prevVal3))) {
        restSelect3.value = prevVal3;
    }
}

// Auto-Fill Restaurant Editor when Admin picks from dropdown
function handleAdminRestaurantDropdownChange() {
    const select = document.getElementById("adminRestaurantSelect");
    const selectedId = select.value;

    if (!selectedId) {
        resetAdminRestaurantEditor();
        return;
    }

    const rest = state.allRestaurantsCache.find((r) => String(r.id) === String(selectedId));
    if (!rest) {
        resetAdminRestaurantEditor();
        return;
    }

    document.getElementById("adminEditRestId").value = rest.id;
    document.getElementById("adminEditRestImagePath").value = rest.imagePath || "";

    const nameInput = document.getElementById("adminEditRestName");
    const addrInput = document.getElementById("adminEditRestAddress");
    nameInput.value = rest.name || "";
    addrInput.value = rest.address || "";
    nameInput.disabled = false;
    addrInput.disabled = false;

    document.getElementById("adminSaveRestaurantBtn").disabled = false;
    document.getElementById("adminDeleteRestaurantBtn").disabled = false;
    document.getElementById("adminRestImageInput").disabled = false;
    document.getElementById("adminUploadRestImageBtn").disabled = false;

    const previewStrip = document.getElementById("adminRestCurrentImagePreview");
    previewStrip.innerHTML = `
    ${renderMediaWithFallback(rest.imagePath, "restaurant", rest.name)}
    <div>
      <strong>${escapeHtml(rest.name)}</strong>
      <div class="muted-helper">Image path: ${escapeHtml(rest.imagePath || "None (using SVG illustration)")}</div>
    </div>
  `;
}

function resetAdminRestaurantEditor() {
    document.getElementById("adminEditRestId").value = "";
    document.getElementById("adminEditRestImagePath").value = "";
    const nameInput = document.getElementById("adminEditRestName");
    const addrInput = document.getElementById("adminEditRestAddress");
    nameInput.value = "";
    addrInput.value = "";
    nameInput.disabled = true;
    addrInput.disabled = true;
    const activeInput = document.getElementById("adminEditRestIsActive");
    activeInput.checked = true;
    activeInput.disabled = true;

    document.getElementById("adminSaveRestaurantBtn").disabled = true;
    document.getElementById("adminDeleteRestaurantBtn").disabled = true;
    document.getElementById("adminRestImageInput").disabled = true;
    document.getElementById("adminUploadRestImageBtn").disabled = true;
    document.getElementById("adminRestCurrentImagePreview").innerHTML = `<span class="muted-helper">No restaurant selected.</span>`;
}

// Endpoint 28: PUT /api/Admin/restaurants/{id}
async function handleAdminUpdateRestaurantSubmit(e) {
    e.preventDefault();
    const id = Number(document.getElementById("adminEditRestId").value);
    if (!id) return;

    const name = document.getElementById("adminEditRestName").value.trim();
    const address = document.getElementById("adminEditRestAddress").value.trim();
    const imagePath = document.getElementById("adminEditRestImagePath").value.trim() || null;

    await apiFetch(`/api/Admin/restaurants/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { id, name, address, imagePath },
        showSuccessToast: true
    });

    showToast(`Updated "${name}"!`, "success");
    await Promise.all([fetchAllRestaurantsForAdminDropdowns(), fetchRestaurantsFeed()]);
}

// Endpoint 29: DELETE /api/Admin/restaurants/{id}
async function handleAdminDeleteRestaurant() {
    const id = Number(document.getElementById("adminEditRestId").value);
    const name = document.getElementById("adminEditRestName").value;
    if (!id) return;

    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) {
        return;
    }

    await apiFetch(`/api/Admin/restaurants/${encodeURIComponent(id)}`, {
        method: "DELETE",
        showSuccessToast: true
    });

    showToast(`Deleted restaurant "${name}".`, "success");
    document.getElementById("adminRestaurantSelect").value = "";
    resetAdminRestaurantEditor();
    await Promise.all([fetchAllRestaurantsForAdminDropdowns(), fetchRestaurantsFeed()]);
}

// Endpoint 30: POST /api/Admin/restaurants/{id}/image
async function handleAdminUploadRestaurantImage(e) {
    e.preventDefault();
    const id = Number(document.getElementById("adminEditRestId").value);
    const fileInput = document.getElementById("adminRestImageInput");
    if (!id || !fileInput.files || !fileInput.files[0]) {
        showToast("Select a restaurant and an image file first.", "warn");
        return;
    }

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    const res = await apiFetch(`/api/Admin/restaurants/${encodeURIComponent(id)}/image`, {
        method: "POST",
        body: formData,
        isFormData: true,
        showSuccessToast: true
    });

    if (res && (res.imagePath || typeof res === "string")) {
        document.getElementById("adminEditRestImagePath").value =
            typeof res === "string" ? res : res.imagePath;
    }

    fileInput.value = "";
    showToast("Restaurant cover image uploaded!", "success");
    await Promise.all([fetchAllRestaurantsForAdminDropdowns(), fetchRestaurantsFeed()]);
}

// Endpoint 26: POST /api/Admin/restaurants
async function handleAdminCreateRestaurantSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("adminNewRestName").value.trim();
    const address = document.getElementById("adminNewRestAddress").value.trim();
    const imagePath = document.getElementById("adminNewRestImagePath").value.trim() || null;
    const isActive = document.getElementById("adminNewRestIsActive").checked;

    await apiFetch("/api/Admin/restaurants", {
        method: "POST",
        body: { name, address, imagePath, isActive },
        showSuccessToast: true
    });

    document.getElementById("adminCreateRestaurantForm").reset();
    showToast(`Restaurant "${name}" added.`, "success");
    await Promise.all([fetchAllRestaurantsForAdminDropdowns(), fetchRestaurantsFeed()]);
}

// Endpoint 27: POST /api/Restaurants (Secondary Creation Route)
async function handleQuickCreateRestaurantSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("quickRestNameInput").value.trim();
    const address = document.getElementById("quickRestAddressInput").value.trim();

    await apiFetch("/api/Restaurants", {
        method: "POST",
        body: { name, address, isActive: true },
        showSuccessToast: true
    });

    document.getElementById("quickCreateRestaurantForm").reset();
    closeModal("quickCreateRestaurantModal");
    showToast(`Restaurant "${name}" added.`, "success");
    await Promise.all([fetchAllRestaurantsForAdminDropdowns(), fetchRestaurantsFeed()]);
}

/* ----------------------------------------------------------------------------
   ADMIN TAB 2: TWO-STEP SMART MENU ITEM MANAGEMENT
   ---------------------------------------------------------------------------- */

// Step 1: When Admin selects a Restaurant in Tab 2, load its dishes via GET /api/Menu/restaurant/{restaurantId}
async function handleAdminMenuRestaurantSelectChange() {
    const restId = document.getElementById("adminMenuRestaurantSelect").value;
    const dishSelect = document.getElementById("adminMenuDishSelect");

    resetAdminDishEditor();

    if (!restId) {
        dishSelect.innerHTML = `<option value="">-- Choose restaurant first --</option>`;
        dishSelect.disabled = true;
        return;
    }

    dishSelect.disabled = false;
    dishSelect.innerHTML = `<option value="">Loading dishes...</option>`;

    const data = await apiFetch(`/api/Menu/restaurant/${encodeURIComponent(restId)}`);
    const dishes = Array.isArray(data) ? data : data?.items || [];
    state.adminSelectedRestaurantMenu = dishes;

    if (!dishes.length) {
        dishSelect.innerHTML = `<option value="">-- No dishes in this kitchen yet --</option>`;
        return;
    }

    dishSelect.innerHTML =
        `<option value="">-- Select a dish to edit (${dishes.length}) --</option>` +
        dishes
            .map(
                (d) =>
                    `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)} (${formatCurrency(d.price)})</option>`
            )
            .join("");
}

// Step 2: When Admin selects a Dish, auto-fill all fields
function handleAdminMenuDishSelectChange() {
    const dishId = document.getElementById("adminMenuDishSelect").value;
    const restId = document.getElementById("adminMenuRestaurantSelect").value;

    if (!dishId) {
        resetAdminDishEditor();
        return;
    }

    const dish = state.adminSelectedRestaurantMenu.find((d) => String(d.id) === String(dishId));
    if (!dish) {
        resetAdminDishEditor();
        return;
    }

    document.getElementById("adminEditDishId").value = dish.id;
    document.getElementById("adminEditDishRestaurantId").value = dish.restaurantId ?? restId;
    document.getElementById("adminEditDishImagePath").value = dish.imagePath || "";

    const nameInput = document.getElementById("adminEditDishName");
    const priceInput = document.getElementById("adminEditDishPrice");
    const catSelect = document.getElementById("adminEditDishCategorySelect");
    const availCheck = document.getElementById("adminEditDishAvailable");

    nameInput.value = dish.name || "";
    priceInput.value = Number(dish.price || 0).toFixed(2);
    availCheck.checked = dish.isAvailable !== false;

    // Match category by categoryId or categoryName
    if (dish.categoryId) {
        catSelect.value = String(dish.categoryId);
    } else if (dish.categoryName) {
        const matchedCat = state.adminCategories.find(
            (c) => c.name.toLowerCase() === dish.categoryName.toLowerCase()
        );
        if (matchedCat) catSelect.value = String(matchedCat.id);
    }

    nameInput.disabled = false;
    priceInput.disabled = false;
    catSelect.disabled = false;
    availCheck.disabled = false;

    document.getElementById("adminUpdateDishBtn").disabled = false;
    document.getElementById("adminDeleteDishBtn").disabled = false;
    document.getElementById("adminDishImageInput").disabled = false;
    document.getElementById("adminUploadDishImageBtn").disabled = false;

    document.getElementById("adminDishCurrentImagePreview").innerHTML = `
    ${renderMediaWithFallback(dish.imagePath, "dish", dish.name)}
    <div>
      <strong>${escapeHtml(dish.name)}</strong>
      <div class="muted-helper">Photo path: ${escapeHtml(dish.imagePath || "None")}</div>
    </div>
  `;
}

function resetAdminDishEditor() {
    document.getElementById("adminEditDishId").value = "";
    document.getElementById("adminEditDishRestaurantId").value = "";
    document.getElementById("adminEditDishImagePath").value = "";

    const nameInput = document.getElementById("adminEditDishName");
    const priceInput = document.getElementById("adminEditDishPrice");
    const catSelect = document.getElementById("adminEditDishCategorySelect");
    const availCheck = document.getElementById("adminEditDishAvailable");

    nameInput.value = "";
    priceInput.value = "";
    availCheck.checked = true;

    nameInput.disabled = true;
    priceInput.disabled = true;
    catSelect.disabled = true;
    availCheck.disabled = true;

    document.getElementById("adminUpdateDishBtn").disabled = true;
    document.getElementById("adminDeleteDishBtn").disabled = true;
    document.getElementById("adminDishImageInput").disabled = true;
    document.getElementById("adminUploadDishImageBtn").disabled = true;
    document.getElementById("adminDishCurrentImagePreview").innerHTML =
        `<span class="muted-helper">Select a dish above to inspect its current photo and metadata.</span>`;
}

// Endpoint 35: PUT /api/Admin/menuitems/{id}
async function handleAdminUpdateDishSubmit(e) {
    e.preventDefault();
    const id = Number(document.getElementById("adminEditDishId").value);
    const restaurantId = Number(document.getElementById("adminEditDishRestaurantId").value);
    const name = document.getElementById("adminEditDishName").value.trim();
    const price = parseFloat(document.getElementById("adminEditDishPrice").value);
    const categoryId = Number(document.getElementById("adminEditDishCategorySelect").value);
    const isAvailable = document.getElementById("adminEditDishAvailable").checked;
    const imagePath = document.getElementById("adminEditDishImagePath").value.trim() || null;

    await apiFetch(`/api/Admin/menuitems/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: {
            id,
            name,
            price,
            isAvailable,
            imagePath,
            categoryId,
            restaurantId
        },
        showSuccessToast: true
    });

    showToast(`Dish "${name}" updated!`, "success");
    await handleAdminMenuRestaurantSelectChange();
    document.getElementById("adminMenuDishSelect").value = String(id);
    handleAdminMenuDishSelectChange();
}

// Endpoint 36: DELETE /api/Admin/menuitems/{id}
async function handleAdminDeleteDish() {
    const id = Number(document.getElementById("adminEditDishId").value);
    const name = document.getElementById("adminEditDishName").value;
    if (!id) return;

    if (!window.confirm(`Delete dish "${name}" permanently?`)) return;

    await apiFetch(`/api/Admin/menuitems/${encodeURIComponent(id)}`, {
        method: "DELETE",
        showSuccessToast: true
    });

    showToast(`Dish "${name}" deleted.`, "success");
    await handleAdminMenuRestaurantSelectChange();
}

// Endpoint 37: POST /api/Admin/menuitems/{id}/image
async function handleAdminUploadDishImage(e) {
    e.preventDefault();
    const id = Number(document.getElementById("adminEditDishId").value);
    const fileInput = document.getElementById("adminDishImageInput");
    if (!id || !fileInput.files || !fileInput.files[0]) {
        showToast("Select a dish and a photo file first.", "warn");
        return;
    }

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    const res = await apiFetch(`/api/Admin/menuitems/${encodeURIComponent(id)}/image`, {
        method: "POST",
        body: formData,
        isFormData: true,
        showSuccessToast: true
    });

    if (res && (res.imagePath || typeof res === "string")) {
        document.getElementById("adminEditDishImagePath").value =
            typeof res === "string" ? res : res.imagePath;
    }

    fileInput.value = "";
    showToast("Dish photo uploaded!", "success");
    await handleAdminMenuRestaurantSelectChange();
    document.getElementById("adminMenuDishSelect").value = String(id);
    handleAdminMenuDishSelectChange();
}

// Endpoint 33: POST /api/Admin/menuitems
async function handleAdminCreateDishSubmit(e) {
    e.preventDefault();
    const restaurantId = Number(document.getElementById("adminNewDishRestaurantSelect").value);
    const categoryId = Number(document.getElementById("adminNewDishCategorySelect").value);
    const name = document.getElementById("adminNewDishName").value.trim();
    const price = parseFloat(document.getElementById("adminNewDishPrice").value);
    const isAvailable = document.getElementById("adminNewDishAvailable").checked;

    await apiFetch("/api/Admin/menuitems", {
        method: "POST",
        body: {
            name,
            price,
            isAvailable,
            restaurantId,
            categoryId
        },
        showSuccessToast: true
    });

    document.getElementById("adminCreateMenuItemForm").reset();
    document.getElementById("adminNewDishAvailable").checked = true;
    showToast(`Added "${name}" to catalog!`, "success");

    if (String(document.getElementById("adminMenuRestaurantSelect").value) === String(restaurantId)) {
        await handleAdminMenuRestaurantSelectChange();
    }
}

// Endpoint 34: POST /api/Restaurants/{id}/menu (Storefront Admin Quick-Add Dish Modal)
async function handleStorefrontAddDishSubmit(e) {
    e.preventDefault();
    if (!state.activeStorefrontId) return;

    const restaurantId = Number(state.activeStorefrontId);
    const name = document.getElementById("sfDishNameInput").value.trim();
    const price = parseFloat(document.getElementById("sfDishPriceInput").value);
    const categoryId = Number(document.getElementById("sfDishCategorySelect").value);
    const isAvailable = document.getElementById("sfDishAvailableInput").checked;

    await apiFetch(`/api/Restaurants/${encodeURIComponent(restaurantId)}/menu`, {
        method: "POST",
        body: {
            name,
            price,
            isAvailable,
            categoryId,
            restaurantId
        },
        showSuccessToast: true
    });

    document.getElementById("storefrontAddDishForm").reset();
    document.getElementById("sfDishAvailableInput").checked = true;
    closeModal("storefrontAddDishModal");
    showToast(`Published "${name}" to this kitchen!`, "success");
    await refreshActiveStorefrontMenu();
}

/* ----------------------------------------------------------------------------
   ADMIN TAB 3: CATEGORIES & USER ROLE PROMOTION
   ---------------------------------------------------------------------------- */

// Endpoint 31: GET /api/Admin/categories
async function fetchAdminCategories() {
    const data = await apiFetch("/api/Admin/categories", { silentError: true });
    const list = Array.isArray(data) ? data : data?.items || state.categories;
    state.adminCategories = list;

    // Populate Admin Category Dropdowns
    const editCatSelect = document.getElementById("adminEditDishCategorySelect");
    const newCatSelect = document.getElementById("adminNewDishCategorySelect");
    const prevEditVal = editCatSelect.value;
    const prevNewVal = newCatSelect.value;

    const optionsHtml = list
        .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`)
        .join("");

    editCatSelect.innerHTML = `<option value="">-- Category --</option>${optionsHtml}`;
    newCatSelect.innerHTML = `<option value="">-- Select Target Category --</option>${optionsHtml}`;

    if (prevEditVal) editCatSelect.value = prevEditVal;
    if (prevNewVal) newCatSelect.value = prevNewVal;

    // Render Category Chips List in Tab 3
    const listContainer = document.getElementById("adminCategoriesList");
    if (listContainer) {
        listContainer.innerHTML = list.length
            ? list
                .map(
                    (c) =>
                        `<span class="admin-cat-chip">#${escapeHtml(c.id)} &bull; ${escapeHtml(c.name)}</span>`
                )
                .join("")
            : `<p class="muted-helper">No categories created yet.</p>`;
    }

    populateStorefrontCategoryDropdown();
}

function populateStorefrontCategoryDropdown() {
    const sfSelect = document.getElementById("sfDishCategorySelect");
    if (!sfSelect) return;
    const cats = state.adminCategories.length ? state.adminCategories : state.categories;
    sfSelect.innerHTML = cats
        .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`)
        .join("");
}

// Endpoint 32: POST /api/Admin/categories
async function handleAdminCreateCategorySubmit(e) {
    e.preventDefault();
    const input = document.getElementById("adminCategoryNameInput");
    const name = input.value.trim();
    if (!name) return;

    await apiFetch("/api/Admin/categories", {
        method: "POST",
        body: { name },
        showSuccessToast: true
    });

    input.value = "";
    showToast(`Category "${name}" added!`, "success");
    await Promise.all([fetchAdminCategories(), fetchPublicCategories()]);
}

// Endpoint 38: POST /api/Admin/users/promote?email=${encodeURIComponent(email)}
async function handleAdminPromoteUserSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById("adminPromoteEmailInput");
    const email = emailInput.value.trim();
    if (!email) return;

    // CRITICAL: email MUST be passed as a URL query parameter, NOT in JSON body
    await apiFetch(`/api/Admin/users/promote?email=${encodeURIComponent(email)}`, {
        method: "POST",
        showSuccessToast: true
    });

    emailInput.value = "";
    showToast(`User "${email}" promoted to Admin!`, "success");
}

/* ----------------------------------------------------------------------------
   ADMIN TAB 4: LIVE ORDER OPERATIONS BOARD
   Endpoint 24: GET /api/Orders & Endpoint 25: PATCH /api/Orders/{id}/status
   ---------------------------------------------------------------------------- */
async function fetchAdminAllOrders() {
    const board = document.getElementById("adminOrdersBoard");
    if (!board) return;
    board.innerHTML = `<p class="muted-helper">Loading platform orders via GET /api/Orders...</p>`;

    const data = await apiFetch("/api/Orders", { silentError: true });
    const orders = Array.isArray(data) ? data : data?.items || [];
    state.adminOrders = orders;
    renderAdminOrdersBoard();
}

function renderAdminOrdersBoard() {
    const board = document.getElementById("adminOrdersBoard");
    const filter = state.adminOrderFilter;

    const filtered = state.adminOrders.filter((o) => {
        if (filter === "ALL") return true;
        const st = normalizeOrderStatus(o.status);
        return String(st.code) === String(filter);
    });

    if (!filtered.length) {
        board.innerHTML = `
      <div class="admin-card" style="grid-column: 1 / -1; text-align:center;">
        <h3>No orders in this status filter</h3>
        <p class="muted-helper">Switch status pills above or refresh the live board.</p>
      </div>
    `;
        return;
    }

    board.innerHTML = filtered
        .map((order) => {
            const st = normalizeOrderStatus(order.status);
            const nextState = st.next !== null ? ORDER_STATES[st.next] : null;
            const canCancel = st.canCancel; // Strictly true ONLY for Created (0) and Confirmed (1)

            return `
        <article class="order-card">
          <div class="order-card-header">
            <div>
              <h3 class="order-id-title">Order #${escapeHtml(order.id)}</h3>
              <span class="order-timestamp">${escapeHtml(formatDateTime(order.createdAt || order.orderDate))}</span>
            </div>
            <span class="status-badge status-${st.code}">${st.code} &bull; ${escapeHtml(st.label)}</span>
          </div>

          <div style="font-size:0.86rem;">
            ${order.userEmail || order.userName ? `<p><strong>Customer:</strong> ${escapeHtml(order.userEmail || order.userName)}</p>` : ""}
            ${order.restaurantName ? `<p><strong>Kitchen:</strong> ${escapeHtml(order.restaurantName)}</p>` : ""}
            ${order.deliveryAddress || order.address ? `<p><strong>Address:</strong> ${escapeHtml(order.deliveryAddress || order.address)}</p>` : ""}
            <p style="margin-top:0.35rem;"><strong>Total:</strong> ${formatCurrency(order.totalPrice ?? order.totalAmount)}</p>
          </div>

          <div class="order-card-footer">
            <button
              type="button"
              class="btn-secondary btn-sm"
              data-view-order-id="${escapeHtml(order.id)}"
            >
              Details
            </button>

            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              ${nextState
                    ? `<button
                       type="button"
                       class="btn-primary btn-sm"
                       data-advance-order-id="${escapeHtml(order.id)}"
                       data-next-status="${nextState.code}"
                     >
                       Advance to ${escapeHtml(nextState.label)} (${nextState.code})
                     </button>`
                    : `<span class="muted-helper" style="font-weight:700;">Final State</span>`
                }
              ${canCancel
                    ? `<button
                       type="button"
                       class="btn-danger btn-sm"
                       data-cancel-order-id="${escapeHtml(order.id)}"
                     >
                       Cancel (5)
                     </button>`
                    : ""
                }
            </div>
          </div>
        </article>
      `;
        })
        .join("");
}

/* ============================================================================
   12. VIEW NAVIGATION, DRAWERS & MODAL HELPERS
   ============================================================================ */
function switchMainView(viewId) {
    const views = ["homeDiscoveryView", "storefrontView", "myOrdersView", "adminDashboardView"];
    views.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("hidden", id !== viewId);
    });

    document.getElementById("navHomeBtn").classList.toggle(
        "active",
        viewId === "homeDiscoveryView" || viewId === "storefrontView"
    );
    document.getElementById("navMyOrdersBtn").classList.toggle("active", viewId === "myOrdersView");
    document.getElementById("navAdminBtn").classList.toggle("active", viewId === "adminDashboardView");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCartDrawer() {
    document.getElementById("cartDrawerBackdrop").classList.remove("hidden");
    document.getElementById("cartDrawer").classList.remove("hidden");
    if (isUserAuthenticated()) {
        fetchCart();
    }
}

function closeCartDrawer() {
    document.getElementById("cartDrawerBackdrop").classList.add("hidden");
    document.getElementById("cartDrawer").classList.add("hidden");
}

function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove("hidden");
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add("hidden");
}

function switchAuthTab(tab) {
    const isLogin = tab === "login";
    document.getElementById("tabLoginBtn").classList.toggle("active", isLogin);
    document.getElementById("tabRegisterBtn").classList.toggle("active", !isLogin);
    document.getElementById("loginForm").classList.toggle("hidden", !isLogin);
    document.getElementById("registerForm").classList.toggle("hidden", isLogin);
    document.getElementById("authModalTitle").textContent = isLogin
        ? "Welcome Back to FoodExpress"
        : "Create Your FoodExpress Account";
}

/* ============================================================================
   13. EVENT LISTENERS & INITIALIZATION
   ============================================================================ */
function bindAllEvents() {
    // Topbar Navigation
    document.getElementById("brandHomeLink").addEventListener("click", (e) => {
        e.preventDefault();
        switchMainView("homeDiscoveryView");
    });

    document.getElementById("navHomeBtn").addEventListener("click", () => {
        switchMainView("homeDiscoveryView");
    });

    document.getElementById("navMyOrdersBtn").addEventListener("click", () => {
        openMyOrdersView();
    });

    document.getElementById("navAdminBtn").addEventListener("click", async () => {
        if (!isUserAdmin()) {
            showToast("Admin role required.", "error");
            return;
        }
        switchMainView("adminDashboardView");
        await syncAdminDropdownData();
    });

    // Address Selectors Synchronization
    document.getElementById("topAddressSelect").addEventListener("change", (e) => {
        state.selectedAddressId = e.target.value;
        document.getElementById("checkoutAddressSelect").value = e.target.value;
    });

    document.getElementById("checkoutAddressSelect").addEventListener("change", (e) => {
        state.selectedAddressId = e.target.value;
        document.getElementById("topAddressSelect").value = e.target.value;
    });

    document.getElementById("topManageAddressBtn").addEventListener("click", async () => {
        openModal("profileModal");
        await Promise.all([fetchUserProfile(), fetchMyAddresses()]);
    });

    // Global Dish Search
    document.getElementById("globalDishSearchForm").addEventListener("submit", handleGlobalDishSearchSubmit);
    document.getElementById("closeDishSearchBtn").addEventListener("click", () => {
        document.getElementById("dishSearchResultsSection").classList.add("hidden");
        document.getElementById("globalDishSearchInput").value = "";
    });

    // Quick Restaurant Finder Popover
    document.getElementById("toggleQuickFinderBtn").addEventListener("click", () => {
        const pop = document.getElementById("quickFinderPopover");
        pop.classList.toggle("hidden");
        if (!pop.classList.contains("hidden")) {
            document.getElementById("quickRestaurantSearchInput").focus();
        }
    });

    document.getElementById("quickRestaurantSearchBtn").addEventListener("click", runQuickRestaurantSearch);
    document.getElementById("quickRestaurantSearchInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            runQuickRestaurantSearch();
        }
    });

    // Category Ribbon Filtering + Category Dish Spotlight
    document.getElementById("categoryRibbon").addEventListener("click", async (e) => {
        const pill = e.target.closest(".category-pill");
        if (!pill) return;

        const catId = pill.getAttribute("data-category-id") || "";
        const catName = pill.getAttribute("data-category-name") || "Selected Category";

        state.filters.categoryId = catId;
        state.filters.page = 1;
        renderCategoryRibbon();

        await Promise.all([
            fetchRestaurantsFeed(),
            catId ? fetchDishesByCategory(catId, catName) : Promise.resolve()
        ]);

        if (!catId) {
            document.getElementById("categoryDishesSection").classList.add("hidden");
        }
    });

    document.getElementById("clearCategoryFilterBtn").addEventListener("click", async () => {
        state.filters.categoryId = "";
        state.filters.page = 1;
        document.getElementById("categoryDishesSection").classList.add("hidden");
        renderCategoryRibbon();
        await fetchRestaurantsFeed();
    });

    document.getElementById("hideCategoryDishesBtn").addEventListener("click", () => {
        document.getElementById("categoryDishesSection").classList.add("hidden");
    });

    // Home Feed Search, PageSize & Pagination
    let feedSearchDebounce = null;
    document.getElementById("homeRestaurantSearchInput").addEventListener("input", (e) => {
        clearTimeout(feedSearchDebounce);
        feedSearchDebounce = setTimeout(() => {
            state.filters.search = e.target.value;
            state.filters.page = 1;
            fetchRestaurantsFeed();
        }, 320);
    });

    document.getElementById("restaurantPageSizeSelect").addEventListener("change", (e) => {
        state.filters.pageSize = Number(e.target.value) || 9;
        state.filters.page = 1;
        fetchRestaurantsFeed();
    });

    document.getElementById("refreshRestaurantsFeedBtn").addEventListener("click", fetchRestaurantsFeed);

    document.getElementById("prevPageBtn").addEventListener("click", () => {
        if (state.filters.page > 1) {
            state.filters.page -= 1;
            fetchRestaurantsFeed();
        }
    });

    document.getElementById("nextPageBtn").addEventListener("click", () => {
        state.filters.page += 1;
        fetchRestaurantsFeed();
    });

    // Storefront Controls
    document.getElementById("backToFeedBtn").addEventListener("click", () => {
        switchMainView("homeDiscoveryView");
    });

    document.getElementById("refreshStorefrontMenuBtn").addEventListener("click", refreshActiveStorefrontMenu);
    document.getElementById("storefrontFullMenuTab").addEventListener("click", refreshActiveStorefrontMenu);
    document.getElementById("storefrontDishSearchForm").addEventListener("submit", handleStorefrontDishSearchSubmit);

    document.getElementById("clearStorefrontSearchBtn").addEventListener("click", () => {
        document.getElementById("storefrontDishSearchInput").value = "";
        document.getElementById("clearStorefrontSearchBtn").classList.add("hidden");
        renderStorefrontMenu(state.activeStorefrontMenu);
    });

    document.getElementById("openStorefrontAddDishModalBtn").addEventListener("click", () => {
        populateStorefrontCategoryDropdown();
        openModal("storefrontAddDishModal");
    });

    document.getElementById("closeStorefrontAddDishModalBtn").addEventListener("click", () => {
        closeModal("storefrontAddDishModal");
    });

    document.getElementById("storefrontAddDishForm").addEventListener("submit", handleStorefrontAddDishSubmit);

    // Preview Dishes Drawer Controls
    document.getElementById("closePreviewDishesDrawerBtn").addEventListener("click", closePreviewDishesDrawer);
    document.getElementById("previewDishesBackdrop").addEventListener("click", closePreviewDishesDrawer);
    document.getElementById("previewOpenFullStorefrontBtn").addEventListener("click", () => {
        if (state.previewRestaurantId) {
            openRestaurantStorefront(state.previewRestaurantId);
        }
    });

    // Dish Detail Modal Controls
    document.getElementById("closeDishModalBtn").addEventListener("click", () => closeModal("dishDetailModal"));
    document.getElementById("dishModalQtyMinus").addEventListener("click", () => {
        const input = document.getElementById("dishModalQtyInput");
        input.value = String(Math.max(1, (Number(input.value) || 1) - 1));
    });
    document.getElementById("dishModalQtyPlus").addEventListener("click", () => {
        const input = document.getElementById("dishModalQtyInput");
        input.value = String((Number(input.value) || 1) + 1);
    });
    document.getElementById("dishModalAddToCartBtn").addEventListener("click", async () => {
        if (!state.activeModalDish) return;
        const qty = Number(document.getElementById("dishModalQtyInput").value) || 1;
        const d = state.activeModalDish;
        closeModal("dishDetailModal");
        await addItemToCart(d.id, qty, d.restaurantId ?? state.activeStorefrontId, d.name);
    });

    // Cart Drawer & Inline Checkout Address Controls
    document.getElementById("openCartDrawerBtn").addEventListener("click", openCartDrawer);
    document.getElementById("closeCartDrawerBtn").addEventListener("click", closeCartDrawer);
    document.getElementById("cartDrawerBackdrop").addEventListener("click", closeCartDrawer);

    document.getElementById("toggleCartQuickAddressBtn").addEventListener("click", () => {
        document.getElementById("cartAddAddressForm").classList.toggle("hidden");
    });

    document.getElementById("cartAddAddressForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const street = document.getElementById("cartStreetInput").value.trim();
        const city = document.getElementById("cartCityInput").value.trim();
        await createNewAddress(street, city);
        document.getElementById("cartAddAddressForm").reset();
        document.getElementById("cartAddAddressForm").classList.add("hidden");
    });

    document.getElementById("placeOrderBtn").addEventListener("click", handlePlaceOrder);

    // Cart Conflict Modal Controls
    document.getElementById("closeCartConflictModalBtn").addEventListener("click", () => closeModal("cartConflictModal"));
    document.getElementById("cancelConflictBtn").addEventListener("click", () => {
        state.pendingConflictItem = null;
        closeModal("cartConflictModal");
    });
    document.getElementById("confirmClearAndAddBtn").addEventListener("click", resolveCartConflictAndAdd);

    // Auth Modal Controls
    document.getElementById("authTriggerBtn").addEventListener("click", () => {
        switchAuthTab("login");
        openModal("authModal");
    });
    document.getElementById("closeAuthModalBtn").addEventListener("click", () => closeModal("authModal"));
    document.getElementById("tabLoginBtn").addEventListener("click", () => switchAuthTab("login"));
    document.getElementById("tabRegisterBtn").addEventListener("click", () => switchAuthTab("register"));
    document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
    document.getElementById("registerForm").addEventListener("submit", handleRegisterSubmit);

    // Profile & Addresses Modal Controls
    document.getElementById("userProfileTriggerBtn").addEventListener("click", async () => {
        openModal("profileModal");
        await Promise.all([fetchUserProfile(), fetchMyAddresses()]);
    });
    document.getElementById("closeProfileModalBtn").addEventListener("click", () => closeModal("profileModal"));

    document.getElementById("profileImageInput").addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        const wrap = document.getElementById("profileImageLivePreviewWrap");
        const img = document.getElementById("profileImageLivePreview");
        if (file) {
            img.src = URL.createObjectURL(file);
            wrap.classList.remove("hidden");
        } else {
            wrap.classList.add("hidden");
        }
    });

    document.getElementById("profileImageForm").addEventListener("submit", handleProfileImageUpload);
    document.getElementById("profileAddAddressForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const street = document.getElementById("profileStreetInput").value.trim();
        const city = document.getElementById("profileCityInput").value.trim();
        await createNewAddress(street, city);
        document.getElementById("profileAddAddressForm").reset();
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        closeModal("profileModal");
        clearSession();
    });
    document.getElementById("headerSignOutBtn").addEventListener("click", () => {
        clearSession();
    });

    // My Orders & Order Detail Modal Controls
    document.getElementById("refreshMyOrdersBtn").addEventListener("click", fetchMyOrders);
    document.getElementById("closeOrderDetailModalBtn").addEventListener("click", () =>
        closeModal("orderDetailModal")
    );

    // Admin Control Center Tabs & Forms
    document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-admin-tab");
            document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
            document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
                panel.classList.toggle("hidden", panel.id !== targetTab);
            });
        });
    });

    document.getElementById("adminSyncAllDataBtn").addEventListener("click", async () => {
        await syncAdminDropdownData();
        showToast("All Admin dropdowns & live orders synced!", "success");
    });

    // Admin Tab 1: Restaurants
    document.getElementById("adminRestaurantSelect").addEventListener("change", handleAdminRestaurantDropdownChange);
    document.getElementById("adminEditRestaurantForm").addEventListener("submit", handleAdminUpdateRestaurantSubmit);
    document.getElementById("adminDeleteRestaurantBtn").addEventListener("click", handleAdminDeleteRestaurant);
    document.getElementById("adminRestImageForm").addEventListener("submit", handleAdminUploadRestaurantImage);
    document.getElementById("adminCreateRestaurantForm").addEventListener("submit", handleAdminCreateRestaurantSubmit);

    document.getElementById("openQuickCreateRestaurantModalBtn").addEventListener("click", () =>
        openModal("quickCreateRestaurantModal")
    );
    document.getElementById("openQuickCreateRestFromTabBtn").addEventListener("click", () =>
        openModal("quickCreateRestaurantModal")
    );
    document.getElementById("closeQuickCreateRestaurantModalBtn").addEventListener("click", () =>
        closeModal("quickCreateRestaurantModal")
    );
    document.getElementById("quickCreateRestaurantForm").addEventListener("submit", handleQuickCreateRestaurantSubmit);

    // Admin Tab 2: Menu Items
    document.getElementById("adminMenuRestaurantSelect").addEventListener(
        "change",
        handleAdminMenuRestaurantSelectChange
    );
    document.getElementById("adminMenuDishSelect").addEventListener("change", handleAdminMenuDishSelectChange);
    document.getElementById("adminEditMenuItemForm").addEventListener("submit", handleAdminUpdateDishSubmit);
    document.getElementById("adminDeleteDishBtn").addEventListener("click", handleAdminDeleteDish);
    document.getElementById("adminDishImageForm").addEventListener("submit", handleAdminUploadDishImage);
    document.getElementById("adminCreateMenuItemForm").addEventListener("submit", handleAdminCreateDishSubmit);

    // Admin Tab 3: Categories & User Promotion
    document.getElementById("adminCreateCategoryForm").addEventListener("submit", handleAdminCreateCategorySubmit);
    document.getElementById("adminPromoteUserForm").addEventListener("submit", handleAdminPromoteUserSubmit);

    // Admin Tab 4: Live Orders Filter & Refresh
    document.getElementById("adminOrderStatusFilterBar").addEventListener("click", (e) => {
        const pill = e.target.closest(".status-filter-pill");
        if (!pill) return;
        state.adminOrderFilter = pill.getAttribute("data-status-filter") || "ALL";
        document
            .querySelectorAll("#adminOrderStatusFilterBar .status-filter-pill")
            .forEach((p) => p.classList.toggle("active", p === pill));
        renderAdminOrdersBoard();
    });

    document.getElementById("adminRefreshOrdersBtn").addEventListener("click", fetchAdminAllOrders);

    // Global Delegated Click Listener for Dynamic Cards, Drawers, Cart Steppers & Order Actions
    document.body.addEventListener("click", async (e) => {
        // 1. Open Restaurant Storefront
        const openStorefrontEl = e.target.closest("[data-open-storefront-id]");
        if (openStorefrontEl) {
            const restId = openStorefrontEl.getAttribute("data-open-storefront-id");
            await openRestaurantStorefront(restId);
            return;
        }

        // 2. Preview Dishes Drawer on Restaurant Card
        const previewBtn = e.target.closest("[data-preview-dishes-id]");
        if (previewBtn) {
            const restId = previewBtn.getAttribute("data-preview-dishes-id");
            const restName = previewBtn.getAttribute("data-preview-dishes-name") || "Kitchen";
            await openPreviewDishesDrawer(restId, restName);
            return;
        }

        // 3. Open Dish Quick-View Modal
        const dishModalTrigger = e.target.closest("[data-open-dish-modal-id]");
        if (dishModalTrigger) {
            const dishId = dishModalTrigger.getAttribute("data-open-dish-modal-id");
            await openDishDetailModal(dishId);
            return;
        }

        // 4. One-Tap "+ Add" Dish Button
        const quickAddBtn = e.target.closest("[data-quick-add-dish-id]");
        if (quickAddBtn) {
            const dishId = quickAddBtn.getAttribute("data-quick-add-dish-id");
            const restId = quickAddBtn.getAttribute("data-quick-add-rest-id");
            const dishName = quickAddBtn.getAttribute("data-quick-add-dish-name") || "Dish";
            await addItemToCart(dishId, 1, restId, dishName);
            return;
        }

        // 5. Cart Quantity Stepper (+ / -)
        const cartStepBtn = e.target.closest("[data-cart-step-id]");
        if (cartStepBtn) {
            const menuItemId = cartStepBtn.getAttribute("data-cart-step-id");
            const nextQty = Number(cartStepBtn.getAttribute("data-cart-step-qty"));
            await updateCartItemQuantity(menuItemId, nextQty);
            return;
        }

        // 6. Cart Remove Item Button
        const cartRemoveBtn = e.target.closest("[data-cart-remove-id]");
        if (cartRemoveBtn) {
            const menuItemId = cartRemoveBtn.getAttribute("data-cart-remove-id");
            await removeCartItem(menuItemId);
            return;
        }

        // 7. Delete Saved Address
        const deleteAddrBtn = e.target.closest("[data-delete-address-id]");
        if (deleteAddrBtn) {
            const addrId = deleteAddrBtn.getAttribute("data-delete-address-id");
            await deleteSavedAddress(addrId);
            return;
        }

        // 8. View Order Receipt / Details Modal
        const viewOrderBtn = e.target.closest("[data-view-order-id]");
        if (viewOrderBtn) {
            const orderId = viewOrderBtn.getAttribute("data-view-order-id");
            await openOrderDetailModal(orderId);
            return;
        }

        // 9. Advance Order Status (Admin State Machine)
        const advanceOrderBtn = e.target.closest("[data-advance-order-id]");
        if (advanceOrderBtn) {
            const orderId = advanceOrderBtn.getAttribute("data-advance-order-id");
            const nextStatus = Number(advanceOrderBtn.getAttribute("data-next-status"));
            await updateOrderStatus(orderId, nextStatus);
            return;
        }

        // 10. Cancel Order (Customer or Admin when status is 0 or 1)
        const cancelOrderBtn = e.target.closest("[data-cancel-order-id]");
        if (cancelOrderBtn) {
            const orderId = cancelOrderBtn.getAttribute("data-cancel-order-id");
            if (window.confirm(`Cancel Order #${orderId}?`)) {
                await updateOrderStatus(orderId, 5);
            }
        }
    });
}

/* ============================================================================
   14. BOOTSTRAP APPLICATION ON DOM READY
   ============================================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    loadSessionFromStorage();
    syncAuthUI();
    bindAllEvents();

    await Promise.allSettled([
        fetchPublicCategories(),
        fetchRestaurantsFeed()
    ]);

    if (isUserAuthenticated()) {
        await initializeAuthenticatedUserState();
    }
});