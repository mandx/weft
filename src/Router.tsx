import React, {
  Children,
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { createBrowserHistory } from 'history';

function identity<T>(x: T): T {
  return x;
}

export function createHistory(): ReturnType<typeof createBrowserHistory> {
  return createBrowserHistory();
}

const HistoryContext = createContext<ReturnType<typeof createHistory> | undefined>(undefined);

function isRouteElement(element: unknown): element is ReactElement<RouteProps, typeof Route> {
  return (
    !!element &&
    (element as any)?.type === Route &&
    typeof (element as any)?.props?.path === 'string'
  );
}

function routeMatches(element: ReactElement<RouteProps, typeof Route>, path: string): boolean {
  return element.props.path === path;
}

function isSwitchElement(element: unknown): element is ReactElement<SwitchProps, typeof Switch> {
  return !!element && (element as any)?.type === Switch;
}

function isFallbackElement(
  element: unknown
): element is ReactElement<FallbackProps, typeof Fallback> {
  return !!element && (element as any)?.type === Fallback;
}

export interface RouterProps {
  readonly history: ReturnType<typeof createHistory>;
  readonly children: React.ReactNode;
}

export function Router({ history, children }: RouterProps) {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    // `history.listen` returns an "unsubscribe" function, so we just
    // return that from our effect function.
    return history.listen((historyEvent) => {
      setCurrentPath((pathname) => {
        return pathname === historyEvent.location.pathname
          ? pathname
          : historyEvent.location.pathname;
      });
    });
  }, [history]);

  return (
    <HistoryContext.Provider value={history}>
      {Children.map(children, (child) => {
        if (isRouteElement(child)) {
          if (!routeMatches(child, currentPath)) {
            return null;
          }
        }

        if (isSwitchElement(child) && Children.count(child.props.children)) {
          let fallback;

          for (const switchChild of Children.map(child.props.children, identity) || []) {
            if (isRouteElement(switchChild) && routeMatches(switchChild, currentPath)) {
              return switchChild;
            }

            if (
              !fallback &&
              isFallbackElement(switchChild) &&
              Children.count(switchChild.props.children)
            ) {
              fallback = switchChild;
            }
          }

          return fallback || null;
        }

        return child;
      })}
    </HistoryContext.Provider>
  );
}

interface LinkProps {
  readonly to: string;
  readonly className?: string;
  readonly children?: ReactNode;
}

export function Link({ to, children, className }: LinkProps) {
  return (
    <HistoryContext.Consumer>
      {(history) => (
        <a
          className={className}
          href={to}
          onClick={(event) => {
            if (history) {
              event.preventDefault();
              history.push(to);
            } else {
              console.warn(
                `\`Link\`{to:"${to}"} rendered without a \`history\`; not intercepting navigation.`
              );
            }
          }}>
          {children}
        </a>
      )}
    </HistoryContext.Consumer>
  );
}

interface RouteProps {
  readonly path: string;
  readonly children?: ReactNode;
}

export function Route(props: RouteProps) {
  return <>{props.children}</>;
}

interface SwitchProps {
  readonly children?: ReactNode;
}

export function Switch(props: SwitchProps) {
  return <>{props.children}</>;
}

interface FallbackProps {
  readonly children?: ReactNode;
}

export function Fallback(props: FallbackProps) {
  return <>{props.children}</>;
}

export function useHistory() {
  const history = useContext(HistoryContext);
  console.log('history', history);
  return history;
}
