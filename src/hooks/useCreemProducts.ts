import { useState, useEffect, useCallback, useRef } from 'react';
import { useCreemClient } from '../utils/context';
import {
  CreemProduct,
  CreemPaginatedResponse,
  CreemError,
  UseCreemProductsOptions,
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

interface ProductsState {
  products: CreemProduct[];
  total: number;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: CreemError | null;
}

export interface UseCreemProductsReturn extends ProductsState {
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// useCreemProducts
// ---------------------------------------------------------------------------

export function useCreemProducts(
  options: UseCreemProductsOptions = {}
): UseCreemProductsReturn {
  const client = useCreemClient();
  const {
    page: initialPage = 1,
    pageSize = 10,
    enabled = true,
    pollInterval = 0,
  } = options;

  const [state, setState] = useState<ProductsState>({
    products: [],
    total: 0,
    page: initialPage,
    hasMore: false,
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const currentPageRef = useRef(initialPage);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProducts = useCallback(
    async (page: number, append = false) => {
      if (!enabled) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result: CreemPaginatedResponse<CreemProduct> =
          await client.searchProducts(page, pageSize);

        if (isMountedRef.current) {
          setState((prev) => ({
            products: append
              ? [...prev.products, ...result.items]
              : result.items,
            total: result.total,
            page: result.page,
            hasMore: result.has_more,
            isLoading: false,
            error: null,
          }));
          currentPageRef.current = result.page;
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
    [client, pageSize, enabled]
  );

  const refetch = useCallback(() => fetchProducts(initialPage, false), [
    fetchProducts,
    initialPage,
  ]);

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isLoading) return;
    await fetchProducts(currentPageRef.current + 1, true);
  }, [state.hasMore, state.isLoading, fetchProducts]);

  // Mount effect
  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      fetchProducts(initialPage, false);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [initialPage, fetchProducts, enabled]);

  // Polling effect
  useEffect(() => {
    if (pollInterval > 0 && enabled) {
      pollIntervalRef.current = setInterval(
        () => fetchProducts(initialPage, false),
        pollInterval
      );
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pollInterval, fetchProducts, initialPage, enabled]);

  return {
    ...state,
    refetch,
    loadMore,
  };
}
