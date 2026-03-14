import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  CreemConfig,
  CreemCheckoutOptions,
  CreemCheckoutSession,
  CreemSubscription,
  CreemCancelSubscriptionOptions,
  CreemError,
  CheckoutResult,
} from '../types';

const DEFAULT_BASE_URL = 'https://api.creem.io';
const SANDBOX_BASE_URL = 'https://test-api.creem.io';

export class CreemClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: CreemConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl =
      config.baseUrl ||
      (config.environment === 'sandbox' ? SANDBOX_BASE_URL : DEFAULT_BASE_URL);
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
        // ignore parse failure
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
  // Checkouts
  // ---------------------------------------------------------------------------

  /**
   * POST /v1/checkouts
   * Creates a new checkout session for the given product.
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
   * Retrieves an existing checkout session by its ID.
   */
  async getCheckoutSession(checkoutId: string): Promise<CreemCheckoutSession> {
    return this.request<CreemCheckoutSession>(
      `/v1/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`
    );
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  /**
   * GET /v1/subscriptions?subscription_id={id}
   * Retrieves a subscription by its ID.
   */
  async getSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      `/v1/subscriptions?subscription_id=${encodeURIComponent(subscriptionId)}`
    );
  }

  /**
   * POST /v1/subscriptions/{id}/cancel
   * Cancels a subscription immediately or at the end of the billing period.
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
// Module-level singleton
// ---------------------------------------------------------------------------

let globalClient: CreemClient | null = null;

export function initializeCreem(config: CreemConfig): CreemClient {
  globalClient = new CreemClient(config);
  return globalClient;
}

export function getCreemClient(): CreemClient {
  if (!globalClient) {
    throw new Error(
      'Creem client not initialized. Call initializeCreem() or wrap your app with <CreemProvider>.'
    );
  }
  return globalClient;
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

/**
 * Opens the checkout URL via expo-web-browser and waits for the deep-link
 * redirect back into the app.
 *
 * @param session   The checkout session returned by createCheckoutSession.
 * @param redirectUrl  The deep-link URL that Creem will redirect to after
 *                     checkout (e.g. `myapp://creem/callback`).
 */
export async function launchCheckout(
  session: CreemCheckoutSession,
  redirectUrl: string
): Promise<CheckoutResult> {
  if (!session.checkout_url) {
    return {
      status: 'canceled',
      error: {
        code: 'NO_CHECKOUT_URL',
        message: 'Checkout session has no checkout_url.',
      },
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(
    session.checkout_url,
    redirectUrl
  );

  if (result.type === 'success') {
    const parsed = new URL(result.url);
    const params = parsed.searchParams;

    // Creem may append ?status=canceled when the user closes the modal
    if (params.get('status') === 'canceled' || parsed.pathname.includes('cancel')) {
      return { status: 'canceled' };
    }

    const sessionId = params.get('checkout_id') || session.id;
    return { status: 'completed', sessionId: sessionId || undefined };
  }

  if (result.type === 'cancel') {
    return { status: 'canceled' };
  }

  return {
    status: 'canceled',
    error: {
      code: 'BROWSER_DISMISSED',
      message: 'The browser was dismissed before checkout completed.',
    },
  };
}

// ---------------------------------------------------------------------------
// Deep-link helpers
// ---------------------------------------------------------------------------

/**
 * Builds a deep-link URL for use as success_url / cancel redirect.
 *
 * @param path    Relative path, e.g. `'creem/success'`
 * @param params  Additional query parameters to append.
 */
export function buildCallbackUrl(
  path: string,
  params: Record<string, string> = {}
): string {
  const base = Linking.createURL(path);
  const qs = new URLSearchParams(params).toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Parses a deep-link callback URL and extracts checkout outcome information.
 */
export function parseCallbackUrl(url: string): {
  status: 'completed' | 'canceled' | 'pending';
  sessionId?: string;
  error?: string;
} {
  const parsed = new URL(url);
  const path = parsed.pathname;
  const params = parsed.searchParams;

  if (path.includes('success') || params.get('status') === 'completed') {
    return {
      status: 'completed',
      sessionId:
        params.get('checkout_id') || params.get('session_id') || undefined,
    };
  }

  if (path.includes('cancel') || params.get('status') === 'canceled') {
    return { status: 'canceled' };
  }

  if (params.get('error')) {
    return {
      status: 'canceled',
      error:
        params.get('error_description') || params.get('error') || 'Unknown error',
    };
  }

  return { status: 'pending' };
}

/**
 * Basic API key validation — checks the key is a non-empty string.
 * The actual key format is not publicly documented by Creem, so we only
 * guard against obviously invalid values.
 */
export function validateApiKey(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}
