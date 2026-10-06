import axios, { AxiosError } from 'axios';

// Defaults to whatever host the page itself was loaded from (so this works unmodified whether
// you're on localhost or hitting the dev machine's LAN IP from a phone) rather than a hardcoded
// address, which goes stale the moment DHCP reassigns the machine's IP. VITE_API_BASE_URL can
// still override this if the backend ever runs on a different host/port than the frontend.
const defaultApiBaseUrl = `${window.location.protocol}//${window.location.hostname}:8080`;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('mytax_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a non-2xx response, axios throws a generic AxiosError ("Request failed with status code
// 500") instead of the backend's actual error message — even though the backend always sends
// { success: false, error: "..." } in the response body. Rewriting err.message here means every
// existing `err instanceof Error ? err.message : ...` call site across the app shows the real
// backend error without each one needing to reach into err.response.data itself.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    // An expired/invalid JWT is rejected by Spring Security as 401/403 with no body. When that
    // happens to a logged-in session (token present, not an auth call), drop the stale token and
    // send the user to log in again instead of surfacing a cryptic "status code 403" toast.
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isAuthCall = url.includes('/api/auth/');
    if ((status === 401 || status === 403) && !isAuthCall && localStorage.getItem('mytax_token')) {
      localStorage.removeItem('mytax_token');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
      error.message = 'Your session has expired. Please log in again.';
      return Promise.reject(error);
    }

    const backendMessage = error.response?.data?.error;
    if (backendMessage) {
      error.message = backendMessage;
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  if (!response.data.success || response.data.data === null) {
    throw new Error(response.data.error ?? 'Request failed');
  }
  return response.data.data;
}
