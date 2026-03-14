# Creem Expo Module - Technical Specification

## Project Overview
- **Project Name**: expo-creem
- **Type**: React Native Expo Module (TurboModule)
- **Core Functionality**: Integrate Creem payment checkout and subscription management into Expo-managed apps
- **Target Users**: React Native/Expo developers needing payment integration

## Architecture

### Module Structure
```
expo-creem/
├── src/
│   ├── types/           # TypeScript definitions
│   ├── hooks/           # React hooks
│   ├── components/      # UI components
│   ├── utils/           # Helper functions
│   └── server/          # Server-side helpers
├── android/             # Android native module (minimal)
├── ios/                 # iOS native module (minimal)
└── expo-module/         # Expo module config
```

### Core Approach
- **Zero native code**: Uses expo-web-browser for checkout flow
- **Deep linking**: Uses expo-linking for callback handling
- **WebView fallback**: expo-webview for modal checkout experience
- **Server-side**: Node.js helpers for creating checkout sessions securely

## Functionality Specification

### 1. Checkout Session Management
- `createCheckoutSession(config)` - Creates a checkout session via Creem API
- `launchCheckout(sessionId, options)` - Opens checkout in web browser/WebView
- Handles success/cancel/error callbacks via deep links

### 2. Subscription Management
- `getSubscription(subscriptionId)` - Fetch subscription details
- `cancelSubscription(subscriptionId)` - Cancel active subscription
- `getSubscriptionStatus(subscriptionId)` - Check if subscription is active

### 3. React Hooks
- `useCreemCheckout(options)` - Full checkout flow hook
- `useCreemSubscription(subscriptionId)` - Subscription status hook

### 4. Components
- `<CreemProvider>` - Context provider for Creem config
- `<CreemCheckoutButton>` - Pre-styled checkout button
- `<SubscriptionStatus>` - Display subscription status

### 5. Deep Link Configuration
- Success URL: `{your-app}://creem/success?session_id={id}`
- Cancel URL: `{your-app}://creem/cancel`
- Webhook handlers for server-side verification

## Creem API Integration

### Endpoints
- POST `/v1/checkout` - Create checkout session
- GET `/v1/subscriptions/{id}` - Get subscription
- POST `/v1/subscriptions/{id}/cancel` - Cancel subscription

### Checkout Flow
1. Client calls server endpoint to create checkout
2. Server returns checkout URL
3. Client opens URL via expo-web-browser
4. User completes payment
5. Creem redirects to success/cancel URL
6. App handles deep link and updates UI

## Type Definitions

```typescript
// Core types
interface CreemConfig {
  apiKey: string;
  baseUrl?: string;
}

interface CheckoutSession {
  id: string;
  url: string;
  customerEmail?: string;
}

interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface CheckoutOptions {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  customData?: Record<string, string>;
}
```

## Platform Support
- iOS: ✅ Full support via SFSafariViewController
- Android: ✅ Full support via Chrome Custom Tabs
- Web: ✅ Full support via redirect flow

## Error Handling
- Network errors with retry suggestions
- Invalid API key errors
- Payment cancelled by user
- Webhook verification failures

## Example App
- Demo checkout flow
- Subscription management UI
- Proper deep link configuration
