import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useCreemCheckout } from '../hooks';
import { UseCreemCheckoutOptions } from '../types';

interface CreemCheckoutButtonProps {
  options: UseCreemCheckoutOptions;
  title?: string;
  loadingTitle?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export const CreemCheckoutButton = React.memo(function CreemCheckoutButton({
  options,
  title = 'Subscribe',
  loadingTitle,
  disabled = false,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
}: CreemCheckoutButtonProps): React.JSX.Element {
  const { status, startCheckout, error } = useCreemCheckout(options);

  const isLoading = status === 'loading';
  const isDisabled = disabled || isLoading;

  const handlePress = async () => {
    if (!isDisabled) {
      await startCheckout();
    }
  };

  const variantButtonKey = `button_${variant}` as const;
  const sizeButtonKey = `button_${size}` as const;

  const buttonStyles: ViewStyle[] = useMemo(
    () => [
      styles.button,
      ...(variantButtonKey === 'button_primary'
        ? [styles.button_primary]
        : variantButtonKey === 'button_secondary'
          ? [styles.button_secondary]
          : [styles.button_outline]),
      ...(sizeButtonKey === 'button_small'
        ? [styles.button_small]
        : sizeButtonKey === 'button_medium'
          ? [styles.button_medium]
          : [styles.button_large]),
      ...(isDisabled ? [styles.button_disabled] : []),
      ...(style ? [style] : []),
    ],
    [variantButtonKey, sizeButtonKey, isDisabled, style]
  );

  const textStyles: TextStyle[] = useMemo(() => {
    const variantTextKey = `text_${variant}` as const;
    const sizeTextKey = `text_${size}` as const;
    return [
      styles.text,
      ...(variantTextKey === 'text_primary'
        ? [styles.text_primary]
        : variantTextKey === 'text_secondary'
          ? [styles.text_secondary]
          : [styles.text_outline]),
      ...(sizeTextKey === 'text_small'
        ? [styles.text_small]
        : sizeTextKey === 'text_medium'
          ? [styles.text_medium]
          : [styles.text_large]),
      ...(isDisabled ? [styles.text_disabled] : []),
      ...(textStyle ? [textStyle] : []),
    ];
  }, [variant, size, isDisabled, textStyle]);

  const indicatorColor = variant === 'outline' ? '#007AFF' : '#FFFFFF';

  function getLabel(): string {
    if (error) return 'Error — Try Again';
    return title;
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: isLoading, disabled: isDisabled }}
    >
      {isLoading ? (
        <>
          <ActivityIndicator color={indicatorColor} size="small" />
          {loadingTitle ? (
            <Text style={[textStyles, styles.loadingText]}>{loadingTitle}</Text>
          ) : null}
        </>
      ) : (
        <Text style={textStyles}>{getLabel()}</Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  button_primary: {
    backgroundColor: '#007AFF',
  },
  button_secondary: {
    backgroundColor: '#5856D6',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  button_medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  button_disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#FFFFFF',
  },
  text_outline: {
    color: '#007AFF',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  text_disabled: {
    opacity: 0.7,
  },
  loadingText: {
    marginLeft: 4,
  },
});
