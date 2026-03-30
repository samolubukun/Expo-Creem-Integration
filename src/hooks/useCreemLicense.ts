import { useState, useCallback } from 'react';
import { useCreemClient } from '../utils/context';
import {
  CreemError,
  CreemLicenseKey,
  CreemLicenseInstance,
  CreemLicenseValidationResult,
  CreemActivateLicenseOptions,
  CreemValidateLicenseOptions,
  CreemDeactivateLicenseOptions,
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

interface LicenseState {
  license: CreemLicenseKey | null;
  instance: CreemLicenseInstance | null;
  status: 'active' | 'inactive' | 'expired' | 'disabled' | null;
  isLoading: boolean;
  error: CreemError | null;
}

export interface UseCreemLicenseReturn extends LicenseState {
  activate: (options: CreemActivateLicenseOptions) => Promise<void>;
  validate: (options: CreemValidateLicenseOptions) => Promise<void>;
  deactivate: (options: CreemDeactivateLicenseOptions) => Promise<void>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// useCreemLicense
// ---------------------------------------------------------------------------

export function useCreemLicense(): UseCreemLicenseReturn {
  const client = useCreemClient();

  const [state, setState] = useState<LicenseState>({
    license: null,
    instance: null,
    status: null,
    isLoading: false,
    error: null,
  });

  const activate = useCallback(
    async (options: CreemActivateLicenseOptions) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await client.activateLicense(options);
        setState({
          license: result.license,
          instance: result.instance,
          status: result.instance.status ?? 'active',
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: normalizeCreemError(err),
        }));
      }
    },
    [client]
  );

  const validate = useCallback(
    async (options: CreemValidateLicenseOptions) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result: CreemLicenseValidationResult =
          await client.validateLicense(options);
        setState({
          license: result.license,
          instance: result.instance,
          status: result.status,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: normalizeCreemError(err),
        }));
      }
    },
    [client]
  );

  const deactivate = useCallback(
    async (options: CreemDeactivateLicenseOptions) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await client.deactivateLicense(options);
        setState({
          license: result.license,
          instance: result.instance,
          status: result.status,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: normalizeCreemError(err),
        }));
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setState({
      license: null,
      instance: null,
      status: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    activate,
    validate,
    deactivate,
    reset,
  };
}
