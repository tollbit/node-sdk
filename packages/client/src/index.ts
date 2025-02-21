// src/index.ts

export interface TollbitConfig {
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
  /** Force headers to be added regardless of redirect status */
  forceHeaders?: boolean;
}

export class TollbitError extends Error {
  constructor(message: string, public code: string, public status?: number) {
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

export class Tollbit {
  private protectedSites: Set<string>;

  constructor(protected readonly config: TollbitConfig) {
    if (!config.userAgent) {
      throw new TollbitError("User agent is required", "MISSING_USER_AGENT");
    }

    this.protectedSites = new Set(
      (config.knownSites || []).map((url) => url.origin)
    );
  }

  protected isProtectedUrl(url: URL): boolean {
    return this.protectedSites.has(url.origin);
  }

  protected async generateToken(targetUrl: URL): Promise<string> {
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

  public async handleResponse(
    response: TollbitResponse,
    targetUrl: string
  ): Promise<RedirectResult> {
    // Not a redirect status code
    if (!/^3\d\d$/.test(`${response.status}`)) {
      return { shouldRedirect: false };
    }

    // Not a Tollbit redirect
    if (!response.headers["x-tollbit-redirect"]) {
      return { shouldRedirect: false };
    }

    const redirectUrl = new URL(response.headers["location"] || targetUrl);

    // Add to protected sites if not already known
    if (!this.protectedSites.has(redirectUrl.origin)) {
      this.protectedSites.add(redirectUrl.origin);
      if (this.config.debug) {
        console.log(`Added new site to protection list: ${redirectUrl.origin}`);
      }
    }

    const token = await this.generateToken(redirectUrl);
    return { shouldRedirect: true, token, redirectUrl };
  }

  public async generateHeaders(
    url: URL,
    existingHeaders: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    if (!this.config.forceHeaders && !this.isProtectedUrl(url)) {
      return existingHeaders;
    }

    const token = await this.generateToken(url);
    console.log("generated token ", token);
    return {
      ...existingHeaders,
      "user-agent": this.config.userAgent,
      Authorization: `Bearer ${token}`,
    };
  }
}
