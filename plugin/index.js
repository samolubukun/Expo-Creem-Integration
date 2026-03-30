/**
 * expo-creem Expo Config Plugin
 *
 * Automatically configures URL scheme handling so that the Creem checkout
 * browser can redirect back into your app after payment.
 *
 * Supports:
 * - iOS: URL scheme registration in Info.plist
 * - Android: Intent filter for deep links in AndroidManifest.xml
 *
 * Usage in app.json / app.config.js:
 *
 *   "plugins": [
 *     ["expo-creem", { "scheme": "myapp" }]
 *   ]
 *
 * If you omit the scheme option, the plugin reads `expo.scheme` from your
 * existing app config.
 */

const { withInfoPlist, withAndroidManifest } = require('@expo/config-plugins');

// ---------------------------------------------------------------------------
// iOS — Info.plist URL scheme registration
// ---------------------------------------------------------------------------
function withCreemIos(config, scheme) {
  return withInfoPlist(config, (c) => {
    const plist = c.modResults;

    if (!Array.isArray(plist.CFBundleURLTypes)) {
      plist.CFBundleURLTypes = [];
    }

    // Only add if not already present to stay idempotent.
    const alreadyRegistered = plist.CFBundleURLTypes.some(
      (entry) =>
        Array.isArray(entry.CFBundleURLSchemes) &&
        entry.CFBundleURLSchemes.includes(scheme)
    );

    if (!alreadyRegistered) {
      plist.CFBundleURLTypes.push({
        CFBundleTypeRole: 'Editor',
        CFBundleURLSchemes: [scheme],
      });
    }

    return c;
  });
}

// ---------------------------------------------------------------------------
// Android — AndroidManifest.xml intent filter for deep links
// ---------------------------------------------------------------------------
function withCreemAndroid(config, scheme) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults;
    const mainApp = manifest.manifest.application && manifest.manifest.application[0];
    if (!mainApp) return c;

    // Find the main activity.
    const activities = mainApp.activity || [];
    const mainActivity = activities.find(
      (a) => a.$ && a.$['android:name'] === '.MainActivity'
    );

    if (!mainActivity) return c;

    if (!Array.isArray(mainActivity['intent-filter'])) {
      mainActivity['intent-filter'] = [];
    }

    // Check if the scheme filter already exists.
    const alreadyRegistered = mainActivity['intent-filter'].some((filter) =>
      (filter.data || []).some((d) => d.$['android:scheme'] === scheme)
    );

    if (!alreadyRegistered) {
      mainActivity['intent-filter'].push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
        ],
        data: [
          {
            $: {
              'android:scheme': scheme,
              'android:host': '*',
            },
          },
        ],
      });
    }

    return c;
  });
}

// ---------------------------------------------------------------------------
// Plugin entry point
// ---------------------------------------------------------------------------
const withCreem = (config, options = {}) => {
  const scheme =
    options.scheme ||
    (Array.isArray(config.scheme) ? config.scheme[0] : config.scheme) ||
    'myapp';

  config = withCreemIos(config, scheme);
  config = withCreemAndroid(config, scheme);

  return config;
};

module.exports = withCreem;
