import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useCreemClient } from '../utils/context';
import { CreemError, CreemBillingPortalResult } from '../types';

// ---------------------------------------------------------------------------
// State / return types
// ---------------------------------------------------------------------------

interface CustomerPortalState {
  portalUrl: string | null;
  isLoading: boolean;
  error: CreemError | null;
}

export interface UseCreemCustomerPortalReturn extends CustomerPortalState {
  /** Generate the portal URL and open it in an in-app browser. */
  openPortal: () => Promise<void>;
  /** Generate the portal URL without opening it. */
  generatePortalUrl: () => Promise<string | null>;
  /** Reset state. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// useCreemCustomerPortal
// ---------------------------------------------------------------------------

export function useCreemCustomerPortal(
  customerId: string | null
): UseCreemCustomerPortalReturn {
  const client = useCreemClient();

  const [state, setState] = useState<CustomerPortalState>({
    portalUrl: null,
    isLoading: false,
    error: null,
  });

  const generatePortalUrl = useCallback(async (): Promise<string | null> => {
    if (!customerId) return null;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result: CreemBillingPortalResult =
        await client.generateCustomerPortalLink(customerId);

      setState({
        portalUrl: result.customer_portal_link,
        isLoading: false,
        error: null,
      });

      return result.customer_portal_link;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err as CreemError,
      }));
      return null;
    }
  }, [client, customerId]);

  const openPortal = useCallback(async () => {
    const url = await generatePortalUrl();
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  }, [generatePortalUrl]);

  const reset = useCallback(() => {
    setState({
      portalUrl: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    openPortal,
    generatePortalUrl,
    reset,
  };
}
