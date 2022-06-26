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
import { pathToRegexp, Key as RouteKey } from 'path-to-regexp';
import { useConstant } from './hooks';

function identity<T>(x: T): T {
  return x;
}

export const createHistory = createBrowserHistory;
type HistoryImpl = ReturnType<typeof createHistory>;

type StringParams = { [paramName: string]: string | undefined };

type HistoryContextInner = {
  history: HistoryImpl;
};
export const HistoryContext = createContext<HistoryContextInner | undefined>(undefined);
const RouteParamsContext = createContext<StringParams | undefined>(undefined);

class CompiledRoutesCache {
  private innerCache: Map<string, { regexp: RegExp; keys: RouteKey[] }>;

  constructor() {
    this.innerCache = new Map();
  }

  get(route: string): { regexp: RegExp; keys: RouteKey[] } {
    // NOTE: I think for now it's safe to return the reference to the cached
    // objects here, as long as they are not exposed to the public API;
    // components inspecting the routes parameters will just get a new mapping
    // of `paramName` -> `paramValue`, which are all just immutable strings.

    const cached = this.innerCache.get(route);
    if (cached) {
      return cached;
    }

    const keys: RouteKey[] = [];
    const regexp = pathToRegexp(route, keys);
    const result = { regexp, keys };
    this.innerCache.set(route, result);
    return result;
  }

  isMatch(route: string, path: string): StringParams | undefined {
    const compiled = this.get(route);
    const regexpMatch = compiled.regexp.exec(path);
    if (!regexpMatch) {
      return undefined;
    }

    return compiled.keys
      .map((key, index): [string, string] => [`${key.name}`, regexpMatch[index + 1]])
      .reduce((params, tuple) => {
        params[tuple[0]] = tuple[1];
        return params;
      }, {} as StringParams);
  }
}

function isRouteElement(element: unknown): element is ReactElement<RouteProps, typeof Route> {
  return (
    !!element &&
    (element as any)?.type === Route &&
    typeof (element as any)?.props?.route === 'string'
  );
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
  readonly history: HistoryImpl;
  readonly children: React.ReactNode;
}

export function Router({ history, children }: RouterProps) {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const compiledRoutesCache = useConstant<CompiledRoutesCache>(() => new CompiledRoutesCache());

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
    <HistoryContext.Provider value={{ history }}>
      {Children.map(children, (child) => {
        if (isRouteElement(child)) {
          const routeParams = compiledRoutesCache.isMatch(child.props.route, currentPath);
          if (routeParams) {
            const routeChildren = child.props.children;
            return (
              <RouteParamsContext.Provider value={routeParams}>
                {typeof routeChildren === 'function' ? routeChildren(routeParams) : routeChildren}
              </RouteParamsContext.Provider>
            );
          }
        }

        if (isSwitchElement(child) && Children.count(child.props.children)) {
          let fallback;

          for (const switchChild of Children.map(child.props.children, identity) || []) {
            if (isRouteElement(switchChild)) {
              const routeParams = compiledRoutesCache.isMatch(switchChild.props.route, currentPath);
              if (routeParams) {
                return (
                  <RouteParamsContext.Provider value={routeParams}>
                    {switchChild}
                  </RouteParamsContext.Provider>
                );
              }
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

export function Link({ to, children, className, ...props }: LinkProps) {
  return (
    <HistoryContext.Consumer>
      {(context) => (
        <a
          {...props}
          className={
            /* TODO: toggle a class name depending if the link is "active" or not*/
            className
          }
          href={to}
          onClick={(event) => {
            const { history } = context || {};
            if (history) {
              event.preventDefault();
              history.push(to);
            }
          }}
        >
          {children}
        </a>
      )}
    </HistoryContext.Consumer>
  );
}

type RouteMatchRenderer = (params: StringParams) => JSX.Element;
type RouteChildren = ReactNode | RouteMatchRenderer;

interface RouteProps {
  readonly route: string;
  readonly children?: RouteChildren;
}

/**
 * Defines a route within a router: `route` prop will be an Express-like
 * route pattern, and the JSX children inside will be the component to
 * mount when the route matches.
 *
 * TODO: Allow for defining function-as-children
 */
export function Route(props: RouteProps) {
  return <>{props.children}</>;
}

interface SwitchProps {
  readonly children?: ReactElement<unknown, typeof Route> | ReactElement<unknown, typeof Route>[];
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
  return useContext(HistoryContext);
}

export function useRouteParams(): StringParams | undefined {
  return useContext(RouteParamsContext);
}
