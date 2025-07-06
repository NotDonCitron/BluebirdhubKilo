'use client';

import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary: () => void;
}

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<ErrorFallbackProps>;
}

// Generic lazy component wrapper
export function LazyComponent({ 
  children, 
  fallback = <LoadingSpinner />, 
  errorFallback 
}: LazyComponentProps) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  loadingComponent?: React.ComponentType,
  errorComponent?: React.ComponentType<ErrorFallbackProps>
) {
  const LazyLoadedComponent = lazy(() => Promise.resolve({ default: Component }));

  return function WrappedComponent(props: P) {
    return (
      <LazyComponent
        fallback={loadingComponent ? React.createElement(loadingComponent) : <LoadingSpinner />}
        errorFallback={errorComponent}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <LazyLoadedComponent {...(props as any)} />
      </LazyComponent>
    );
  };
}

// Hook for dynamic imports with loading state
export function useLazyImport<T = React.ComponentType>(
  importFunc: () => Promise<{ default: T }>,
  deps: React.DependencyList = []
) {
  const [component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);
        const { default: loadedComponent } = await importFunc();
        
        if (mounted) {
          setComponent(loadedComponent);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load component'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importFunc, ...deps]);

  return { component, loading, error };
}

// Intersection Observer hook for lazy loading on scroll
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}

// Lazy loading container for sections
export function LazySection({ 
  children, 
  className = '', 
  threshold = 0.1 
}: { 
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, { threshold });

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : <LoadingSpinner />}
    </div>
  );
}