import React, { createContext, useContext, useMemo } from 'react';
import { CreemClient, initializeCreem, getCreemClient } from '../utils/client';
import { CreemConfig, CreemCheckoutSession, CreemSubscription } from '../types';

interface CreemContextValue {
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
}

export function CreemProvider({
  children,
  apiKey,
  environment,
  baseUrl,
}: CreemProviderProps): React.JSX.Element {
  const config = useMemo<CreemConfig>(
    () => ({
      apiKey,
      environment,
      baseUrl,
    }),
    [apiKey, environment, baseUrl]
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
export type { CreemContextValue };
