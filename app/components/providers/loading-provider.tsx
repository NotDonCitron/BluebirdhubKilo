'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FullPageLoading } from '@/components/ui/loading-states';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  withLoading: <T>(
    promise: Promise<T>,
    message?: string
  ) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

interface LoadingProviderProps {
  children: React.ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  const showLoading = useCallback((message = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage('Loading...');
  }, []);

  const withLoading = useCallback(
    async <T,>(promise: Promise<T>, message = 'Loading...'): Promise<T> => {
      try {
        showLoading(message);
        const result = await promise;
        return result;
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const contextValue: LoadingContextType = {
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {isLoading && <FullPageLoading message={loadingMessage} />}
    </LoadingContext.Provider>
  );
}

// Hook for API calls with loading states
export function useApiCall() {
  const { withLoading } = useLoading();

  return useCallback(
    async <T,>(
      apiCall: () => Promise<T>,
      loadingMessage?: string
    ): Promise<T> => {
      return withLoading(apiCall(), loadingMessage);
    },
    [withLoading]
  );
}