/**
 * expo-creem — Server-side helpers
 *
 * Import from 'expo-creem/server' (or 'expo-creem' — both are exported).
 * This module is safe to use in Node.js / Edge runtimes.
 * Never import it inside React Native bundles — it uses Node's `crypto`.
 */
import {
  CreemCheckoutOptions,
  CreemCheckoutSession,
  CreemSubscription,
  CreemCancelSubscriptionOptions,
  CreemError,
} from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface CreemServerConfig {
  apiKey: string;
  /** Defaults to the production base URL. */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.creem.io';
const SANDBOX_BASE_URL = 'https://test-api.creem.io';

// ---------------------------------------------------------------------------
// CreemServerClient
// ---------------------------------------------------------------------------

export class CreemServerClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: CreemServerConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /** Convenience factory that points at the test environment. */
  static sandbox(config: CreemServerConfig): CreemServerClient {
    return new CreemServerClient({
      ...config,
      baseUrl: config.baseUrl || SANDBOX_BASE_URL,
    });
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorBody: { message?: string } = {};
      try {
        errorBody = await response.json();
      } catch {
        // ignore
      }
      const error: CreemError = {
        code: `HTTP_${response.status}`,
        message: errorBody.message || response.statusText || 'An error occurred',
        statusCode: response.status,
        details: errorBody,
      };
      throw error;
    }

    return response.json() as Promise<T>;
  }

  // ---------------------------------------------------------------------------
  // Checkout endpoints
  // ---------------------------------------------------------------------------

  /**
   * POST /v1/checkouts
   * Creates a new checkout session. Call this from your server to avoid
   * exposing your API key in the client bundle.
   */
  async createCheckoutSession(
    options: CreemCheckoutOptions
  ): Promise<CreemCheckoutSession> {
    return this.request<CreemCheckoutSession>('/v1/checkouts', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * GET /v1/checkouts?checkout_id={id}
   * Retrieves a checkout session by ID.
   */
  async getCheckoutSession(checkoutId: string): Promise<CreemCheckoutSession> {
    return this.request<CreemCheckoutSession>(
      `/v1/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`
    );
  }

  // ---------------------------------------------------------------------------
  // Subscription endpoints
  // ---------------------------------------------------------------------------

  /**
   * GET /v1/subscriptions?subscription_id={id}
   * Retrieves a subscription by ID.
   */
  async getSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      `/v1/subscriptions?subscription_id=${encodeURIComponent(subscriptionId)}`
    );
  }

  /**
   * POST /v1/subscriptions/{id}/cancel
   * Cancels a subscription. Use `mode: 'scheduled'` to cancel at period end,
   * or `mode: 'immediate'` to cancel right away.
   */
  async cancelSubscription(
    subscriptionId: string,
    options?: CreemCancelSubscriptionOptions
  ): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify(options ?? {}),
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Webhook helpers
// ---------------------------------------------------------------------------

/**
 * Verifies a Creem webhook signature using HMAC-SHA256.
 *
 * @param payload       The raw request body string (before JSON.parse).
 * @param signature     The value of the `creem-signature` header.
 * @param webhookSecret Your webhook secret from the Creem dashboard.
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  // `crypto` is a Node.js built-in — only call this server-side.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto') as typeof import('crypto');
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload, 'utf8')
    .digest('hex');
  // Constant-time comparison to prevent timing attacks.
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Parses a raw webhook payload string.
 * Returns the parsed event object, or null if parsing fails.
 */
export function parseWebhookEvent(payload: string): unknown | null {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
