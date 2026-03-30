# expo-creem

Creem payment integration for Expo apps. Launch checkout sessions, manage subscriptions, handle licenses, open customer portals, and handle deep-link callbacks — all without ejecting or writing native code.

[![npm version](https://img.shields.io/npm/v/expo-creem)](https://www.npmjs.com/package/expo-creem)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-52%2B-blue)](https://docs.expo.dev/)

## Features

- **Checkout Sessions** — open the Creem-hosted checkout via `expo-web-browser` and receive the result via deep link
- **Subscription Management** — fetch, cancel, update, upgrade, pause, and resume subscriptions
- **License Key Management** — activate, validate, and deactivate software licenses
- **Customer Portal** — open the Creem billing portal for customers to manage payment methods
- **Products & Discounts** — search products, retrieve discounts
- **React Hooks** — `useCreemCheckout`, `useCreemCheckoutWithDeeplink`, `useCreemSubscription`, `useCreemProducts`, `useCreemLicense`, `useCreemCustomerPortal`
- **Pre-built Components** — `<CreemCheckoutButton>`, `<SubscriptionStatus>`, `<SubscriptionBadge>`
- **Expo Config Plugin** — zero-config URL scheme setup via `expo prebuild`
- **Server-side Helpers** — Node.js / Edge-compatible client for your backend with retry logic
- **Webhook Support** — signature verification and typed event handlers
- **Utility Helpers** — `formatPrice`, `formatDate`, `formatBillingPeriod`, `formatRelativeTime`, `isSubscriptionActive`
- **TypeScript First** — all types match the Creem OpenAPI spec exactly
- **Cross-platform** — iOS, Android, and Expo Web
- **Retry Logic** — built-in exponential backoff for resilient API calls
- **Performance** — `React.memo`, `useMemo`, `useCallback` throughout; cleanup in all effects

## Requirements

- Expo SDK 52+
- Node.js 18+
- A Creem account ([creem.io](https://creem.io))

## Installation

```bash
npx expo install expo-creem expo-web-browser expo-linking
```

## Setup

### 1. Add the config plugin

In `app.json` / `app.config.js`, add `expo-creem` to the `plugins` array. The plugin automatically registers your URL scheme on iOS and Android so deep links from the Creem checkout page reach your app.

```json
{
  "expo": {
    "scheme": "myapp",
    "plugins": [
      ["expo-creem", { "scheme": "myapp" }]
    ]
  }
}
```

Then run `expo prebuild` to apply the native changes.

> **Note**: If you omit the `scheme` option, the plugin reads the top-level `expo.scheme` field automatically.

### 2. Wrap your app with `<CreemProvider>`

```tsx
import { CreemProvider } from 'expo-creem';

export default function App() {
  return (
    <CreemProvider apiKey="YOUR_API_KEY" environment="sandbox">
      {/* your app */}
    </CreemProvider>
  );
}
```

Use `environment="sandbox"` for testing (points at `https://test-api.creem.io`) and `environment="production"` (or omit it) for live payments.

#### Provider Options

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | **required** | Your Creem API key |
| `environment` | `'production' \| 'sandbox'` | `'production'` | Which API environment to use |
| `baseUrl` | `string` | — | Override the base URL (e.g. proxy through your own backend) |
| `retries` | `number` | `2` | Number of retry attempts for failed requests |
| `retryDelay` | `number` | `300` | Base delay in ms for exponential backoff |

---

## Usage

### Launch a checkout with the pre-built button

```tsx
import { CreemCheckoutButton } from 'expo-creem';

<CreemCheckoutButton
  options={{
    product_id: 'prod_xxx',
    success_url: 'myapp://creem/success',
    customer: { email: 'user@example.com' },
  }}
  title="Subscribe Now"
  loadingTitle="Opening checkout..."
  variant="primary"  // 'primary' | 'secondary' | 'outline'
  size="large"       // 'small' | 'medium' | 'large'
/>
```

### Launch a checkout with the hook

```tsx
import { useCreemCheckout } from 'expo-creem';

function SubscribeButton() {
  const { status, error, startCheckout, reset } = useCreemCheckout({
    product_id: 'prod_xxx',
    success_url: 'myapp://creem/success',
    onComplete: (session) => console.log('Done', session.id),
    onCancel: () => console.log('Cancelled'),
    onError: (err) => console.error(err),
  });

  return (
    <Button
      onPress={startCheckout}
      disabled={status === 'loading'}
      title={status === 'loading' ? 'Loading...' : 'Subscribe'}
    />
  );
}
```

### Deep-link variant (for external routers)

`useCreemCheckoutWithDeeplink` opens the browser and then resolves via an incoming URL event rather than blocking. Useful with Expo Router or React Navigation.

```tsx
import { useCreemCheckoutWithDeeplink } from 'expo-creem';

const { startCheckout, status } = useCreemCheckoutWithDeeplink({
  product_id: 'prod_xxx',
  success_url: 'myapp://creem/success',
  onComplete: (session) => { /* ... */ },
});
```

### Show subscription status

```tsx
import { SubscriptionStatus, SubscriptionBadge } from 'expo-creem';

// Full status with custom renderers
<SubscriptionStatus
  subscriptionId="sub_xxx"
  showDetails
  pollInterval={30_000}
  onStatusChange={(s) => console.log('Status changed:', s)}
  renderActive={(sub) => (
    <Text>Active — renews {new Date(sub.current_period_end_date).toLocaleDateString()}</Text>
  )}
  renderTrialing={(sub) => <Text>Free trial active!</Text>}
  renderCanceling={(sub) => <Text>Subscription ending soon</Text>}
  renderPaused={() => <Text>Subscription paused</Text>}
  renderInactive={() => <Text>No active subscription</Text>}
/>

// Compact badge
<SubscriptionBadge subscriptionId="sub_xxx" pollInterval={30_000} />
```

### Manage subscriptions

```tsx
import { useCreemSubscription } from 'expo-creem';

const { subscription, status, isLoading, cancelSubscription, updateSubscription, upgradeSubscription, pauseSubscription, resumeSubscription } =
  useCreemSubscription('sub_xxx');

// Cancel at end of billing period:
await cancelSubscription({ mode: 'scheduled', onExecute: 'cancel' });

// Cancel immediately:
await cancelSubscription({ mode: 'immediate' });

// Update seat count:
await updateSubscription({
  items: [{ id: 'item_xxx', units: 5 }],
  update_behavior: 'proration-charge-immediately',
});

// Upgrade to a different product:
await upgradeSubscription({
  product_id: 'prod_premium',
  update_behavior: 'proration-charge-immediately',
});

// Pause/resume:
await pauseSubscription();
await resumeSubscription();
```

### Browse products

```tsx
import { useCreemProducts } from 'expo-creem';

const { products, isLoading, hasMore, loadMore, refetch } = useCreemProducts({
  page: 1,
  pageSize: 10,
});
```

### License key management

```tsx
import { useCreemLicense } from 'expo-creem';

const { license, status, isLoading, activate, validate, deactivate, reset } = useCreemLicense();

// Activate a license on first use:
await activate({ key: 'license_key_here', instance_name: 'my-macbook-pro' });

// Validate on app startup:
await validate({ key: 'license_key_here', instance_id: 'inst_xxx' });

// Deactivate when switching devices:
await deactivate({ key: 'license_key_here', instance_id: 'inst_xxx' });
```

### Customer portal

```tsx
import { useCreemCustomerPortal } from 'expo-creem';

const { openPortal, isLoading } = useCreemCustomerPortal('cust_xxx');

// Opens an in-app browser with the Creem billing portal:
await openPortal();
```

### Utility helpers

```tsx
import { formatPrice, formatDate, formatRelativeTime, isSubscriptionActive } from 'expo-creem';

formatPrice(1999, 'USD');           // "$19.99"
formatPrice(1999, 'EUR', 'de-DE');  // "19,99 €"
formatDate('2026-03-30T00:00:00Z'); // "Mar 30, 2026"
formatRelativeTime('2026-04-30T00:00:00Z'); // "in 31 days"
isSubscriptionActive('active');     // true
isSubscriptionActive('canceled');   // false
```

---

## API Reference

### Hooks

#### `useCreemCheckout(options)` / `useCreemCheckoutWithDeeplink(options)`

| Field | Type | Description |
|---|---|---|
| `product_id` | `string` | **Required.** The Creem product ID |
| `customer` | `{ id?: string; email?: string }` | Pre-fill customer info |
| `units` | `number` | Quantity |
| `discount_code` | `string` | Pre-fill a discount code |
| `success_url` | `string` | Deep-link URL to redirect to on success |
| `request_id` | `string` | Idempotency key |
| `metadata` | `Record<string, string>` | Arbitrary metadata |
| `custom_fields` | `CreemCustomFieldRequest[]` | Custom field definitions |
| `onComplete` | `(session) => void` | Called after a successful checkout |
| `onCancel` | `() => void` | Called when the user cancels |
| `onError` | `(error) => void` | Called on error |
| `autoCloseDelay` | `number` | Delay in ms before firing onComplete |

**Return value:**

```ts
{
  status: 'idle' | 'loading' | 'success' | 'canceled' | 'error';
  session: CreemCheckoutSession | null;
  error: CreemError | null;
  startCheckout: () => Promise<void>;
  reset: () => void;
}
```

#### `useCreemSubscription(subscriptionId, options?)`

| Option | Type | Description |
|---|---|---|
| `pollInterval` | `number` | Re-fetch every N ms. `0` = no polling |
| `onStatusChange` | `(status) => void` | Fires when the status changes |
| `enabled` | `boolean` | Enable/disable the fetch. Default: `true` |

**Return value:**

```ts
{
  subscription: CreemSubscription | null;
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: CreemError | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  cancelSubscription: (options?) => Promise<void>;
  updateSubscription: (options) => Promise<void>;
  upgradeSubscription: (options) => Promise<void>;
  pauseSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
}
```

#### `useCreemProducts(options?)`

| Option | Type | Description |
|---|---|---|
| `page` | `number` | Page number. Default: `1` |
| `pageSize` | `number` | Items per page. Default: `10` |
| `enabled` | `boolean` | Enable/disable fetching. Default: `true` |
| `pollInterval` | `number` | Poll interval in ms. Default: `0` |

**Return value:**

```ts
{
  products: CreemProduct[];
  total: number;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: CreemError | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}
```

#### `useCreemLicense()`

**Return value:**

```ts
{
  license: CreemLicenseKey | null;
  instance: CreemLicenseInstance | null;
  status: 'active' | 'inactive' | 'expired' | 'disabled' | null;
  isLoading: boolean;
  error: CreemError | null;
  activate: (options: CreemActivateLicenseOptions) => Promise<void>;
  validate: (options: CreemValidateLicenseOptions) => Promise<void>;
  deactivate: (options: CreemDeactivateLicenseOptions) => Promise<void>;
  reset: () => void;
}
```

#### `useCreemCustomerPortal(customerId)`

**Return value:**

```ts
{
  portalUrl: string | null;
  isLoading: boolean;
  error: CreemError | null;
  openPortal: () => Promise<void>;
  generatePortalUrl: () => Promise<string | null>;
  reset: () => void;
}
```

### Components

#### `<CreemProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | **required** | Your Creem API key |
| `environment` | `'production' \| 'sandbox'` | `'production'` | API environment |
| `baseUrl` | `string` | — | Override base URL |
| `retries` | `number` | `2` | Retry count |
| `retryDelay` | `number` | `300` | Retry backoff base (ms) |

#### `<CreemCheckoutButton>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `UseCreemCheckoutOptions` | **required** | Checkout options |
| `title` | `string` | `'Subscribe'` | Button label |
| `loadingTitle` | `string` | — | Label shown while loading |
| `disabled` | `boolean` | `false` | Disable the button |
| `variant` | `'primary' \| 'secondary' \| 'outline'` | `'primary'` | Visual style |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Button size |
| `style` | `ViewStyle` | — | Custom container style |
| `textStyle` | `TextStyle` | — | Custom text style |

#### `<SubscriptionStatus>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `subscriptionId` | `string \| null` | **required** | Subscription ID |
| `pollInterval` | `number` | `0` | Poll interval (ms) |
| `showDetails` | `boolean` | `false` | Show renewal/cancel dates |
| `onStatusChange` | `(status) => void` | — | Status change callback |
| `renderLoading` | `() => ReactNode` | — | Custom loading renderer |
| `renderError` | `(error) => ReactNode` | — | Custom error renderer |
| `renderInactive` | `() => ReactNode` | — | Custom inactive renderer |
| `renderActive` | `(sub) => ReactNode` | — | Custom active renderer |
| `renderTrialing` | `(sub) => ReactNode` | — | Custom trial renderer |
| `renderCanceling` | `(sub) => ReactNode` | — | Custom canceling renderer |
| `renderPaused` | `(sub) => ReactNode` | — | Custom paused renderer |

#### `<SubscriptionBadge>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `subscriptionId` | `string \| null` | **required** | Subscription ID |
| `pollInterval` | `number` | `0` | Poll interval (ms) |
| `showLabel` | `boolean` | `true` | Show text label |

### Types

```ts
type CheckoutStatus = 'pending' | 'processing' | 'completed' | 'expired';
type SubscriptionStatus = 'active' | 'canceled' | 'unpaid' | 'past_due' | 'paused' | 'trialing' | 'scheduled_cancel';
type LicenseStatus = 'active' | 'inactive' | 'expired' | 'disabled';
type BillingType = 'one_time' | 'recurring';
type BillingPeriod = 'day' | 'week' | 'month' | 'year';
type UpdateBehavior = 'proration-charge-immediately' | 'proration-charge' | 'proration-none';

interface CreemCancelSubscriptionOptions {
  mode?: 'immediate' | 'scheduled';
  onExecute?: 'cancel' | 'pause';
}

interface CreemUpdateSubscriptionOptions {
  items: Array<{ id: string; units: number }>;
  update_behavior?: UpdateBehavior;
}

interface CreemUpgradeSubscriptionOptions {
  product_id: string;
  update_behavior?: UpdateBehavior;
}
```

---

## Server-side Usage

Use `CreemServerClient` in your Node.js / Edge backend to create checkout sessions without exposing your API key to clients.

```ts
import { CreemServerClient } from 'expo-creem/server';

const creem = new CreemServerClient({ apiKey: process.env.CREEM_API_KEY! });
// or for the test environment:
const creem = CreemServerClient.sandbox({ apiKey: process.env.CREEM_API_KEY! });

// Create a checkout session
const session = await creem.createCheckoutSession({
  product_id: 'prod_xxx',
  customer: { email: 'user@example.com' },
  success_url: 'https://yourapp.com/success',
  metadata: { userId: '42' },
});
console.log(session.checkout_url); // redirect the user here

// Full API coverage:
await creem.getSubscription('sub_xxx');
await creem.cancelSubscription('sub_xxx', { mode: 'scheduled' });
await creem.updateSubscription('sub_xxx', { items: [...] });
await creem.upgradeSubscription('sub_xxx', { product_id: 'prod_new' });
await creem.pauseSubscription('sub_xxx');
await creem.resumeSubscription('sub_xxx');
await creem.getProduct('prod_xxx');
await creem.searchProducts(1, 10);
await creem.createProduct({ name: 'Pro', price: 1999, currency: 'USD', billing_type: 'recurring' });
await creem.getCustomer('cust_xxx');
await creem.generateCustomerPortalLink('cust_xxx');
await creem.activateLicense({ key: 'xxx', instance_name: 'server-1' });
await creem.validateLicense({ key: 'xxx', instance_id: 'inst_xxx' });
await creem.deactivateLicense({ key: 'xxx', instance_id: 'inst_xxx' });
await creem.getDiscount('disc_xxx');
await creem.getDiscountByCode('SUMMER2024');
await creem.createDiscount({ name: 'Sale', code: 'SALE20', type: 'percentage', percentage: 20 });
await creem.deleteDiscount('disc_xxx');
await creem.getTransaction('txn_xxx');
await creem.searchTransactions('cust_xxx');
```

### Webhook verification

```ts
import { validateWebhookSignature, parseWebhookEvent, processWebhookEvent } from 'expo-creem/server';

// Express example
app.post('/webhooks/creem', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['creem-signature'] as string;
  const payload = req.body.toString();

  if (!validateWebhookSignature(payload, signature, process.env.CREEM_WEBHOOK_SECRET!)) {
    return res.status(400).send('Invalid signature');
  }

  const event = parseWebhookEvent(payload);
  // handle the event ...
  res.status(200).send('OK');
});

// Or use the typed handler system:
await processWebhookEvent(event, {
  'checkout.completed': async (data) => {
    console.log('Payment completed:', data);
  },
  'subscription.active': async (data) => {
    console.log('Subscription activated:', data);
  },
  'subscription.canceled': async (data) => {
    console.log('Subscription canceled:', data);
  },
}, (event) => {
  console.log('Unhandled event:', event.eventType);
});
```

---

## Environment Variables

```env
# Client (prefix with EXPO_PUBLIC_ to expose to the RN bundle)
EXPO_PUBLIC_CREEM_API_KEY=your_api_key
EXPO_PUBLIC_PRODUCT_ID=prod_xxx

# Server only
CREEM_API_KEY=your_api_key
CREEM_WEBHOOK_SECRET=your_webhook_secret
```

---

## Example App

```bash
cd example
npm install
npx expo start
```

---

## Architecture

```
expo-creem/
├── src/
│   ├── types/             # All TypeScript definitions (25+ interfaces)
│   ├── hooks/             # React hooks (6 hooks)
│   │   ├── useCreemCheckout.ts
│   │   ├── useCreemSubscription.ts
│   │   ├── useCreemProducts.ts
│   │   ├── useCreemLicense.ts
│   │   └── useCreemCustomerPortal.ts
│   ├── components/        # UI components
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
├── app.plugin.js          # Plugin entry point
└── package.json
```

---

## Platform Support

| Platform | Support |
|---|---|
| iOS | Full (SFSafariViewController via expo-web-browser) |
| Android | Full (Chrome Custom Tabs via expo-web-browser) |
| Web | Full (redirect flow) |

## License

MIT
