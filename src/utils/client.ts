import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  CreemConfig,
  CreemCheckoutOptions,
  CreemCheckoutSession,
  CreemSubscription,
  CreemCancelSubscriptionOptions,
  CreemUpdateSubscriptionOptions,
  CreemUpgradeSubscriptionOptions,
  CreemError,
  CheckoutResult,
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
} from '../types';

const DEFAULT_BASE_URL = 'https://api.creem.io';
const SANDBOX_BASE_URL = 'https://test-api.creem.io';

// ---------------------------------------------------------------------------
// Internal retry helper
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

      // Don't retry 4xx errors (client errors)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Retry 5xx errors
      if (response.status >= 500 && attempt < retries) {
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await sleep(retryDelay * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// ---------------------------------------------------------------------------
// CreemClient — full API coverage
// ---------------------------------------------------------------------------

export class CreemClient {
  private apiKey: string;
  private baseUrl: string;
  private retries: number;
  private retryDelay: number;
  private customFetch: typeof fetch;

  constructor(config: CreemConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl =
      config.baseUrl ||
      (config.environment === 'sandbox' ? SANDBOX_BASE_URL : DEFAULT_BASE_URL);
    this.retries = config.retries ?? 2;
    this.retryDelay = config.retryDelay ?? 300;
    this.customFetch = config.customFetch ?? fetch;
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

    // Handle 204 No Content
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

export function buildCallbackUrl(
  path: string,
  params: Record<string, string> = {}
): string {
  const base = Linking.createURL(path);
  const qs = new URLSearchParams(params).toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseCallbackUrl(url: string): {
  status: 'completed' | 'canceled' | 'pending';
  sessionId?: string;
  orderId?: string;
  customerId?: string;
  productId?: string;
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
      orderId: params.get('order_id') || undefined,
      customerId: params.get('customer_id') || undefined,
      productId: params.get('product_id') || undefined,
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

export function validateApiKey(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}
