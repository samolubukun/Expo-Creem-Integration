// ---------------------------------------------------------------------------
// Core config
// ---------------------------------------------------------------------------

export type CreemEnvironment = 'production' | 'sandbox';

export interface CreemConfig {
  apiKey: string;
  environment?: CreemEnvironment;
  /** Override the base URL (e.g. for proxying through your own backend). */
  baseUrl?: string;
  /** Custom fetch implementation (for testing or proxy). */
  customFetch?: typeof fetch;
  /** Number of retries for failed requests. Default: 2. */
  retries?: number;
  /** Base delay in ms for retry backoff. Default: 300. */
  retryDelay?: number;
}

// ---------------------------------------------------------------------------
// Enums that match the Creem OpenAPI spec exactly
// ---------------------------------------------------------------------------

/** Creem API mode — returned on most entities. */
export type CreemMode = 'test' | 'prod' | 'sandbox';

/**
 * Possible statuses for a Creem checkout session.
 * Source: Creem API — CheckoutEntity.status
 */
export type CheckoutStatus = 'pending' | 'processing' | 'completed' | 'expired';

/**
 * Possible statuses for a Creem subscription.
 * Source: Creem API — SubscriptionEntity.status
 */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'unpaid'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'scheduled_cancel';

/** Billing type for products. */
export type BillingType = 'one_time' | 'recurring';

/** Billing period for recurring products. Source: Creem API — ProductEntity.billing_period */
export type BillingPeriod = 'every-day' | 'every-week' | 'every-month' | 'every-year';

/** Product status. */
export type ProductStatus = 'active' | 'archived';

/** Tax mode. */
export type TaxMode = 'inclusive' | 'exclusive';

/** Order type. */
export type OrderType = 'checkout' | 'renewal' | 'upgrade' | 'downgrade';

/** License status. */
export type LicenseStatus = 'active' | 'inactive' | 'expired' | 'disabled';

/** Subscription update behavior for proration. */
export type UpdateBehavior =
  | 'proration-charge-immediately'
  | 'proration-charge'
  | 'proration-none';

// ---------------------------------------------------------------------------
// Custom fields (request & response)
// ---------------------------------------------------------------------------

export interface CreemCustomFieldRequest {
  type: 'text' | 'checkbox';
  key: string;
  label: string;
  optional?: boolean;
  text?: {
    min_length?: number;
    max_length?: number;
    default_value?: string;
  };
  checkbox?: {
    default_value?: boolean;
  };
}

export interface CreemCustomFieldResponse {
  type: 'text' | 'checkbox';
  key: string;
  label: string;
  optional?: boolean;
  text?: {
    min_length?: number;
    max_length?: number;
    default_value?: string;
    value?: string;
  };
  checkbox?: {
    default_value?: boolean;
    value?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Nested entity shapes returned by the API
// ---------------------------------------------------------------------------

export interface CreemCustomer {
  id: string;
  mode?: CreemMode;
  object?: 'customer';
  email?: string;
  name?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreemProductFeature {
  name: string;
  slug?: string;
}

export interface CreemProduct {
  id: string;
  mode?: CreemMode;
  object?: 'product';
  name: string;
  description?: string;
  image_url?: string;
  price?: number;
  currency?: string;
  billing_type?: BillingType;
  billing_period?: BillingPeriod;
  status?: ProductStatus;
  tax_mode?: TaxMode;
  tax_category?: string;
  features?: CreemProductFeature[];
  product_url?: string;
  default_success_url?: string;
  custom_fields?: CreemCustomFieldRequest[];
  created_at?: string;
  updated_at?: string;
}

export interface CreemDiscount {
  id: string;
  mode?: CreemMode;
  object?: 'discount';
  code?: string;
  type?: 'percentage' | 'fixed';
  amount?: number;
  percentage?: number;
  duration?: 'once' | 'repeating' | 'forever';
  duration_in_months?: number;
  max_redemptions?: number;
  times_redeemed?: number;
  applies_to_products?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreemTransaction {
  id: string;
  mode?: CreemMode;
  object?: 'transaction';
  status?: string;
  amount?: number;
  currency?: string;
  type?: string;
  customer?: string | CreemCustomer;
  product?: string | CreemProduct;
  order?: string | CreemOrder;
  created_at?: string;
  updated_at?: string;
}

export interface CreemOrder {
  id: string;
  mode?: CreemMode;
  object?: 'order';
  status: string;
  amount: number;
  currency: string;
  sub_total?: number;
  tax_amount?: number;
  discount_amount?: number;
  amount_due?: number;
  amount_paid?: number;
  fx_amount?: number;
  fx_currency?: string;
  fx_rate?: number;
  type?: OrderType;
  product?: string | CreemProduct;
  customer?: string | CreemCustomer;
  transaction?: string | CreemTransaction;
  discount?: string | CreemDiscount;
  affiliate?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreemLicenseKey {
  id: string;
  key: string;
  status?: LicenseStatus;
  activation_limit?: number;
  activation_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreemLicenseInstance {
  id: string;
  instance_name?: string;
  status?: LicenseStatus;
  activated_at?: string;
}

export interface CreemSubscriptionItem {
  id: string;
  product: string | CreemProduct;
  price?: number;
  currency?: string;
  quantity?: number;
  created_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CreemCheckoutOptions {
  product_id: string;
  request_id?: string;
  units?: number;
  discount_code?: string;
  customer?: {
    id?: string;
    email?: string;
  };
  custom_fields?: CreemCustomFieldRequest[];
  success_url?: string;
  metadata?: Record<string, string>;
}

export interface CreemCheckoutSession {
  id: string;
  object: 'checkout';
  mode: CreemMode;
  status: CheckoutStatus;
  checkout_url: string;
  success_url?: string;
  product?: string | CreemProduct;
  customer?: string | CreemCustomer;
  order?: CreemOrder;
  subscription?: string | CreemSubscription;
  custom_fields?: CreemCustomFieldResponse[];
  license_keys?: CreemLicenseKey[];
  metadata?: Record<string, string>;
  request_id?: string;
  units?: number;
  created_at?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export interface CreemSubscription {
  id: string;
  object: 'subscription';
  mode?: CreemMode;
  status: SubscriptionStatus;
  product: string | CreemProduct;
  customer: string | CreemCustomer;
  items?: CreemSubscriptionItem[];
  collection_method?: 'charge_automatically';
  last_transaction_id?: string;
  last_transaction?: string | CreemTransaction;
  last_transaction_date?: string;
  next_transaction_date?: string;
  current_period_start_date?: string;
  current_period_end_date?: string;
  canceled_at?: string;
  discount?: string | CreemDiscount;
  units?: number;
  metadata?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface CreemCancelSubscriptionOptions {
  mode?: 'immediate' | 'scheduled';
  onExecute?: 'cancel' | 'pause';
}

export interface CreemUpdateSubscriptionOptions {
  items: Array<{ id: string; units: number }>;
  update_behavior?: UpdateBehavior;
}

export interface CreemUpgradeSubscriptionOptions {
  product_id: string;
  update_behavior?: UpdateBehavior;
}

// ---------------------------------------------------------------------------
// License management
// ---------------------------------------------------------------------------

export interface CreemActivateLicenseOptions {
  key: string;
  instance_name: string;
}

export interface CreemValidateLicenseOptions {
  key: string;
  instance_id: string;
}

export interface CreemDeactivateLicenseOptions {
  key: string;
  instance_id: string;
}

export interface CreemLicenseActivationResult {
  instance: CreemLicenseInstance;
  license: CreemLicenseKey;
}

export interface CreemLicenseValidationResult {
  status: LicenseStatus;
  instance: CreemLicenseInstance;
  license: CreemLicenseKey;
}

// ---------------------------------------------------------------------------
// Customer portal
// ---------------------------------------------------------------------------

export interface CreemBillingPortalResult {
  customer_portal_link: string;
}

// ---------------------------------------------------------------------------
// Discount management
// ---------------------------------------------------------------------------

export interface CreemCreateDiscountOptions {
  name: string;
  code?: string;
  type: 'percentage' | 'fixed';
  /** Percentage discount (1-100). Required when type is 'percentage'. */
  percentage?: number;
  /** Fixed amount in cents. Required when type is 'fixed'. */
  amount?: number;
  currency?: string;
  duration?: 'once' | 'repeating' | 'forever';
  duration_in_months?: number;
  max_redemptions?: number;
  applies_to_products?: string[];
}

// ---------------------------------------------------------------------------
// Product management
// ---------------------------------------------------------------------------

export interface CreemCreateProductOptions {
  name: string;
  description?: string;
  price: number;
  currency: string;
  billing_type: BillingType;
  billing_period?: BillingPeriod;
  image_url?: string;
  tax_mode?: TaxMode;
  tax_category?: string;
  product_url?: string;
  default_success_url?: string;
  features?: CreemProductFeature[];
  custom_fields?: CreemCustomFieldRequest[];
}

// ---------------------------------------------------------------------------
// Webhook events
// ---------------------------------------------------------------------------

export type CreemWebhookEventType =
  | 'checkout.completed'
  | 'subscription.active'
  | 'subscription.paid'
  | 'subscription.canceled'
  | 'subscription.scheduled_cancel'
  | 'subscription.past_due'
  | 'subscription.expired'
  | 'subscription.trialing'
  | 'subscription.paused'
  | 'subscription.update'
  | 'refund.created'
  | 'dispute.created';

export interface CreemWebhookEvent<T = unknown> {
  id: string;
  eventType: CreemWebhookEventType;
  object: T;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface CreemPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export interface CreemError {
  code: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Checkout result (local — used by the browser launch flow)
// ---------------------------------------------------------------------------

export interface CheckoutResult {
  status: CheckoutStatus | 'canceled';
  sessionId?: string;
  error?: CreemError;
}

// ---------------------------------------------------------------------------
// Hook option types
// ---------------------------------------------------------------------------

export type CheckoutCompleteCallback = (session: CreemCheckoutSession) => void;
export type CheckoutCancelCallback = () => void;
export type CheckoutErrorCallback = (error: CreemError) => void;

export interface UseCreemCheckoutOptions extends CreemCheckoutOptions {
  onComplete?: CheckoutCompleteCallback;
  onCancel?: CheckoutCancelCallback;
  onError?: CheckoutErrorCallback;
  /** How to present the browser. Defaults to 'browser' (expo-web-browser). */
  presentationStyle?: 'browser';
  /** Auto-close delay in ms after checkout completes. Default: 0. */
  autoCloseDelay?: number;
}

export interface UseCreemSubscriptionOptions {
  /** Poll the API every N milliseconds. 0 = no polling. */
  pollInterval?: number;
  onStatusChange?: (status: SubscriptionStatus) => void;
  /** Enable/disable the subscription fetch. Default: true. */
  enabled?: boolean;
}

export interface UseCreemProductsOptions {
  /** Page number. Default: 1. */
  page?: number;
  /** Items per page. Default: 10. */
  pageSize?: number;
  /** Enable/disable fetching. Default: true. */
  enabled?: boolean;
  /** Poll interval in ms. 0 = no polling. */
  pollInterval?: number;
}

export interface UseCreemLicenseOptions {
  /** Enable/disable the license fetch. Default: true. */
  enabled?: boolean;
  /** Poll interval in ms. 0 = no polling. */
  pollInterval?: number;
  onStatusChange?: (status: LicenseStatus) => void;
}
