# Creem Expo Module - Technical Specification

## Project Overview
- **Project Name**: expo-creem
- **Version**: 2.0.0
- **Type**: React Native Expo Module (JSI)
- **Core Functionality**: Integrate Creem payment checkout and subscription management into Expo-managed apps
- **Target Users**: React Native/Expo developers needing payment integration
- **Merchant of Record**: Creem handles global tax compliance, payment processing, and billing

## Architecture

### Module Structure
```
expo-creem/
├── src/
│   ├── types/             # 25+ TypeScript interfaces
│   ├── hooks/             # 6 React hooks
│   │   ├── useCreemCheckout.ts
│   │   ├── useCreemSubscription.ts
│   │   ├── useCreemProducts.ts
│   │   ├── useCreemLicense.ts
│   │   └── useCreemCustomerPortal.ts
│   ├── components/        # 3 UI components
│   │   ├── CreemCheckoutButton.tsx
│   │   └── SubscriptionStatus.tsx
│   ├── utils/             # Client + helpers
│   │   ├── client.ts      # CreemClient with retry logic
│   │   └── context.tsx    # Provider + formatting helpers
│   ├── server/            # Server-side helpers
│   │   └── creem-server.ts
│   ├── launcher.ts        # Browser launch logic
│   └── index.ts           # Barrel exports
├── plugin/
│   └── index.js           # Expo config plugin (pure JS)
├── example/
│   └── App.tsx            # Full demo app
└── app.plugin.js          # Plugin entry point
```

### Core Approach
- **Zero native code**: Uses expo-web-browser for checkout flow
- **Deep linking**: Uses expo-linking for callback handling
- **Server-side**: Node.js/Edge helpers for creating checkout sessions securely
- **Retry logic**: Built-in exponential backoff for all API calls
- **Performance**: React.memo, useMemo, useCallback throughout; proper cleanup in all effects

## Functionality Specification

### 1. Checkout Session Management
- `createCheckoutSession(config)` — Creates a checkout session via Creem API
- `launchCheckout(session, redirectUrl)` — Opens checkout in web browser
- `launchCheckoutSession(params)` — Lower-level launch with timeout
- Handles success/cancel/error callbacks via deep links
- `buildCallbackUrl(path, params)` — Build deep-link callback URLs
- `parseCallbackUrl(url)` — Parse deep-link results

### 2. Subscription Management (Full Lifecycle)
- `getSubscription(subscriptionId)` — Fetch subscription details
- `cancelSubscription(subscriptionId, options)` — Cancel (immediate or scheduled)
- `updateSubscription(subscriptionId, options)` — Update seat count/units
- `upgradeSubscription(subscriptionId, options)` — Change product plan
- `pauseSubscription(subscriptionId)` — Pause subscription
- `resumeSubscription(subscriptionId)` — Resume paused subscription

### 3. License Key Management
- `activateLicense(options)` — Activate a license key with instance name
- `validateLicense(options)` — Validate license on app startup
- `deactivateLicense(options)` — Deactivate when switching devices

### 4. Customer Portal
- `generateCustomerPortalLink(customerId)` — Get billing portal URL
- `openPortal()` — Open in-app browser with portal

### 5. Products & Discounts
- `getProduct(productId)` — Fetch product details
- `searchProducts(page, pageSize)` — Paginated product listing
- `createProduct(options)` — Create a new product
- `getDiscount(discountId)` / `getDiscountByCode(code)` — Retrieve discounts
- `createDiscount(options)` — Create a discount code
- `deleteDiscount(discountId)` — Delete a discount

### 6. Transactions
- `getTransaction(transactionId)` — Fetch transaction details
- `searchTransactions(filters)` — Search transactions with filters

### 7. React Hooks
- `useCreemCheckout(options)` — Full checkout flow (browser-blocking)
- `useCreemCheckoutWithDeeplink(options)` — Deep-link-driven checkout flow
- `useCreemSubscription(subscriptionId, options?)` — Full subscription lifecycle
- `useCreemProducts(options?)` — Product listing with pagination
- `useCreemLicense()` — License key management
- `useCreemCustomerPortal(customerId)` — Customer portal access

### 8. Components
- `<CreemProvider>` — Context provider with retry configuration
- `<CreemCheckoutButton>` — Pre-styled button (3 variants, 3 sizes, React.memo)
- `<SubscriptionStatus>` — Display status with 7 custom renderers
- `<SubscriptionBadge>` — Compact status indicator

### 9. Server-side Helpers
- `CreemServerClient` — Full API client for Node.js/Edge
- `CreemServerClient.sandbox()` — Factory for test environment
- `validateWebhookSignature(payload, signature, secret)` — HMAC-SHA256 verification
- `parseWebhookEvent(payload)` — Typed webhook parsing
- `processWebhookEvent(event, handlers, defaultHandler?)` — Typed event routing

### 10. Utility Helpers
- `formatPrice(cents, currency, locale?)` — Currency formatting
- `formatDate(isoDate, locale?, options?)` — Date formatting
- `formatBillingPeriod(period, billingType)` — Billing period labels
- `formatRelativeTime(isoDate)` — Relative time strings
- `getSubscriptionStatusLabel(status)` — Human-readable status labels
- `isSubscriptionActive(status)` — Boolean check for active state

### 11. Deep Link Configuration
- Success URL: `{your-app}://creem/success?checkout_id={id}`
- Cancel URL: `{your-app}://creem/cancel`
- Callback URL: `{your-app}://creem/callback`
- Webhook handlers for server-side verification

### 12. Expo Config Plugin
- iOS: URL scheme registration in Info.plist
- Android: Intent filter for deep links in AndroidManifest.xml
- Idempotent — safe to run multiple times

## Creem API Integration

### All Endpoints Covered
| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/checkouts` | Create checkout session |
| GET | `/v1/checkouts?checkout_id=` | Retrieve checkout session |
| GET | `/v1/subscriptions?subscription_id=` | Get subscription |
| POST | `/v1/subscriptions/{id}/cancel` | Cancel subscription |
| POST | `/v1/subscriptions/{id}` | Update subscription |
| POST | `/v1/subscriptions/{id}/upgrade` | Upgrade subscription |
| POST | `/v1/subscriptions/{id}/pause` | Pause subscription |
| POST | `/v1/subscriptions/{id}/resume` | Resume subscription |
| GET | `/v1/products?product_id=` | Get product |
| GET | `/v1/products/search` | Search products |
| POST | `/v1/products` | Create product |
| GET | `/v1/customers?customer_id=` | Get customer |
| GET | `/v1/customers?email=` | Get customer by email |
| GET | `/v1/customers/list` | List customers |
| POST | `/v1/customers/billing` | Generate portal link |
| POST | `/v1/licenses/activate` | Activate license |
| POST | `/v1/licenses/validate` | Validate license |
| POST | `/v1/licenses/deactivate` | Deactivate license |
| GET | `/v1/discounts?discount_id=` | Get discount |
| GET | `/v1/discounts?discount_code=` | Get discount by code |
| POST | `/v1/discounts` | Create discount |
| DELETE | `/v1/discounts/{id}/delete` | Delete discount |
| GET | `/v1/transactions?transaction_id=` | Get transaction |
| GET | `/v1/transactions/search` | Search transactions |

### Checkout Flow
1. Client calls server endpoint to create checkout
2. Server returns checkout URL
3. Client opens URL via expo-web-browser
4. User completes payment on Creem-hosted page
5. Creem redirects to success/cancel URL
6. App handles deep link and updates UI

## Type Definitions (Full)

```typescript
type CreemEnvironment = 'production' | 'sandbox';
type CreemMode = 'test' | 'prod' | 'sandbox';
type CheckoutStatus = 'pending' | 'processing' | 'completed' | 'expired';
type SubscriptionStatus = 'active' | 'canceled' | 'unpaid' | 'past_due' | 'paused' | 'trialing' | 'scheduled_cancel';
type LicenseStatus = 'active' | 'inactive' | 'expired' | 'disabled';
type BillingType = 'one_time' | 'recurring';
type BillingPeriod = 'day' | 'week' | 'month' | 'year';
type UpdateBehavior = 'proration-charge-immediately' | 'proration-charge' | 'proration-none';
type CreemWebhookEventType = 'checkout.completed' | 'subscription.active' | 'subscription.paid' | 'subscription.canceled' | 'subscription.scheduled_cancel' | 'subscription.past_due' | 'subscription.expired' | 'subscription.trialing' | 'subscription.paused' | 'subscription.update' | 'refund.created' | 'dispute.created';
```

## Platform Support
- iOS: Full support via SFSafariViewController
- Android: Full support via Chrome Custom Tabs
- Web: Full support via redirect flow

## Performance Optimizations
- `React.memo` on all exported components
- `useMemo` for expensive computations (styles, config)
- `useCallback` for all event handlers
- Ref-based callback pattern to avoid stale closures
- Proper cleanup in all useEffect (refs for mounted state, interval cleanup)
- `enabled` option on all fetch hooks to avoid unnecessary requests
- Exponential backoff retry logic on all API calls

## Error Handling
- Network errors with automatic retry (exponential backoff)
- Invalid API key errors
- Payment cancelled by user
- Webhook verification failures (constant-time comparison)
- All hooks return typed error state
- Custom error renderers on all components
- Safe parsing with try-catch on all JSON operations

## Example App Features
- Checkout with pre-built button
- Checkout with custom hook
- Multiple button variants (primary, outline)
- Subscription status with custom renderers for all states
- Subscription badge
- Customer portal access
- License management demo
- Deep link configuration display
- Environment-based configuration
