// ---------------------------------------------------------------------------
// Core config
// ---------------------------------------------------------------------------

export type CreemEnvironment = 'production' | 'sandbox';

export interface CreemConfig {
  apiKey: string;
  environment?: CreemEnvironment;
  /** Override the base URL (e.g. for proxying through your own backend). */
  baseUrl?: string;
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
  | 'paused'
  | 'trialing'
  | 'scheduled_cancel';

/** Billing type for products. */
export type BillingType = 'one_time' | 'recurring';

/** Billing period for recurring products. */
export type BillingPeriod = 'day' | 'week' | 'month' | 'year';

/** Product status. */
export type ProductStatus = 'active' | 'archived';

/** Tax mode. */
export type TaxMode = 'inclusive' | 'exclusive';

/** Order type. */
export type OrderType = 'checkout' | 'renewal' | 'upgrade' | 'downgrade';

// ---------------------------------------------------------------------------
// Custom fields (request & response)
// ---------------------------------------------------------------------------

/**
 * Custom field as sent in a checkout creation request.
 * Source: Creem API — CustomFieldRequestEntity
 */
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

/**
 * Custom field as returned in a checkout response.
 * Source: Creem API — CustomFieldResponseEntity
 */
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

/**
 * Customer entity returned by the Creem API.
 * Source: Creem API — CustomerEntity
 */
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

/**
 * Product feature entry.
 */
export interface CreemProductFeature {
  name: string;
  slug?: string;
}

/**
 * Product entity returned by the Creem API.
 * Source: Creem API — ProductEntity
 */
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

/**
 * Discount entity returned by the Creem API.
 * Source: Creem API — DiscountEntity
 */
export interface CreemDiscount {
  id: string;
  mode?: CreemMode;
  object?: 'discount';
  code?: string;
  type?: 'percentage' | 'fixed';
  amount?: number;
  duration?: 'once' | 'repeating' | 'forever';
  duration_in_months?: number;
  max_redemptions?: number;
  times_redeemed?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Transaction entity returned by the Creem API.
 * Source: Creem API — TransactionEntity
 */
export interface CreemTransaction {
  id: string;
  mode?: CreemMode;
  object?: 'transaction';
  status?: string;
  amount?: number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Order entity returned by the Creem API.
 * Source: Creem API — OrderEntity
 */
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

/**
 * License key entity returned in checkout responses.
 * Source: Creem API — LicenseKeyEntity
 */
export interface CreemLicenseKey {
  id: string;
  key: string;
  status?: string;
  activation_limit?: number;
  activation_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Subscription item entity.
 * Source: Creem API — SubscriptionItemEntity
 */
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

/**
 * Request body for POST /v1/checkouts.
 * All field names are snake_case as required by the Creem API.
 */
export interface CreemCheckoutOptions {
  /** Required. The product to check out. */
  product_id: string;
  /** Optional idempotency key. */
  request_id?: string;
  /** Number of units (quantity). */
  units?: number;
  /** Pre-fill a discount code. */
  discount_code?: string;
  /** Pre-fill customer info. Pass either id or email. */
  customer?: {
    id?: string;
    email?: string;
  };
  /**
   * Custom fields to attach to the checkout.
   * Each entry defines a text or checkbox field the customer fills out.
   */
  custom_fields?: CreemCustomFieldRequest[];
  /** URL to redirect to on success. */
  success_url?: string;
  /** Arbitrary metadata. */
  metadata?: Record<string, string>;
}

/**
 * Response from POST /v1/checkouts or GET /v1/checkouts?checkout_id=xxx.
 * Matches the Creem API CheckoutEntity shape.
 *
 * Note: `product`, `customer`, and `subscription` may be returned as either
 * a string ID or a full entity object depending on the API expand behaviour.
 */
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

/**
 * Response from GET /v1/subscriptions?subscription_id=xxx or
 * POST /v1/subscriptions/{id}/cancel.
 * Matches the Creem API SubscriptionEntity shape.
 *
 * Note: `product` and `customer` may be returned as either a string ID or a
 * full entity object depending on the API expand behaviour.
 */
export interface CreemSubscription {
  id: string;
  object: 'subscription';
  mode?: CreemMode;
  status: SubscriptionStatus;
  /** May be a string ID or the full product entity. */
  product: string | CreemProduct;
  /** May be a string ID or the full customer entity. */
  customer: string | CreemCustomer;
  /** Subscription line items. */
  items?: CreemSubscriptionItem[];
  /** How the subscription is billed. */
  collection_method?: 'charge_automatically';
  /** ID of the most recent transaction. */
  last_transaction_id?: string;
  /** The most recent transaction entity (when expanded). */
  last_transaction?: string | CreemTransaction;
  /** ISO-8601 date of the most recent transaction. */
  last_transaction_date?: string;
  /** ISO-8601 date of the next upcoming transaction. */
  next_transaction_date?: string;
  /** ISO-8601 date string */
  current_period_start_date?: string;
  /** ISO-8601 date string */
  current_period_end_date?: string;
  /** ISO-8601 date string — present when the subscription has been canceled */
  canceled_at?: string;
  /** Discount applied to this subscription. */
  discount?: string | CreemDiscount;
  units?: number;
  metadata?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Request body for POST /v1/subscriptions/{id}/cancel.
 */
export interface CreemCancelSubscriptionOptions {
  /** 'immediate' cancels right away; 'scheduled' cancels at period end. */
  mode?: 'immediate' | 'scheduled';
  /** What to do when the cancellation executes. */
  onExecute?: 'cancel' | 'pause';
}

// ---------------------------------------------------------------------------
// Webhook events
// ---------------------------------------------------------------------------

/** All known Creem webhook event types. */
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

/**
 * Webhook event payload envelope.
 */
export interface CreemWebhookEvent<T = unknown> {
  id: string;
  event_type: CreemWebhookEventType;
  data: T;
  created_at: string;
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
}

export interface UseCreemSubscriptionOptions {
  /** Poll the API every N milliseconds. 0 = no polling. */
  pollInterval?: number;
  onStatusChange?: (status: SubscriptionStatus) => void;
}
