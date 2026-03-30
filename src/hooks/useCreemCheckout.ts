import { useState, useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useCreemClient } from '../utils/context';
import { launchCheckout, buildCallbackUrl } from '../utils/client';
import {
  UseCreemCheckoutOptions,
  CreemCheckoutSession,
  CreemError,
  CheckoutResult,
} from '../types';

function normalizeCreemError(err: unknown): CreemError {
  if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
    return err as CreemError;
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : String(err),
  };
}

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
    autoCloseDelay,
  } = options;

  const startCheckout = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
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
        if (autoCloseDelay && autoCloseDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, autoCloseDelay));
        }
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
      const error = normalizeCreemError(err);
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
    autoCloseDelay,
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

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Listen for deep-link callbacks from the Creem checkout page.
  useEffect(() => {
    const handleUrl = (url: string) => {
      try {
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
                optionsRef.current.onComplete?.(session);
              })
              .catch((err: CreemError) => {
                setState({ status: 'error', session: null, error: err });
                optionsRef.current.onError?.(err);
              });
          } else {
            setState({ status: 'success', session: null, error: null });
          }
        } else if (
          path.includes('cancel') ||
          params.get('status') === 'canceled'
        ) {
          setState({ status: 'canceled', session: null, error: null });
          optionsRef.current.onCancel?.();
        }
      } catch {
        // ignore malformed URLs
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [client]);

  const startCheckout = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const redirectUrl = Linking.createURL('creem/callback');
      const currentOptions = optionsRef.current;
      const session = await client.createCheckoutSession({
        product_id: currentOptions.product_id,
        request_id: currentOptions.request_id,
        units: currentOptions.units,
        discount_code: currentOptions.discount_code,
        customer: currentOptions.customer,
        custom_fields: currentOptions.custom_fields,
        success_url: currentOptions.success_url || buildCallbackUrl('creem/success'),
        metadata: currentOptions.metadata,
      });

      // Fire and forget — result comes via the deep-link listener above.
      await launchCheckout(session, redirectUrl);
    } catch (err) {
      const error = normalizeCreemError(err);
      setState({ status: 'error', session: null, error });
      optionsRef.current.onError?.(error);
    }
  }, [client]);

  const reset = useCallback(() => {
    setState({ status: 'idle', session: null, error: null });
  }, []);

  return { ...state, startCheckout, reset };
}
