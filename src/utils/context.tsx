import React, { createContext, useContext, useMemo, useCallback, useRef, useEffect } from 'react';
import { CreemClient, initializeCreem, getCreemClient } from './client';
import { CreemConfig } from '../types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface CreemContextValue {
  client: CreemClient;
  config: CreemConfig;
  isInitialized: boolean;
}

const CreemContext = createContext<CreemContextValue | null>(null);

interface CreemProviderProps {
  children: React.ReactNode;
  apiKey: string;
  environment?: CreemConfig['environment'];
  baseUrl?: CreemConfig['baseUrl'];
  customFetch?: CreemConfig['customFetch'];
  retries?: number;
  retryDelay?: number;
}

export function CreemProvider({
  children,
  apiKey,
  environment,
  baseUrl,
  customFetch,
  retries,
  retryDelay,
}: CreemProviderProps): React.JSX.Element {
  const config = useMemo<CreemConfig>(
    () => ({
      apiKey,
      environment,
      baseUrl,
      customFetch,
      retries,
      retryDelay,
    }),
    [apiKey, environment, baseUrl, customFetch, retries, retryDelay]
  );

  const client = useMemo(() => {
    return initializeCreem(config);
  }, [config]);

  const value = useMemo<CreemContextValue>(
    () => ({
      client,
      config,
      isInitialized: true,
    }),
    [client, config]
  );

  return (
    <CreemContext.Provider value={value}>{children}</CreemContext.Provider>
  );
}

export function useCreem(): CreemContextValue {
  const context = useContext(CreemContext);
  if (!context) {
    throw new Error('useCreem must be used within a CreemProvider');
  }
  return context;
}

export function useCreemClient(): CreemClient {
  const { client, isInitialized } = useCreem();
  if (!isInitialized) {
    throw new Error('Creem client not initialized');
  }
  return client;
}

export { CreemContext };

// ---------------------------------------------------------------------------
// Helpers — pricing, dates, error formatting
// ---------------------------------------------------------------------------

/** Format cents to a currency string. */
export function formatPrice(
  cents: number,
  currency = 'USD',
  locale?: string
): string {
  return new Intl.NumberFormat(locale ?? undefined, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/** Format an ISO date string to a locale-aware date. */
export function formatDate(
  isoDate: string | undefined | null,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoDate) return '';
  return new Intl.DateTimeFormat(locale ?? undefined, options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate));
}

/** Format a billing period string to human-readable text. */
export function formatBillingPeriod(
  period?: string | null,
  billingType?: string
): string {
  if (billingType === 'one_time') return 'One-time payment';
  if (!period) return '';

  const map: Record<string, string> = {
    'every-day': 'Daily',
    'every-week': 'Weekly',
    'every-month': 'Monthly',
    'every-year': 'Yearly',
    // Legacy / fallback
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
    year: 'Yearly',
  };
  return map[period] ?? period;
}

/** Returns a human-readable relative time string (e.g., "in 3 days"). */
export function formatRelativeTime(isoDate: string | undefined | null): string {
  if (!isoDate) return '';
  const now = new Date();
  const target = new Date(isoDate);
  if (isNaN(target.getTime())) return '';

  const diffMs = target.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);
  const isPast = diffMs < 0;

  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  let text: string;
  if (minutes < 1) text = 'just now';
  else if (minutes < 60) text = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  else if (hours < 24) text = `${hours} hour${hours === 1 ? '' : 's'}`;
  else text = `${days} day${days === 1 ? '' : 's'}`;

  if (isPast) return `${text} ago`;
  return `in ${text}`;
}

/** Human-readable subscription status. */
export function getSubscriptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    past_due: 'Past Due',
    paused: 'Paused',
    trialing: 'Trial',
    scheduled_cancel: 'Canceling',
  };
  return labels[status] ?? status;
}

/** Returns true if the subscription status is considered "active". */
export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}
