import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import * as Linking from 'expo-linking';
import {
  CreemProvider,
  CreemCheckoutButton,
  SubscriptionStatus as SubscriptionStatusComponent,
  useCreemCheckoutWithDeeplink,
} from 'expo-creem';

// ---------------------------------------------------------------------------
// Configuration — replace with your real values or use environment variables.
// ---------------------------------------------------------------------------
const CREEM_API_KEY = process.env.EXPO_PUBLIC_CREEM_API_KEY ?? 'YOUR_API_KEY_HERE';
const PRODUCT_ID = process.env.EXPO_PUBLIC_PRODUCT_ID ?? 'YOUR_PRODUCT_ID_HERE';

// ---------------------------------------------------------------------------
// CheckoutScreen
// ---------------------------------------------------------------------------
function CheckoutScreen(): React.JSX.Element {
  const [customerEmail, setCustomerEmail] = useState('');
  const [subscriptionIdInput, setSubscriptionIdInput] = useState('');
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  // useCreemCheckoutWithDeeplink listens for the deep-link redirect from Creem.
  const checkoutResult = useCreemCheckoutWithDeeplink({
    product_id: PRODUCT_ID,
    customer: customerEmail ? { email: customerEmail } : undefined,
    success_url: 'creemexample://creem/success',
    onComplete: (session) => {
      console.log('Checkout completed:', session.id);
      setLastSessionId(session.id);
      Alert.alert('Payment complete', `Session ID: ${session.id}`);
    },
    onCancel: () => {
      Alert.alert('Cancelled', 'The checkout was cancelled.');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>expo-creem Demo</Text>
      <Text style={styles.subtitle}>
        Test the Creem checkout flow in your Expo app
      </Text>

      {/* ------------------------------------------------------------------ */}
      {/* Configuration card                                                  */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configuration</Text>

        <Text style={styles.label}>Product ID</Text>
        <TextInput
          style={[styles.input, styles.inputReadonly]}
          value={PRODUCT_ID}
          editable={false}
          selectTextOnFocus
        />

        <Text style={[styles.label, { marginTop: 12 }]}>
          Customer Email{' '}
          <Text style={styles.labelHint}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={customerEmail}
          onChangeText={setCustomerEmail}
          placeholder="customer@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Checkout card                                                        */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Checkout</Text>
        <Text style={styles.description}>
          Tap the button to open the Creem checkout in a browser. The app will
          be notified via deep link when the payment completes.
        </Text>

        {/* Pre-built button component */}
        <CreemCheckoutButton
          options={{
            product_id: PRODUCT_ID,
            customer: customerEmail ? { email: customerEmail } : undefined,
            success_url: 'creemexample://creem/success',
          }}
          title="Subscribe Now"
          loadingTitle="Opening checkout…"
          variant="primary"
          size="large"
          style={styles.checkoutButton}
        />

        {checkoutResult.status === 'loading' && (
          <Text style={styles.statusNote}>Opening checkout…</Text>
        )}
        {checkoutResult.status === 'success' && (
          <Text style={[styles.statusNote, styles.statusSuccess]}>
            Payment completed!
          </Text>
        )}
        {checkoutResult.status === 'canceled' && (
          <Text style={[styles.statusNote, styles.statusCanceled]}>
            Checkout was cancelled.
          </Text>
        )}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Last session                                                         */}
      {/* ------------------------------------------------------------------ */}
      {lastSessionId && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last Session</Text>
          <Text style={styles.mono}>{lastSessionId}</Text>
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Subscription status card                                             */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription Status</Text>

        <Text style={styles.label}>Subscription ID</Text>
        <TextInput
          style={styles.input}
          value={subscriptionIdInput}
          onChangeText={setSubscriptionIdInput}
          placeholder="sub_xxx"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <SubscriptionStatusComponent
          subscriptionId={subscriptionIdInput || null}
          showDetails
          renderLoading={() => (
            <Text style={styles.statusNote}>Loading subscription…</Text>
          )}
          renderInactive={() => (
            <View style={styles.inactiveBox}>
              <Text style={styles.inactiveText}>No active subscription</Text>
            </View>
          )}
          renderActive={(subscription) => (
            <View style={styles.activeBox}>
              <Text style={styles.activeTitle}>Subscription Active</Text>
              <Text style={styles.detailText}>
                Product: {typeof subscription.product === 'object' ? subscription.product?.name ?? 'N/A' : subscription.product ?? 'N/A'}
              </Text>
              <Text style={styles.detailText}>
                Status: {subscription.status}
              </Text>
              {subscription.current_period_end_date && (
                <Text style={styles.detailText}>
                  {subscription.status === 'scheduled_cancel'
                    ? 'Cancels: '
                    : 'Renews: '}
                  {new Date(
                    subscription.current_period_end_date
                  ).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        />
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Deep link reference                                                  */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Deep Link Scheme</Text>
        <Text style={styles.description}>
          This example app handles the following deep links:
        </Text>
        <Text style={styles.mono}>creemexample://creem/success</Text>
        <Text style={styles.mono}>creemexample://creem/cancel</Text>
        <Text style={styles.mono}>creemexample://creem/callback</Text>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
export default function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) console.log('App opened via deep link:', url);
      setIsReady(true);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received:', url);
    });
    return () => sub.remove();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <CreemProvider apiKey={CREEM_API_KEY} environment="sandbox">
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F7" />
      <SafeAreaView style={styles.container}>
        <CheckoutScreen />
      </SafeAreaView>
    </CreemProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3C3C43',
    marginBottom: 6,
  },
  labelHint: {
    fontWeight: '400',
    color: '#8E8E93',
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#1C1C1E',
  },
  inputReadonly: {
    color: '#8E8E93',
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  checkoutButton: {
    marginTop: 4,
  },
  statusNote: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 10,
  },
  statusSuccess: {
    color: '#34C759',
    fontWeight: '600',
  },
  statusCanceled: {
    color: '#FF9500',
  },
  mono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#3C3C43',
    marginTop: 4,
  },
  inactiveBox: {
    padding: 14,
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    alignItems: 'center',
  },
  inactiveText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  activeBox: {
    padding: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
  },
  activeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#3C3C43',
    marginTop: 3,
  },
});
