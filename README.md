# expo-creem

Creem payment integration for Expo apps. Launch checkout sessions, manage subscriptions, and handle deep-link callbacks — all without ejecting or writing native code.

## Features

- **Checkout Sessions** — open the Creem-hosted checkout via `expo-web-browser` and receive the result via deep link
- **Subscription Management** — fetch status and cancel subscriptions
- **React Hooks** — `useCreemCheckout`, `useCreemCheckoutWithDeeplink`, `useCreemSubscription`
- **Pre-built Components** — `<CreemCheckoutButton>`, `<SubscriptionStatus>`, `<SubscriptionBadge>`
- **Expo Config Plugin** — zero-config URL scheme setup via `expo prebuild`
- **Server-side Helpers** — Node.js / Edge-compatible client for your backend
- **TypeScript First** — all types match the Creem OpenAPI spec exactly
- **Cross-platform** — iOS, Android, and Expo Web

## Requirements

- Expo SDK 52+
- Node.js 18+
- A Creem account ([creem.io](https://creem.io))

## Installation

```bash
npm install expo-creem expo-web-browser expo-linking
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

---

## Usage

### Launch a checkout with the pre-built button

```tsx
import { CreemCheckoutButton } from 'expo-creem';

<CreemCheckoutButton
  options={{
    product_id: 'prod_xxx',
    success_url: 'myapp://creem/success',
    customer: { email: 'user@example.com' }, // optional
  }}
  title="Subscribe Now"
  loadingTitle="Opening checkout…"
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
      title={status === 'loading' ? 'Loading…' : 'Subscribe'}
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
import { SubscriptionStatus } from 'expo-creem';

<SubscriptionStatus
  subscriptionId="sub_xxx"
  showDetails
  pollInterval={30_000}       // optional: re-fetch every 30 s
  onStatusChange={(s) => console.log('Status changed:', s)}
  renderActive={(sub) => (
    <Text>Active — renews {new Date(sub.current_period_end_date).toLocaleDateString()}</Text>
  )}
  renderInactive={() => <Text>No active subscription</Text>}
/>
```

### Fetch and cancel a subscription with the hook

```tsx
import { useCreemSubscription } from 'expo-creem';

const { subscription, status, isLoading, cancelSubscription } =
  useCreemSubscription('sub_xxx');

// Cancel at end of billing period:
await cancelSubscription({ mode: 'scheduled', onExecute: 'cancel' });

// Cancel immediately:
await cancelSubscription({ mode: 'immediate' });
```

---

## API Reference

### `<CreemProvider>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | **required** | Your Creem API key |
| `environment` | `'production' \| 'sandbox'` | `'production'` | Which API environment to use |
| `baseUrl` | `string` | — | Override the base URL (e.g. proxy through your own backend) |

### `useCreemCheckout(options)` / `useCreemCheckoutWithDeeplink(options)`

**Options** (all Creem API fields are snake_case):

| Field | Type | Description |
|---|---|---|
| `product_id` | `string` | **Required.** The Creem product ID |
| `customer` | `{ id?: string; email?: string }` | Pre-fill customer info |
| `units` | `number` | Quantity |
| `discount_code` | `string` | Pre-fill a discount code |
| `success_url` | `string` | Deep-link URL to redirect to on success |
| `request_id` | `string` | Idempotency key |
| `metadata` | `Record<string, string>` | Arbitrary metadata |
| `custom_fields` | `CreemCustomFieldRequest[]` | Custom field definitions (text/checkbox) for the checkout |
| `onComplete` | `(session) => void` | Called after a successful checkout |
| `onCancel` | `() => void` | Called when the user cancels |
| `onError` | `(error) => void` | Called on error |

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

### `useCreemSubscription(subscriptionId, options?)`

| Option | Type | Description |
|---|---|---|
| `pollInterval` | `number` | Re-fetch every N ms. `0` = no polling |
| `onStatusChange` | `(status) => void` | Fires when the status changes |

**Return value:**

```ts
{
  subscription: CreemSubscription | null;
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: CreemError | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  cancelSubscription: (options?: CreemCancelSubscriptionOptions) => Promise<void>;
}
```

### Types

```ts
// Checkout statuses (from Creem API)
type CheckoutStatus = 'pending' | 'processing' | 'completed' | 'expired';

// Subscription statuses (from Creem API)
type SubscriptionStatus =
  | 'active' | 'canceled' | 'unpaid'
  | 'paused' | 'trialing' | 'scheduled_cancel';

// Cancel options
interface CreemCancelSubscriptionOptions {
  mode?: 'immediate' | 'scheduled';
  onExecute?: 'cancel' | 'pause';
}
```

---

## Server-side Usage

Use `CreemServerClient` in your Node.js / Edge backend to create checkout sessions without exposing your API key to clients.

```ts
import { CreemServerClient } from 'expo-creem/server';
// or: import { CreemServerClient } from 'expo-creem';

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

// Retrieve a checkout session
const checkout = await creem.getCheckoutSession('chk_xxx');

// Retrieve a subscription
const subscription = await creem.getSubscription('sub_xxx');

// Cancel a subscription at period end
await creem.cancelSubscription('sub_xxx', { mode: 'scheduled', onExecute: 'cancel' });
```

### Webhook verification

```ts
import { validateWebhookSignature, parseWebhookEvent } from 'expo-creem/server';

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

## Platform Support

| Platform | Support |
|---|---|
| iOS | Full |
| Android | Full |
| Web | Full |

## License

MIT
