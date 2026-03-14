import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useCreemSubscription } from '../hooks';
import { SubscriptionStatus as SubscriptionStatusType } from '../types';

interface SubscriptionStatusProps {
  subscriptionId: string | null;
  pollInterval?: number;
  showDetails?: boolean;
  onStatusChange?: (status: SubscriptionStatusType) => void;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: { code: string; message: string }) => React.ReactNode;
  renderInactive?: () => React.ReactNode;
  renderActive?: (
    subscription: NonNullable<
      ReturnType<typeof useCreemSubscription>['subscription']
    >
  ) => React.ReactNode;
}

// Matches the SubscriptionStatus union in types/index.ts exactly.
const STATUS_LABELS: Record<SubscriptionStatusType, string> = {
  active: 'Active',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  paused: 'Paused',
  trialing: 'Trial',
  scheduled_cancel: 'Canceling',
};

const STATUS_COLORS: Record<SubscriptionStatusType, string> = {
  active: '#34C759',
  canceled: '#FF3B30',
  unpaid: '#FF3B30',
  paused: '#FF9500',
  trialing: '#5856D6',
  scheduled_cancel: '#FF9500',
};

/** The statuses we consider "inactive" — no active subscription to show. */
const INACTIVE_STATUSES: SubscriptionStatusType[] = ['canceled', 'unpaid'];

export function SubscriptionStatus({
  subscriptionId,
  pollInterval = 0,
  showDetails = false,
  onStatusChange,
  renderLoading,
  renderError,
  renderInactive,
  renderActive,
}: SubscriptionStatusProps): React.JSX.Element {
  const { subscription, status, isLoading, error, refetch } =
    useCreemSubscription(subscriptionId, {
      pollInterval,
      onStatusChange,
    });

  if (isLoading && !subscription) {
    if (renderLoading) return <>{renderLoading()}</>;
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }

  if (error) {
    if (renderError) return <>{renderError(error)}</>;
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load subscription</Text>
        <Text style={styles.retryText} onPress={refetch}>
          Tap to retry
        </Text>
      </View>
    );
  }

  if (!subscription || !status || INACTIVE_STATUSES.includes(status)) {
    if (renderInactive) return <>{renderInactive()}</>;
    return (
      <View style={styles.container}>
        <Text style={styles.inactiveText}>No active subscription</Text>
      </View>
    );
  }

  if (renderActive) return <>{renderActive(subscription)}</>;

  const isScheduledCancel = status === 'scheduled_cancel';

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View
          style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]}
        />
        <Text style={styles.statusText}>{STATUS_LABELS[status]}</Text>
      </View>

      {showDetails && (
        <View style={styles.detailsContainer}>
          {subscription.current_period_end_date && (
            <Text style={styles.detailText}>
              {isScheduledCancel
                ? `Cancels on ${new Date(
                    subscription.current_period_end_date
                  ).toLocaleDateString()}`
                : `Renews on ${new Date(
                    subscription.current_period_end_date
                  ).toLocaleDateString()}`}
            </Text>
          )}
          {typeof subscription.product === 'object' && subscription.product?.name && (
            <Text style={styles.productName}>{subscription.product.name}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SubscriptionBadge — compact status indicator
// ---------------------------------------------------------------------------

interface SubscriptionBadgeProps {
  subscriptionId: string | null;
  pollInterval?: number;
  showLabel?: boolean;
}

export function SubscriptionBadge({
  subscriptionId,
  pollInterval = 0,
  showLabel = true,
}: SubscriptionBadgeProps): React.JSX.Element {
  const { status } = useCreemSubscription(subscriptionId, { pollInterval });

  if (!status) return <></>;

  const isActive = status === 'active' || status === 'trialing';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isActive ? '#34C759' : '#FF3B30' },
      ]}
    >
      {showLabel && (
        <Text style={styles.badgeText}>{STATUS_LABELS[status]}</Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  productName: {
    fontSize: 13,
    color: '#3C3C43',
    marginTop: 4,
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 13,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 6,
  },
  inactiveText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
