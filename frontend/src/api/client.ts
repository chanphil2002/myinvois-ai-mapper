import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
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
