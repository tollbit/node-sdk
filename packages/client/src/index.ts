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
  /** Force headers to be added regardless of redirect status */
  forceHeaders?: boolean;
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

  public async checkResponse(
    response: TollbitResponse,
    targetUrl: string
  ): Promise<CheckResponseResult> {
    // we make a request to a site, and get redirected to the tollbit subdomain

    // we make a request to a site, and get redirected, but not a tollbit redirect

    // we make a request to a tollbit site, but get a 402 for not having a token

    console.log("checking response for %o %s", response, targetUrl);
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

  protected registerSite(url: URL): void {
    const isSiteRegistered = this.protectedSites.has(url.origin);
    if (!isSiteRegistered) {
      this.protectedSites.add(url.origin);
      this.config.debug &&
        console.log(`Added new site to protection list: ${url.origin}`);
    }
  }

  public async generateHeaders(
    url: URL,
    existingHeaders: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    if (!this.config.forceHeaders && !this.isProtectedUrl(url)) {
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
