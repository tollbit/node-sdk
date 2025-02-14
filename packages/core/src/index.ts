// src/index.ts
import { importPKCS8, SignJWT } from "jose";

export interface TollbitConfig {
  /** Secret key obtained from tollbit.com */
  secretKey: string;
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
  private key: Awaited<ReturnType<typeof importPKCS8>> | null = null;
  private protectedSites: Set<string>;

  constructor(protected readonly config: TollbitConfig) {
    if (!config.secretKey) {
      throw new TollbitError("Secret key is required", "MISSING_SECRET_KEY");
    }
    if (!config.userAgent) {
      throw new TollbitError("User agent is required", "MISSING_USER_AGENT");
    }

    this.protectedSites = new Set(
      (config.knownSites || []).map((url) => url.origin)
    );
  }

  protected async init() {
    if (!this.key) {
      try {
        this.key = await importPKCS8(this.config.secretKey, "RS256");
      } catch (error) {
        throw new TollbitError(
          "Failed to import secret key. Ensure it is in valid PKCS8 format.",
          "INVALID_SECRET_KEY"
        );
      }
    }
  }

  protected isProtectedUrl(url: URL): boolean {
    return this.protectedSites.has(url.origin);
  }

  protected async generateToken(targetUrl: URL): Promise<string> {
    await this.init();
    if (!this.key) {
      throw new TollbitError("Failed to initialize key", "KEY_INIT_FAILED");
    }

    try {
      const jwt = await new SignJWT({
        userAgent: this.config.userAgent,
      })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setIssuer("TollbitSDK")
        .setAudience(targetUrl.origin)
        .setExpirationTime("5m")
        .sign(this.key);

      if (this.config.debug) {
        console.log(`Generated token for ${targetUrl.origin}`);
      }

      return jwt;
    } catch (error) {
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
    return {
      ...existingHeaders,
      "user-agent": this.config.userAgent,
      "x-tollbit-token": token,
    };
  }
}
