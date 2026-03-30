import { useState, useEffect, useCallback, useRef } from 'react';
import { useCreemClient } from '../utils/context';
import {
  CreemSubscription,
  CreemError,
  SubscriptionStatus,
  UseCreemSubscriptionOptions,
  CreemCancelSubscriptionOptions,
  CreemUpdateSubscriptionOptions,
  CreemUpgradeSubscriptionOptions,
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
  updateSubscription: (options: CreemUpdateSubscriptionOptions) => Promise<void>;
  upgradeSubscription: (options: CreemUpgradeSubscriptionOptions) => Promise<void>;
  pauseSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// useCreemSubscription
// ---------------------------------------------------------------------------

export function useCreemSubscription(
  subscriptionId: string | null,
  options: UseCreemSubscriptionOptions = {}
): UseCreemSubscriptionReturn {
  const client = useCreemClient();
  const { pollInterval = 0, onStatusChange, enabled = true } = options;

  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    status: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const fetchSubscription = useCallback(async () => {
    if (!subscriptionId || !enabled) return;

    try {
      const subscription = await client.getSubscription(subscriptionId);

      if (isMountedRef.current) {
        setState((prev) => {
          if (prev.status !== subscription.status) {
            onStatusChangeRef.current?.(subscription.status);
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
          error: normalizeCreemError(err),
        }));
      }
    }
  }, [client, subscriptionId, enabled]);

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
          onStatusChangeRef.current?.(subscription.status);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: normalizeCreemError(err),
          }));
        }
      }
    },
    [client, subscriptionId]
  );

  const updateSubscription = useCallback(
    async (updateOptions: CreemUpdateSubscriptionOptions) => {
      if (!subscriptionId) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const subscription = await client.updateSubscription(
          subscriptionId,
          updateOptions
        );

        if (isMountedRef.current) {
          setState({
            subscription,
            status: subscription.status,
            isLoading: false,
            error: null,
            lastUpdated: new Date(),
          });
          onStatusChangeRef.current?.(subscription.status);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: normalizeCreemError(err),
          }));
        }
      }
    },
    [client, subscriptionId]
  );

  const upgradeSubscription = useCallback(
    async (upgradeOptions: CreemUpgradeSubscriptionOptions) => {
      if (!subscriptionId) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const subscription = await client.upgradeSubscription(
          subscriptionId,
          upgradeOptions
        );

        if (isMountedRef.current) {
          setState({
            subscription,
            status: subscription.status,
            isLoading: false,
            error: null,
            lastUpdated: new Date(),
          });
          onStatusChangeRef.current?.(subscription.status);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: normalizeCreemError(err),
          }));
        }
      }
    },
    [client, subscriptionId]
  );

  const pauseSubscription = useCallback(async () => {
    if (!subscriptionId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const subscription = await client.pauseSubscription(subscriptionId);

      if (isMountedRef.current) {
        setState({
          subscription,
          status: subscription.status,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });
        onStatusChangeRef.current?.(subscription.status);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: normalizeCreemError(err),
        }));
      }
    }
  }, [client, subscriptionId]);

  const resumeSubscription = useCallback(async () => {
    if (!subscriptionId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const subscription = await client.resumeSubscription(subscriptionId);

      if (isMountedRef.current) {
        setState({
          subscription,
          status: subscription.status,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });
        onStatusChangeRef.current?.(subscription.status);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: normalizeCreemError(err),
        }));
      }
    }
  }, [client, subscriptionId]);

  // Mount effect — initial fetch
  useEffect(() => {
    isMountedRef.current = true;

    if (subscriptionId && enabled) {
      setState((prev) => ({ ...prev, isLoading: true }));
      fetchSubscription();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [subscriptionId, fetchSubscription, enabled]);

  // Polling effect
  useEffect(() => {
    if (pollInterval > 0 && subscriptionId && enabled) {
      pollIntervalRef.current = setInterval(fetchSubscription, pollInterval);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pollInterval, fetchSubscription, subscriptionId, enabled]);

  return {
    ...state,
    refetch: fetchSubscription,
    cancelSubscription,
    updateSubscription,
    upgradeSubscription,
    pauseSubscription,
    resumeSubscription,
  };
}

// ---------------------------------------------------------------------------
// useCreemSubscriptionStatus — convenience hook
// ---------------------------------------------------------------------------

export function useCreemSubscriptionStatus(
  subscriptionId: string | null,
  pollInterval = 0
): SubscriptionStatus | null {
  const { status } = useCreemSubscription(subscriptionId, { pollInterval });
  return status;
}
