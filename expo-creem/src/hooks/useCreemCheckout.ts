import { useState, useCallback, useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useCreemClient } from '../utils/context';
import { launchCheckout, buildCallbackUrl } from '../utils/client';
import {
  UseCreemCheckoutOptions,
  CreemCheckoutSession,
  CreemError,
  CheckoutResult,
} from '../types';

// ---------------------------------------------------------------------------
// Internal state shape
// ---------------------------------------------------------------------------

interface CheckoutState {
  status: 'idle' | 'loading' | 'success' | 'canceled' | 'error';
  session: CreemCheckoutSession | null;
  error: CreemError | null;
}

export interface UseCreemCheckoutReturn extends CheckoutState {
  startCheckout: () => Promise<void>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// useCreemCheckout
//
// Launches the Creem checkout in expo-web-browser and waits for the deep-link
// redirect.  Resolves synchronously once the browser closes.
// ---------------------------------------------------------------------------

export function useCreemCheckout(
  options: UseCreemCheckoutOptions
): UseCreemCheckoutReturn {
  const client = useCreemClient();
  const [state, setState] = useState<CheckoutState>({
    status: 'idle',
    session: null,
    error: null,
  });

  const {
    product_id,
    request_id,
    units,
    discount_code,
    customer,
    custom_fields,
    success_url,
    metadata,
    onComplete,
    onCancel,
    onError,
  } = options;

  const startCheckout = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      // Build fallback deep-link URLs in case the caller didn't supply them.
      const successCallbackUrl = success_url || buildCallbackUrl('creem/success');
      const redirectUrl = Linking.createURL('creem/callback');

      const session = await client.createCheckoutSession({
        product_id,
        request_id,
        units,
        discount_code,
        customer,
        custom_fields,
        success_url: successCallbackUrl,
        metadata,
      });

      const result: CheckoutResult = await launchCheckout(session, redirectUrl);

      if (result.status === 'completed') {
        setState({ status: 'success', session, error: null });
        onComplete?.(session);
      } else if (result.status === 'canceled') {
        setState({ status: 'canceled', session: null, error: null });
        onCancel?.();
      } else {
        const error: CreemError = {
          code: 'CHECKOUT_ERROR',
          message: result.error?.message || 'Checkout failed',
        };
        setState({ status: 'error', session: null, error });
        onError?.(error);
      }
    } catch (err) {
      const error = err as CreemError;
      setState({ status: 'error', session: null, error });
      onError?.(error);
    }
  }, [
    client,
    product_id,
    request_id,
    units,
    discount_code,
    customer,
    custom_fields,
    success_url,
    metadata,
    onComplete,
    onCancel,
    onError,
  ]);

  const reset = useCallback(() => {
    setState({ status: 'idle', session: null, error: null });
  }, []);

  return { ...state, startCheckout, reset };
}

// ---------------------------------------------------------------------------
// useCreemCheckoutWithDeeplink
//
// Variant that listens for incoming deep links rather than blocking on the
// browser result.  Useful when success_url / cancel deep links are handled
// by an external router (e.g. Expo Router, React Navigation).
// ---------------------------------------------------------------------------

export function useCreemCheckoutWithDeeplink(
  options: UseCreemCheckoutOptions
): UseCreemCheckoutReturn {
  const client = useCreemClient();
  const [state, setState] = useState<CheckoutState>({
    status: 'idle',
    session: null,
    error: null,
  });

  // Listen for deep-link callbacks from the Creem checkout page.
  useEffect(() => {
    const handleUrl = (url: string) => {
      const parsed = new URL(url);
      const path = parsed.pathname;
      const params = parsed.searchParams;

      if (path.includes('success') || params.get('status') === 'completed') {
        const checkoutId = params.get('checkout_id');
        if (checkoutId) {
          client
            .getCheckoutSession(checkoutId)
            .then((session) => {
              setState({ status: 'success', session, error: null });
              options.onComplete?.(session);
            })
            .catch((err: CreemError) => {
              setState({ status: 'error', session: null, error: err });
              options.onError?.(err);
            });
        } else {
          setState({ status: 'success', session: null, error: null });
        }
      } else if (
        path.includes('cancel') ||
        params.get('status') === 'canceled'
      ) {
        setState({ status: 'canceled', session: null, error: null });
        options.onCancel?.();
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [client, options]);

  const startCheckout = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const redirectUrl = Linking.createURL('creem/callback');
      const session = await client.createCheckoutSession({
        product_id: options.product_id,
        request_id: options.request_id,
        units: options.units,
        discount_code: options.discount_code,
        customer: options.customer,
        custom_fields: options.custom_fields,
        success_url: options.success_url || buildCallbackUrl('creem/success'),
        metadata: options.metadata,
      });

      // Fire and forget — result comes via the deep-link listener above.
      await launchCheckout(session, redirectUrl);
    } catch (err) {
      const error = err as CreemError;
      setState({ status: 'error', session: null, error });
      options.onError?.(error);
    }
  }, [client, options]);

  const reset = useCallback(() => {
    setState({ status: 'idle', session: null, error: null });
  }, []);

  return { ...state, startCheckout, reset };
}
