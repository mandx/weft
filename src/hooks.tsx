import { useRef, MutableRefObject, useEffect, useState } from 'react';

type AllPossibleRefTypes<T> = ((instance: T | null) => void) | MutableRefObject<T | null>;

/**
 * Maybe we don't need this and use `useImperativeHandle` instead...
 */
export function useCombinedRefs<T>(
  ...refs: readonly (AllPossibleRefTypes<T> | null)[]
): MutableRefObject<T | null> {
  const targetRef = useRef<T>(null);

  useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) {
        return;
      }

      if (typeof ref === 'function') {
        ref(targetRef.current);
      } else {
        ref.current = targetRef.current;
      }
    });
  }, [refs]);

  return targetRef;
}

/**
 * React hook for creating a value exactly once. `useMemo` doesn't give this
 * guarantee unfortunately. Takes a function that will be called once on the
 * first render, the return value will be cached and returned in subsequent
 * renders.
 *
 * https://reactjs.org/docs/hooks-faq.html#how-to-create-expensive-objects-lazily
 *
 * Taken from https://github.com/Andarist/use-constant
 */
export function useConstant<T>(fn: () => T): T {
  const ref = useRef<T>();

  if (ref.current === undefined) {
    ref.current = fn();
  }

  return ref.current;
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(
    () => {
      // Set debouncedValue to value (passed in) after the specified delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Return a cleanup function that will be called every time ...
      // ... useEffect is re-called. useEffect will only be re-called ...
      // ... if value changes (see the inputs array below).
      // This is how we prevent debouncedValue from changing if value is ...
      // ... changed within the delay period. Timeout gets cleared and restarted.
      // To put it in context, if the user is typing within our app's ...
      // ... search box, we don't want the debouncedValue to update until ...
      // ... they've stopped typing for more than 500ms.
      return () => {
        clearTimeout(handler);
      };
    },
    // Only re-call effect if value changes
    // You could also add the "delay" var to inputs array if you ...
    // ... need to be able to change that dynamically.
    [value, delay]
  );

  return debouncedValue;
}

export function useEscKey(callback?: (event: Event) => void): void {
  useEffect(() => {
    function handler(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        callback?.(event);
        event.preventDefault();
      }
    }

    if (callback) {
      window.addEventListener('keyup', handler);

      return () => {
        window.removeEventListener('keyup', handler);
      };
    }

    return undefined;
  }, [callback]);
}

export function useDynamicStylesheet() {
  const sheet = useConstant(() => new CSSStyleSheet());

  useEffect(function adoptStylesheet() {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

    return function unAdoptStylesheet() {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    };
  });

  return sheet;
}
