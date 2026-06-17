export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class SchatMobileApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(readonly baseUrl: string) {}

  setTokens(accessToken: string | null, refreshToken: string | null) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.setTokens(null, null);
  }

  getAccessToken() {
    return this.accessToken;
  }

  getRefreshToken() {
    return this.refreshToken;
  }

  async login(username: string, password: string) {
    const tokens = await this.post<{ accessToken: string; refreshToken: string }>('/auth/login', { username, password }, false);
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  async get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, authenticated = true) {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    }, authenticated);
  }

  async delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  private async request<T>(path: string, init: RequestInit, authenticated = true, retrying = false): Promise<T> {
    const headers = new Headers(init.headers);
    if (authenticated && this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (response.status === 401 && authenticated && !retrying && this.refreshToken && path !== '/auth/refresh' && path !== '/auth/login') {
      await this.refreshAccessToken();
      return this.request<T>(path, init, authenticated, true);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.message || `HTTP ${response.status}`, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new ApiError('Missing refresh token', 401);
    }
    if (!this.refreshPromise) {
      const refreshToken = this.refreshToken;
      this.refreshPromise = this.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }, false)
        .then((tokens) => {
          this.setTokens(tokens.accessToken, tokens.refreshToken);
          return tokens.accessToken;
        })
        .catch((error) => {
          this.clearTokens();
          throw error;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }
}
