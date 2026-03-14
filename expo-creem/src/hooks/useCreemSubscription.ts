import { useState, useEffect, useCallback, useRef } from 'react';
import { useCreemClient } from '../utils/context';
import {
  CreemSubscription,
  CreemError,
  SubscriptionStatus,
  UseCreemSubscriptionOptions,
  CreemCancelSubscriptionOptions,
} from '../types';

// ---------------------------------------------------------------------------
// State / return types
// ---------------------------------------------------------------------------

interface SubscriptionState {
  subscription: CreemSubscription | null;
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: CreemError | null;
  lastUpdated: Date | null;
}

export interface UseCreemSubscriptionReturn extends SubscriptionState {
  refetch: () => Promise<void>;
  cancelSubscription: (options?: CreemCancelSubscriptionOptions) => Promise<void>;
}

// ---------------------------------------------------------------------------
// useCreemSubscription
// ---------------------------------------------------------------------------

/**
 * Fetches a subscription by ID and optionally polls for status changes.
 *
 * @param subscriptionId  The Creem subscription ID (e.g. `sub_xxx`), or null
 *                        to skip fetching.
 * @param options         Optional poll interval and status-change callback.
 */
export function useCreemSubscription(
  subscriptionId: string | null,
  options: UseCreemSubscriptionOptions = {}
): UseCreemSubscriptionReturn {
  const client = useCreemClient();
  const { pollInterval = 0, onStatusChange } = options;

  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    status: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchSubscription = useCallback(async () => {
    if (!subscriptionId) return;

    try {
      const subscription = await client.getSubscription(subscriptionId);

      if (isMountedRef.current) {
        setState((prev) => {
          if (prev.status !== subscription.status) {
            onStatusChange?.(subscription.status);
          }
          return {
            subscription,
            status: subscription.status,
            isLoading: false,
            error: null,
            lastUpdated: new Date(),
          };
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err as CreemError,
        }));
      }
    }
  }, [client, subscriptionId, onStatusChange]);

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------
  const cancelSubscription = useCallback(
    async (cancelOptions?: CreemCancelSubscriptionOptions) => {
      if (!subscriptionId) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const subscription = await client.cancelSubscription(
          subscriptionId,
          cancelOptions
        );

        if (isMountedRef.current) {
          setState({
            subscription,
            status: subscription.status,
            isLoading: false,
            error: null,
            lastUpdated: new Date(),
          });
          onStatusChange?.(subscription.status);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err as CreemError,
          }));
        }
      }
    },
    [client, subscriptionId, onStatusChange]
  );

  // ---------------------------------------------------------------------------
  // Mount effect — initial fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    if (subscriptionId) {
      setState((prev) => ({ ...prev, isLoading: true }));
      fetchSubscription();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [subscriptionId, fetchSubscription]);

  // ---------------------------------------------------------------------------
  // Polling effect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (pollInterval > 0 && subscriptionId) {
      pollIntervalRef.current = setInterval(fetchSubscription, pollInterval);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pollInterval, fetchSubscription, subscriptionId]);

  return {
    ...state,
    refetch: fetchSubscription,
    cancelSubscription,
  };
}

// ---------------------------------------------------------------------------
// useCreemSubscriptionStatus — convenience hook
// ---------------------------------------------------------------------------

/**
 * Returns only the subscription status string for a given subscription ID.
 * Useful when you just need to gate UI on active/canceled state.
 */
export function useCreemSubscriptionStatus(
  subscriptionId: string | null,
  pollInterval = 0
): SubscriptionStatus | null {
  const { status } = useCreemSubscription(subscriptionId, { pollInterval });
  return status;
}
