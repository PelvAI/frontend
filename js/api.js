const API_URL = 'http://127.0.0.1:8001/api/v1';

const api = {
    getToken: () => localStorage.getItem('alma_token'),

    // Helper to get headers with auth token
    getHeaders: () => {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const token = api.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Generic fetch wrapper
    request: async (endpoint, method = 'GET', body = null) => {
        const options = {
            method,
            headers: api.getHeaders(),
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, options);

            if (response.status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('alma_token');
                window.location.href = 'index.html';
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    },

    // Auth endpoints
    login: async (email, password) => {
        // In this MVP, we just simulate login by getting the user by UID if it exists,
        // or creating a new one. Since we don't have real password auth yet,
        // we'll use the 'login' endpoint which accepts a UID.
        // For the prototype, we'll use a hardcoded UID for "test user" if email matches,
        // or generate one.

        let uid = 'test_uid_123'; // Default test user
        if (email !== 'test@alma.com') {
            // Simple hash for other emails to get consistent UIDs
            uid = 'uid_' + btoa(email).substring(0, 10);
        }

        const response = await api.request('/auth/login', 'POST', {
            email: email,
            firebase_uid: uid,
            is_active: true
        });

        if (response) {
            localStorage.setItem('alma_token', uid);
            localStorage.setItem('alma_user', JSON.stringify(response));
        }
        return response;
    },

    logout: () => {
        localStorage.removeItem('alma_token');
        localStorage.removeItem('alma_user');
        window.location.href = 'index.html';
    },

    // Profile endpoints
    getProfile: () => api.request('/profiles/me'),

    // Gamification endpoints
    getWallet: () => api.request('/gamification/wallet'),

    // Training endpoints
    getDailyPlan: () => api.request('/training/daily-plan'),
    getExercises: () => api.request('/training/exercises/library'),
    completeSession: (sessionId, feedback) => api.request(`/training/session/${sessionId}/feedback`, 'POST', feedback),

    // Education endpoints
    getEducation: () => api.request('/education/'),

    // Clinical endpoints
    getSnapshotHistory: () => api.request('/clinical/snapshots/history'),
    getForms: () => api.request('/clinical/forms'),
    getFormSchema: (code) => api.request(`/clinical/forms/${code}/schema`),
    startSubmission: (formId) => api.request('/clinical/submissions/start', 'POST', { form_id: formId }),
    finalizeSubmission: (subId) => api.request(`/clinical/submissions/${subId}/finalize`, 'POST'),

    // AI Chat endpoints
    startChat: () => api.request('/ai/chat/new', 'POST'),
    sendMessage: (convId, message) => api.request(`/ai/chat/${convId}/send`, 'POST', { message }),
    getChatHistory: (convId) => api.request(`/ai/chat/${convId}/messages`),

    // Gamification endpoints
    getGamificationStats: () => api.request('/gamification/stats'),
    getShopCatalog: () => api.request('/gamification/shop/catalog'),
    buyItem: (itemId) => api.request(`/gamification/shop/buy/${itemId}`, 'POST'),

    // --- Global Settings & Localization ---

    // Apply Dark Mode
    applyTheme: (isDark) => {
        // If argument provided, use it. Otherwise check localStorage. Default false.
        if (isDark === undefined) {
            const storedUser = JSON.parse(localStorage.getItem('alma_user') || '{}');
            // Check profile setting first, then fallback to localStorage 'alma_dark_mode'
            isDark = storedUser.dark_mode === true || localStorage.getItem('alma_dark_mode') === 'true';
        }

        // Save to localStorage for persistence across pages even if user object isn't fully loaded
        localStorage.setItem('alma_dark_mode', isDark);

        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    },

    // Initialize Localization
    initLocalization: () => {
        const storedUser = JSON.parse(localStorage.getItem('alma_user') || '{}');
        const lang = storedUser.preferred_language || localStorage.getItem('alma_lang') || 'es';

        // Save for persistence
        localStorage.setItem('alma_lang', lang);

        if (typeof translations === 'undefined') {
            console.warn('Translations file not loaded.');
            return;
        }

        const t = translations[lang] || translations['es'];

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                    el.placeholder = t[key];
                } else {
                    el.textContent = t[key];
                }
            }
        });
    },

    // Initialize App (Call this on every page load)
    initApp: () => {
        api.applyTheme();
        api.initLocalization();
    }
};

// Hook into login to save settings
const originalLogin = api.login;
api.login = async (email, password) => {
    const response = await originalLogin(email, password);
    if (response) {
        // Save settings to localStorage for immediate access
        localStorage.setItem('alma_dark_mode', response.dark_mode === true);
        localStorage.setItem('alma_lang', response.preferred_language || 'es');
    }
    return response;
};

// Hook into updateProfile to update settings
const originalUpdateProfile = api.updateProfile;
api.updateProfile = async (data) => {
    const response = await api.request('/profiles/me', 'PATCH', data);

    // Update local storage and UI
    if (data.dark_mode !== undefined) {
        localStorage.setItem('alma_dark_mode', data.dark_mode);
        api.applyTheme(data.dark_mode);
    }
    if (data.preferred_language !== undefined) {
        localStorage.setItem('alma_lang', data.preferred_language);
        api.initLocalization();
    }

    // Update cached user object
    const storedUser = JSON.parse(localStorage.getItem('alma_user') || '{}');
    const newUser = { ...storedUser, ...data };
    localStorage.setItem('alma_user', JSON.stringify(newUser));

    return response;
};
