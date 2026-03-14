import * as WebBrowser from 'expo-web-browser';
import { addEventListener, parse } from 'expo-linking';
import {
  CreemCheckoutSession,
  CheckoutResult,
  CreemError,
} from './types';

export interface LaunchCheckoutParams {
  checkoutUrl: string;
  scheme: string;
}

export interface LaunchCheckoutResult {
  type: 'success' | 'cancel' | 'error';
  data?: {
    checkoutId?: string;
    orderId?: string;
    customerId?: string;
    productId?: string;
    url: string;
  };
  error?: CreemError;
}

export async function launchCheckoutSession(
  params: LaunchCheckoutParams
): Promise<LaunchCheckoutResult> {
  const { checkoutUrl, scheme } = params;
  const redirectUrl = `${scheme}://`;

  const deepLinkPromise = new Promise<string | null>((resolve) => {
    const sub = addEventListener('url', ({ url }) => {
      if (url.startsWith(redirectUrl)) {
        WebBrowser.dismissBrowser();
        resolve(url);
        sub.remove();
      }
    });
  });

  try {
    const browserResult = await WebBrowser.openAuthSessionAsync(
      checkoutUrl,
      redirectUrl
    );

    if (browserResult.type === 'success') {
      return {
        type: 'success',
        data: parseSuccessUrl(browserResult.url),
      };
    }

    if (browserResult.type === 'opened') {
      const url = await Promise.race([
        deepLinkPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 30_000)),
      ]);

      if (url) {
        return { type: 'success', data: parseSuccessUrl(url) };
      }
      return { type: 'cancel' };
    }

    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
      return { type: 'cancel' };
    }

    if (browserResult.type === 'locked') {
      return {
        type: 'error',
        error: {
          code: 'LOCKED',
          message: 'A checkout session is already open.',
        },
      };
    }

    return { type: 'cancel' };
  } catch (err) {
    return {
      type: 'error',
      error: {
        code: 'BROWSER_ERROR',
        message: err instanceof Error ? err.message : 'Browser launch failed',
      },
    };
  }
}

function parseSuccessUrl(url: string): {
  checkoutId?: string;
  orderId?: string;
  customerId?: string;
  productId?: string;
  url: string;
} {
  try {
    const parsed = parse(url);
    const q = parsed.queryParams ?? {};

    return {
      checkoutId: (q['checkout_id'] as string) ?? undefined,
      orderId: (q['order_id'] as string) ?? undefined,
      customerId: (q['customer_id'] as string) ?? undefined,
      productId: (q['product_id'] as string) ?? undefined,
      url,
    };
  } catch {
    return { url };
  }
}
