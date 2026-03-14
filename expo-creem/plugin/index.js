/**
 * expo-creem Expo Config Plugin
 *
 * Automatically configures URL scheme handling so that the Creem checkout
 * browser can redirect back into your app after payment.
 *
 * Usage in app.json / app.config.js:
 *
 *   "plugins": [
 *     ["expo-creem", { "scheme": "myapp" }]
 *   ]
 *
 * If you omit the scheme option, the plugin reads `expo.scheme` from your
 * existing app config (the top-level scheme Expo already sets up).
 * No manual Info.plist / AndroidManifest.xml edits are needed.
 */

// expo/config-plugins is a peer dependency of expo — always available in
// an Expo managed workflow project.
const { withAppDelegate, withAndroidManifest, withInfoPlist } =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@expo/config-plugins') as typeof import('@expo/config-plugins');

interface CreemPluginOptions {
  /**
   * The URL scheme your app uses for deep linking.
   * Defaults to the top-level `scheme` in your app config.
   */
  scheme?: string;
}

// ---------------------------------------------------------------------------
// iOS — Info.plist
// ---------------------------------------------------------------------------
function withCreemIos(
  config: Parameters<typeof withInfoPlist>[0],
  scheme: string
): ReturnType<typeof withInfoPlist> {
  return withInfoPlist(config, (c) => {
    const plist = c.modResults;

    if (!Array.isArray(plist.CFBundleURLTypes)) {
      plist.CFBundleURLTypes = [];
    }

    // Only add if not already present to stay idempotent.
    const alreadyRegistered = (plist.CFBundleURLTypes as Array<{
      CFBundleURLSchemes?: string[];
    }>).some((entry) => entry.CFBundleURLSchemes?.includes(scheme));

    if (!alreadyRegistered) {
      (plist.CFBundleURLTypes as Array<{
        CFBundleTypeRole: string;
        CFBundleURLSchemes: string[];
      }>).push({
        CFBundleTypeRole: 'Editor',
        CFBundleURLSchemes: [scheme],
      });
    }

    return c;
  });
}

// ---------------------------------------------------------------------------
// Android — AndroidManifest.xml
// ---------------------------------------------------------------------------
function withCreemAndroid(
  config: Parameters<typeof withAndroidManifest>[0],
  scheme: string
): ReturnType<typeof withAndroidManifest> {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults;
    const mainApp = manifest.manifest.application?.[0];
    if (!mainApp) return c;

    // Find the main activity.
    const mainActivity = (
      mainApp.activity as Array<{
        $: { 'android:name': string };
        'intent-filter'?: Array<{
          action?: Array<{ $: { 'android:name': string } }>;
          category?: Array<{ $: { 'android:name': string } }>;
          data?: Array<{ $: { 'android:scheme': string } }>;
        }>;
      }>
    )?.find((a) => a.$['android:name'] === '.MainActivity');

    if (!mainActivity) return c;

    if (!Array.isArray(mainActivity['intent-filter'])) {
      mainActivity['intent-filter'] = [];
    }

    // Check if the scheme filter already exists.
    const alreadyRegistered = mainActivity['intent-filter'].some((filter) =>
      filter.data?.some((d) => d.$['android:scheme'] === scheme)
    );

    if (!alreadyRegistered) {
      mainActivity['intent-filter'].push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
        ],
        data: [{ $: { 'android:scheme': scheme } }],
      });
    }

    return c;
  });
}

// ---------------------------------------------------------------------------
// Plugin entry point
// ---------------------------------------------------------------------------
const withCreem = (
  config: Parameters<typeof withAppDelegate>[0],
  options: CreemPluginOptions = {}
) => {
  const scheme =
    options.scheme ||
    (Array.isArray((config as { scheme?: string | string[] }).scheme)
      ? ((config as { scheme?: string[] }).scheme as string[])[0]
      : (config as { scheme?: string }).scheme) ||
    'myapp';

  config = withCreemIos(config, scheme);
  config = withCreemAndroid(config, scheme);

  return config;
};

module.exports = withCreem;
