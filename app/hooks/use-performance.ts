'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastRan = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastRan.current >= delay) {
        lastRan.current = now;
        return func(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastRan.current = Date.now();
          func(...args);
        }, delay - (now - lastRan.current));
      }
    }) as T,
    [func, delay]
  );
}

// Debounced callback hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Memoized value hook with custom comparison
export function useMemoizedValue<T>(
  value: T,
  compareFn?: (prev: T, next: T) => boolean
): T {
  const ref = useRef<T>(value);

  if (compareFn) {
    if (!compareFn(ref.current, value)) {
      ref.current = value;
    }
  } else {
    if (ref.current !== value) {
      ref.current = value;
    }
  }

  return ref.current;
}

// Previous value hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// Optimized search hook
export function useOptimizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
  debounceDelay: number = 300
) {
  const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);

  return useCallback(() => {
    if (!debouncedSearchTerm.trim()) {
      return items;
    }

    const lowercaseSearch = debouncedSearchTerm.toLowerCase();
    
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowercaseSearch);
        }
        return false;
      })
    );
  }, [items, debouncedSearchTerm, searchFields]);
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    startIndex + visibleItemsCount + overscan * 2
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
    startIndex,
    endIndex,
  };
}

// Optimized form validation hook
export function useOptimizedValidation<T extends Record<string, any>>(
  values: T,
  validationSchema: Record<keyof T, (value: any) => string | null>,
  debounceDelay: number = 300
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const debouncedValues = useDebounce(values, debounceDelay);

  useEffect(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    
    Object.entries(validationSchema).forEach(([field, validator]) => {
      const error = validator(debouncedValues[field as keyof T]);
      if (error) {
        newErrors[field as keyof T] = error;
      }
    });

    setErrors(newErrors);
  }, [debouncedValues, validationSchema]);

  return errors;
}

// Performance monitoring hook
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>();

  useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      if (startTime.current) {
        const duration = performance.now() - startTime.current;
        console.log(`${name} rendered in ${duration.toFixed(2)}ms`);
      }
    };
  });

  const measure = useCallback((operationName: string) => {
    return {
      start: () => {
        performance.mark(`${name}-${operationName}-start`);
      },
      end: () => {
        performance.mark(`${name}-${operationName}-end`);
        performance.measure(
          `${name}-${operationName}`,
          `${name}-${operationName}-start`,
          `${name}-${operationName}-end`
        );
      }
    };
  }, [name]);

  return { measure };
}

// Optimized event listener hook
export function useOptimizedEventListener(
  eventName: string,
  handler: (event: Event) => void,
  element: Element | Window | Document = window,
  options: AddEventListenerOptions = {}
) {
  const savedHandler = useRef<(event: Event) => void>();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    const eventListener = (event: Event) => savedHandler.current?.(event);

    element.addEventListener(eventName, eventListener, options);

    return () => {
      element.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}