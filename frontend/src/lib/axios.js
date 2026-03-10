import axios from 'axios';

const api = axios.create({
    baseURL: `http://${window.location.hostname}:8000/api/`,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401, not trying to refresh already, and not on a login endpoint
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login/')) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const res = await axios.post(`http://${window.location.hostname}:8000/api/auth/refresh/`, {
                        refresh: refreshToken
                    });

                    if (res.status === 200) {
                        localStorage.setItem('access_token', res.data.access);
                        // SimpleJWT rotate tokens setting might return a new refresh token too
                        if (res.data.refresh) localStorage.setItem('refresh_token', res.data.refresh);

                        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                // If refresh fails, log out completely
                console.error("Session expired. Logging out.");
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // If no refresh token or it's a 401 and refresh fails
        if (error.response?.status === 401 && !originalRequest.url.includes('/auth/login/')) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
