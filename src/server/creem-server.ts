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
  CreemUpdateSubscriptionOptions,
  CreemUpgradeSubscriptionOptions,
  CreemError,
  CreemCustomer,
  CreemProduct,
  CreemDiscount,
  CreemTransaction,
  CreemPaginatedResponse,
  CreemActivateLicenseOptions,
  CreemValidateLicenseOptions,
  CreemDeactivateLicenseOptions,
  CreemLicenseActivationResult,
  CreemLicenseValidationResult,
  CreemBillingPortalResult,
  CreemCreateDiscountOptions,
  CreemCreateProductOptions,
  CreemWebhookEvent,
  CreemWebhookEventType,
} from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface CreemServerConfig {
  apiKey: string;
  /** Defaults to the production base URL. */
  baseUrl?: string;
  /** Custom fetch implementation. */
  customFetch?: typeof fetch;
  /** Number of retries for failed requests. Default: 2. */
  retries?: number;
  /** Base delay in ms for retry backoff. Default: 300. */
  retryDelay?: number;
}

const DEFAULT_BASE_URL = 'https://api.creem.io';
const SANDBOX_BASE_URL = 'https://test-api.creem.io';

// ---------------------------------------------------------------------------
// Retry helper (server-side)
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number,
  retryDelay: number,
  customFetch: typeof fetch
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await customFetch(url, options);
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      if (response.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// ---------------------------------------------------------------------------
// CreemServerClient
// ---------------------------------------------------------------------------

export class CreemServerClient {
  private apiKey: string;
  private baseUrl: string;
  private retries: number;
  private retryDelay: number;
  private customFetch: typeof fetch;

  constructor(config: CreemServerConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.retries = config.retries ?? 2;
    this.retryDelay = config.retryDelay ?? 300;
    this.customFetch = config.customFetch ?? fetch;
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

    const response = await fetchWithRetry(
      url,
      { ...options, headers },
      this.retries,
      this.retryDelay,
      this.customFetch
    );

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

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // ---------------------------------------------------------------------------
  // Checkouts
  // ---------------------------------------------------------------------------

  async createCheckoutSession(
    options: CreemCheckoutOptions
  ): Promise<CreemCheckoutSession> {
    return this.request<CreemCheckoutSession>('/v1/checkouts', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getCheckoutSession(checkoutId: string): Promise<CreemCheckoutSession> {
    return this.request<CreemCheckoutSession>(
      `/v1/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`
    );
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------

  async getSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      `/v1/subscriptions?subscription_id=${encodeURIComponent(subscriptionId)}`
    );
  }

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

  async updateSubscription(
    subscriptionId: string,
    options: CreemUpdateSubscriptionOptions
  ): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }

  async upgradeSubscription(
    subscriptionId: string,
    options: CreemUpgradeSubscriptionOptions
  ): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/upgrade`,
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }

  async pauseSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/pause`,
      { method: 'POST' }
    );
  }

  async resumeSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/resume`,
      { method: 'POST' }
    );
  }

  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------

  async getProduct(productId: string): Promise<CreemProduct> {
    return this.request<CreemProduct>(
      `/v1/products?product_id=${encodeURIComponent(productId)}`
    );
  }

  async searchProducts(
    page = 1,
    pageSize = 10
  ): Promise<CreemPaginatedResponse<CreemProduct>> {
    return this.request<CreemPaginatedResponse<CreemProduct>>(
      `/v1/products/search?page=${page}&page_size=${pageSize}`
    );
  }

  async createProduct(
    options: CreemCreateProductOptions
  ): Promise<CreemProduct> {
    return this.request<CreemProduct>('/v1/products', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------

  async getCustomer(customerId: string): Promise<CreemCustomer> {
    return this.request<CreemCustomer>(
      `/v1/customers?customer_id=${encodeURIComponent(customerId)}`
    );
  }

  async getCustomerByEmail(email: string): Promise<CreemCustomer> {
    return this.request<CreemCustomer>(
      `/v1/customers?email=${encodeURIComponent(email)}`
    );
  }

  async listCustomers(
    page = 1,
    pageSize = 10
  ): Promise<CreemPaginatedResponse<CreemCustomer>> {
    return this.request<CreemPaginatedResponse<CreemCustomer>>(
      `/v1/customers/list?page=${page}&page_size=${pageSize}`
    );
  }

  async generateCustomerPortalLink(
    customerId: string
  ): Promise<CreemBillingPortalResult> {
    return this.request<CreemBillingPortalResult>('/v1/customers/billing', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId }),
    });
  }

  // ---------------------------------------------------------------------------
  // Licenses
  // ---------------------------------------------------------------------------

  async activateLicense(
    options: CreemActivateLicenseOptions
  ): Promise<CreemLicenseActivationResult> {
    return this.request<CreemLicenseActivationResult>(
      '/v1/licenses/activate',
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }

  async validateLicense(
    options: CreemValidateLicenseOptions
  ): Promise<CreemLicenseValidationResult> {
    return this.request<CreemLicenseValidationResult>(
      '/v1/licenses/validate',
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }

  async deactivateLicense(
    options: CreemDeactivateLicenseOptions
  ): Promise<CreemLicenseValidationResult> {
    return this.request<CreemLicenseValidationResult>(
      '/v1/licenses/deactivate',
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Discounts
  // ---------------------------------------------------------------------------

  async getDiscount(discountId: string): Promise<CreemDiscount> {
    return this.request<CreemDiscount>(
      `/v1/discounts?discount_id=${encodeURIComponent(discountId)}`
    );
  }

  async getDiscountByCode(code: string): Promise<CreemDiscount> {
    return this.request<CreemDiscount>(
      `/v1/discounts?discount_code=${encodeURIComponent(code)}`
    );
  }

  async createDiscount(
    options: CreemCreateDiscountOptions
  ): Promise<CreemDiscount> {
    return this.request<CreemDiscount>('/v1/discounts', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async deleteDiscount(discountId: string): Promise<void> {
    await this.request<void>(
      `/v1/discounts/${encodeURIComponent(discountId)}/delete`,
      { method: 'DELETE' }
    );
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  async getTransaction(transactionId: string): Promise<CreemTransaction> {
    return this.request<CreemTransaction>(
      `/v1/transactions?transaction_id=${encodeURIComponent(transactionId)}`
    );
  }

  async searchTransactions(
    customerId?: string,
    orderId?: string,
    productId?: string,
    page = 1,
    pageSize = 50
  ): Promise<CreemPaginatedResponse<CreemTransaction>> {
    const params = new URLSearchParams();
    if (customerId) params.set('customer_id', customerId);
    if (orderId) params.set('order_id', orderId);
    if (productId) params.set('product_id', productId);
    params.set('page', String(page));
    params.set('page_size', String(pageSize));

    return this.request<CreemPaginatedResponse<CreemTransaction>>(
      `/v1/transactions/search?${params.toString()}`
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
  try {
    // `crypto` is a Node.js built-in — only call this server-side.
    const crypto = require('crypto') as typeof import('crypto');
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    // Constant-time comparison to prevent timing attacks.
    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expected, 'hex');

    if (sigBuffer.length !== expBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expBuffer);
  } catch {
    return false;
  }
}

/**
 * Parses a raw webhook payload string into a typed event.
 * Returns the parsed event object, or null if parsing fails.
 */
export function parseWebhookEvent<T = unknown>(
  payload: string
): CreemWebhookEvent<T> | null {
  try {
    return JSON.parse(payload) as CreemWebhookEvent<T>;
  } catch {
    return null;
  }
}

/**
 * Typed webhook event handler map.
 * Map webhook event types to handler functions.
 */
export type WebhookEventHandlers<T = unknown> = Partial<
  Record<CreemWebhookEventType, (data: T) => Promise<void> | void>
>;

/**
 * Process a webhook event using typed handlers.
 * Calls the matching handler for the event type, or the default handler if provided.
 */
export async function processWebhookEvent<T = unknown>(
  event: CreemWebhookEvent<T>,
  handlers: WebhookEventHandlers<T>,
  defaultHandler?: (event: CreemWebhookEvent<T>) => Promise<void> | void
): Promise<void> {
  const handler = handlers[event.eventType];
  if (handler) {
    await handler(event.object);
  } else if (defaultHandler) {
    await defaultHandler(event);
  }
}
