const API_URL =
    (typeof window !== 'undefined' && window.ALMA_API_URL) ||
    'http://127.0.0.1:8001/api/v1';

const STORAGE = {
    token: 'alma_token',
    user: 'alma_user',
    conversationId: 'alma_chat_conversation_id',
    darkMode: 'alma_dark_mode',
    lang: 'alma_lang',
};

function formatApiError(errorData, status) {
    const d = errorData && errorData.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join('; ');
    return `Error ${status}`;
}

const api = {
    getToken: () =>
        localStorage.getItem(STORAGE.token) || localStorage.getItem('vela_token'),

    getSavedConversationId: () => localStorage.getItem(STORAGE.conversationId),

    saveConversationId: (id) => {
        if (id) localStorage.setItem(STORAGE.conversationId, id);
    },

    clearConversationId: () => localStorage.removeItem(STORAGE.conversationId),

    requireAuth: () => {
        if (!api.getToken()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    getMessageText: (msg) => {
        if (!msg) return '';
        return msg.content_encrypted || msg.content || msg.response || '';
    },

    isAiSender: (msg) => {
        const s = (msg && msg.sender) || '';
        return s === 'ai' || s === 'assistant' || s === 'system';
    },

    getHeaders: () => {
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        const token = api.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

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
                localStorage.removeItem(STORAGE.token);
                localStorage.removeItem('vela_token');
                api.clearConversationId();
                window.location.href = 'index.html';
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(formatApiError(errorData, response.status));
            }

            if (response.status === 204) return null;
            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    },

    login: async (email, password) => {
        // MVP: UID mock via /auth/login (sem password real ainda)
        let uid = 'test_uid_123';
        if (email !== 'test@alma.com') {
            uid = 'uid_' + btoa(email).substring(0, 10);
        }

        const response = await api.request('/auth/login', 'POST', {
            email: email,
            firebase_uid: uid,
            is_active: true,
        });

        if (response) {
            localStorage.setItem(STORAGE.token, uid);
            localStorage.setItem(STORAGE.user, JSON.stringify(response));
        }
        return response;
    },

    logout: () => {
        localStorage.removeItem(STORAGE.token);
        localStorage.removeItem(STORAGE.user);
        localStorage.removeItem('vela_token');
        api.clearConversationId();
        window.location.href = 'index.html';
    },

    getProfile: () => api.request('/profiles/me'),

    getWallet: () => api.request('/gamification/wallet'),

    getDailyPlan: () => api.request('/training/daily-plan'),
    getExercises: () => api.request('/training/exercises/library'),
    completeSession: (sessionId, feedback) =>
        api.request(`/training/session/${sessionId}/feedback`, 'POST', feedback),

    getEducation: () => api.request('/education/'),

    getSnapshotHistory: () => api.request('/clinical/snapshots/history'),
    getForms: () => api.request('/clinical/forms'),
    getFormSchema: (code) => api.request(`/clinical/forms/${code}/schema`),
    startSubmission: (formId) =>
        api.request('/clinical/submissions/start', 'POST', { form_id: formId }),
    finalizeSubmission: (subId) =>
        api.request(`/clinical/submissions/${subId}/finalize`, 'POST'),

    // AI Chat endpoints — contrato Alma backend
    startChat: () => api.request('/ai/chat/new', 'POST'),

    sendMessage: (convId, content) =>
        api.request(`/ai/chat/${convId}/send`, 'POST', { content }),

    getChatHistory: (convId) => api.request(`/ai/chat/${convId}/messages`),

    sendChatFeedback: (messageId, userAction) =>
        api.request(`/ai/feedback/${messageId}`, 'POST', {
            user_action: userAction, // 'ACCEPTED' | 'REJECTED' | 'IGNORED'
        }),

    getGamificationStats: () => api.request('/gamification/stats'),
    getShopCatalog: () => api.request('/gamification/shop/catalog'),
    buyItem: (itemId) => api.request(`/gamification/shop/buy/${itemId}`, 'POST'),

    applyTheme: (isDark) => {
        if (isDark === undefined) {
            const storedUser = JSON.parse(localStorage.getItem(STORAGE.user) || '{}');
            isDark =
                storedUser.dark_mode === true ||
                localStorage.getItem(STORAGE.darkMode) === 'true';
        }

        localStorage.setItem(STORAGE.darkMode, isDark);

        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    },

    t: (key, fallback = '') => {
        if (typeof translations === 'undefined') return fallback || key;
        const lang = localStorage.getItem(STORAGE.lang) || 'es';
        const dict = translations[lang] || translations.es || {};
        return dict[key] || (translations.es && translations.es[key]) || fallback || key;
    },

    initLocalization: () => {
        const storedUser = JSON.parse(localStorage.getItem(STORAGE.user) || '{}');
        const lang =
            storedUser.preferred_language || localStorage.getItem(STORAGE.lang) || 'es';

        localStorage.setItem(STORAGE.lang, lang);

        if (typeof translations === 'undefined') {
            console.warn('Translations file not loaded.');
            return;
        }

        const t = translations[lang] || translations.es;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!t[key]) return;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            if (t[key]) el.setAttribute('title', t[key]);
        });
    },

    initApp: () => {
        api.applyTheme();
        api.initLocalization();
    },
};

const originalLogin = api.login;
api.login = async (email, password) => {
    const response = await originalLogin(email, password);
    if (response) {
        localStorage.setItem(STORAGE.darkMode, response.dark_mode === true);
        localStorage.setItem(STORAGE.lang, response.preferred_language || 'es');
    }
    return response;
};

api.updateProfile = async (data) => {
    const response = await api.request('/profiles/me', 'PATCH', data);

    if (data.dark_mode !== undefined) {
        localStorage.setItem(STORAGE.darkMode, data.dark_mode);
        api.applyTheme(data.dark_mode);
    }
    if (data.preferred_language !== undefined) {
        localStorage.setItem(STORAGE.lang, data.preferred_language);
        api.initLocalization();
    }

    const storedUser = JSON.parse(localStorage.getItem(STORAGE.user) || '{}');
    const newUser = { ...storedUser, ...data };
    localStorage.setItem(STORAGE.user, JSON.stringify(newUser));

    return response;
};
