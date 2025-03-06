// src/index.ts

export interface ProxyClientConfig {
  /** Optional override for the host */
  tollbitHost?: string;
  /** API key obtained from tollbit.com */
  apiKey: string;
  /** Registered user agent string */
  userAgent: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Known protected sites */
  knownSites?: URL[];
}

export class TollbitError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = "TollbitError";
  }
}

export interface TollbitResponse {
  status: number;
  headers: Record<string, string>;
}

export interface RedirectResult {
  shouldRedirect: boolean;
  token?: string;
  redirectUrl?: URL;
}

export type CheckResponseResult =
  | {
      action: "redirect";
      isTollbitSite: true;
      to: URL;
    }
  | {
      action: "token_required";
      isTollbitSite: true;
      to?: never;
    }
  | {
      action: "none";
      isTollbitSite?: never;
      to?: never;
    };

// export type ResponseHand

export class ProxyClient {
  private protectedSites: Set<string>;
  private readonly config: ProxyClientConfig;

  static create(config: ProxyClientConfig): ProxyClient {
    return new ProxyClient(config);
  }

  protected constructor(config: ProxyClientConfig) {
    if (!config.userAgent) {
      throw new TollbitError("User agent is required", "MISSING_USER_AGENT");
    }

    this.config = config;
    this.protectedSites = new Set(
      (config.knownSites || []).map((url) => url.origin)
    );
  }

  protected isProtectedUrl(url: URL): boolean {
    return this.protectedSites.has(url.origin);
  }

  public async generateToken(targetUrl: URL): Promise<string> {
    if (!this.config.apiKey) {
      throw new TollbitError("API key is required", "KEY_INIT_FAILED");
    }

    try {
      const resp = await fetch(
        `https://${
          this.config.tollbitHost || "edge.tollbit.com"
        }/.tollbit/auth/token`,
        {
          body: JSON.stringify({
            apiKey: this.config.apiKey,
            userAgent: this.config.userAgent,
            site: targetUrl.host,
          }),
          method: "POST",
        }
      );

      if (resp.status !== 200) {
        console.error(targetUrl, resp.status);
        throw new TollbitError(
          "Failed to generate token for site",
          "TOKEN_FETCH"
        );
      }

      const json = await resp.json();

      return json.token;
    } catch (error) {
      console.error(error);
      throw new TollbitError(
        "Failed to generate token",
        "TOKEN_GENERATION_FAILED"
      );
    }
  }

  public async checkResponse(
    response: TollbitResponse,
    targetUrl: string
  ): Promise<CheckResponseResult> {
    if (
      /^402$/.test(`${response.status}`) /*&&
      response.headers["x-tollbit-token-required"]*/
    ) {
      console.log("received 402 from %s", targetUrl);
      // this is a tollbit subdomain, but we need a token
      this.registerSite(new URL(targetUrl));
      return { action: "token_required", isTollbitSite: true };
    }

    if (!/^3\d\d$/.test(`${response.status}`)) {
      // Not a redirect status code, so we can just return the response
      return { action: "none" };
    }

    // Not a Tollbit redirect
    if (!response.headers["x-tollbit-redirect"]) {
      return { action: "none" };
    }

    const redirectUrl = new URL(response.headers["location"] || targetUrl);

    // Add to protected sites if not already known
    this.registerSite(redirectUrl);
    return { action: "redirect", isTollbitSite: true, to: redirectUrl };
  }

  public registerSite(url: URL): void {
    const isSiteRegistered = this.protectedSites.has(url.origin);
    if (!isSiteRegistered) {
      this.protectedSites.add(url.origin);
      if (this.config.debug) {
        console.log(`Added new site to protection list: ${url.origin}`);
      }
    }
  }

  public async generateHeaders(
    url: URL,
    existingHeaders: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    if (!this.isProtectedUrl(url)) {
      return existingHeaders;
    }

    const token = await this.generateToken(url);
    return {
      ...existingHeaders,
      "user-agent": this.config.userAgent,
      Authorization: `Bearer ${token}`,
    };
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Whether to automatically retry on 402 responses */
  autoRetry?: boolean;
  /** Maximum number of retries for 402 responses */
  maxRetries?: number;
}

export class TollbitApiClient {
  private readonly client: ProxyClient;

  static create(config: ProxyClientConfig): TollbitApiClient {
    return new TollbitApiClient(config);
  }

  private constructor(config: ProxyClientConfig) {
    this.client = ProxyClient.create(config);
  }

  /**
   * Makes a request to a Tollbit-protected endpoint
   * @param url The URL to make the request to
   * @param options Request options including headers, body, etc.
   * @returns The response from the server
   */
  async request(url: string | URL, options: ApiRequestOptions = {}): Promise<Response> {
    const targetUrl = typeof url === 'string' ? new URL(url) : url;
    const { autoRetry = true, maxRetries = 3, ...fetchOptions } = options;

    let retryCount = 0;

    while (true) {
      try {
        // Generate headers with Tollbit authentication
        const requestHeaders = await this.client.generateHeaders(
          targetUrl,
          options.headers as Record<string, string> || {}
        );

        // Make the request
        const response = await fetch(targetUrl.toString(), {
          ...fetchOptions,
          headers: requestHeaders,
        });

        // Check if we need to handle a Tollbit response
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        const { action, isTollbitSite } = await this.client.checkResponse(
          {
            status: response.status,
            headers: responseHeaders,
          },
          targetUrl.toString()
        );

        if (!isTollbitSite) {
          return response;
        }

        // Handle token required or redirect cases
        if (action === "token_required" || action === "redirect") {
          if (!autoRetry || retryCount >= maxRetries) {
            throw new TollbitError(
              "Max retries exceeded for Tollbit authentication",
              "MAX_RETRIES_EXCEEDED"
            );
          }
          retryCount++;
          continue;
        }

        return response;
      } catch (error) {
        if (error instanceof TollbitError) {
          throw error;
        }
        throw new TollbitError(
          `Request failed: ${error.message}`,
          "REQUEST_FAILED"
        );
      }
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get(url: string | URL, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * Convenience method for POST requests
   */
  async post(url: string | URL, body?: any, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Convenience method for PUT requests
   */
  async put(url: string | URL, body?: any, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete(url: string | URL, options: ApiRequestOptions = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}
