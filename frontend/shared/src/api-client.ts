import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiClientConfig {
  baseURL?: string;
  onLogout?: () => void;
  onTokenRefreshed?: (accessToken: string, refreshToken: string) => void;
}

export class SchatApiClient {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(config: ApiClientConfig = {}) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL || '',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: add bearer token
    this.axiosInstance.interceptors.request.use(
      (req) => {
        if (this.accessToken && req.headers) {
          req.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return req;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle 401 errors and token refresh
    this.axiosInstance.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        // Avoid infinite loop if auth/refresh itself fails or it's already a retried request
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          this.refreshToken &&
          originalRequest.url !== '/auth/refresh' &&
          originalRequest.url !== '/auth/login'
        ) {
          originalRequest._retry = true;

          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.subscribeTokenRefresh((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }

          this.isRefreshing = true;

          try {
            const refreshResponse = await this.axiosInstance.post('/auth/refresh', {
              refreshToken: this.refreshToken,
            });

            const { accessToken: newAccess, refreshToken: newRefresh } = refreshResponse.data;
            this.setTokens(newAccess, newRefresh);

            if (config.onTokenRefreshed) {
              config.onTokenRefreshed(newAccess, newRefresh);
            }

            this.onRefreshed(newAccess);
            this.isRefreshing = false;

            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.setTokens(null, null);
            if (config.onLogout) {
              config.onLogout();
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public setTokens(accessToken: string | null, refreshToken: string | null) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  public getAccessToken() {
    return this.accessToken;
  }

  public getRefreshToken() {
    return this.refreshToken;
  }

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  // Wrapper methods for key endpoints
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }
}
