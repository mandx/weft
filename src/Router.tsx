import React, {
  useSyncExternalStore,
  Children,
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  HTMLProps,
  cloneElement,
  useCallback,
  MouseEvent,
} from 'react';
import { Blocker, createBrowserHistory, Listener } from 'history';
import { Params, Path } from 'static-path';
import { pathToRegexp, Key as RouteKey } from 'path-to-regexp';
import { useConstant } from './hooks';
import { identity } from './utilities';

export const createHistory = createBrowserHistory;
type HistoryBackend = ReturnType<typeof createHistory>;

export class PathHistory implements Omit<HistoryBackend, 'createHref' | 'push' | 'replace'> {
  public readonly inner: HistoryBackend;

  constructor(history: HistoryBackend) {
    this.inner = history;
  }

  get action() {
    return this.inner.action;
  }

  get location() {
    return this.inner.location;
  }

  go(delta: number) {
    return this.inner.go(delta);
  }

  back() {
    return this.inner.back();
  }

  forward() {
    return this.inner.forward();
  }

  listen(listener: Listener) {
    return this.inner.listen(listener);
  }

  block(blocker: Blocker) {
    return this.inner.block(blocker);
  }

  createHref<Pattern extends string>(
    path: Path<Pattern>,
    params: keyof Params<Pattern> extends 0 ? undefined : Params<Pattern>
  ): string {
    return this.inner.createHref(path((params || {}) as Params<Pattern>));
  }

  push<Pattern extends string>(
    path: Path<Pattern>,
    params: keyof Params<Pattern> extends 0 ? undefined : Params<Pattern>,
    state?: any
  ): void {
    return this.inner.push(path((params || {}) as Params<Pattern>), state);
  }

  replace<Pattern extends string>(
    path: Path<Pattern>,
    params: keyof Params<Pattern> extends 0 ? undefined : Params<Pattern>,
    state?: any
  ): void {
    return this.inner.replace(path((params || {}) as Params<Pattern>), state);
  }
}

type HistoryImpl = PathHistory;

type StringParams = { [paramName: string]: string | undefined };

export const HistoryContext = createContext<HistoryImpl | undefined>(undefined);
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

  isMatch<Pattern extends string>(
    route: string | Path<Pattern>,
    path: string
  ): StringParams | undefined {
    const compiled = this.get(typeof route === 'string' ? route : route.pattern);
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

function isPath<Pattern extends string>(value: unknown): value is Path<Pattern> {
  return (
    typeof value === 'function' &&
    typeof (value as any).pattern === 'string' &&
    Array.isArray((value as any).parts) &&
    typeof (value as any).path === 'function'
  );
}

function isRouteElement<Pattern extends string>(
  element: unknown
): element is ReactElement<RouteProps<Pattern>, typeof Route> {
  return !!element && (element as any)?.type === Route && isPath((element as any)?.props?.path);
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
  const compiledRoutesCache = useConstant<CompiledRoutesCache>(() => new CompiledRoutesCache());

  const currentPath: string = useSyncExternalStore(
    (onStoreChange) => history.listen(onStoreChange),
    () => window.location.pathname
  );

  return (
    <HistoryContext.Provider value={history}>
      {Children.map(children, (child) => {
        if (isRouteElement(child)) {
          const { children: content, path } = child.props;
          const routeParams = compiledRoutesCache.isMatch(path.pattern, currentPath);
          if (routeParams) {
            return (
              <RouteParamsContext.Provider value={routeParams}>
                {typeof content === 'function'
                  ? (content as GenericRouteRenderer)(routeParams)
                  : content}
              </RouteParamsContext.Provider>
            );
          }
        }

        if (isSwitchElement(child) && Children.count(child.props.children)) {
          let fallback: ReturnType<typeof cloneElement<FallbackProps>> | undefined = undefined;

          for (const switchChild of Children.map(child.props.children, identity) || []) {
            if (isRouteElement(switchChild)) {
              const routeParams = compiledRoutesCache.isMatch(
                switchChild.props.path.pattern,
                currentPath
              );
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
              fallback = cloneElement(switchChild, { routeNoMatched: currentPath });
            }
          }

          return fallback || null;
        }

        return child;
      })}
    </HistoryContext.Provider>
  );
}

type LinkToPathProps<Pattern extends string> = {
  readonly path: Path<Pattern>;
  readonly className?: string;
  readonly children?: ReactNode;
} & (keyof Params<Pattern> extends 0
  ? { readonly params?: undefined }
  : { readonly params: Params<Pattern> });

export function LinkToPath<Pattern extends string>({
  path,
  params,
  className,
  children,
  ...props
}: LinkToPathProps<Pattern> & HTMLProps<HTMLAnchorElement>) {
  const realizedPath = path(params || ({} as Params<Pattern>));
  const history = useHistory();
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (history) {
        event.preventDefault();
        history.inner.push(realizedPath);
      }
    },
    [realizedPath, history]
  );

  return (
    <a
      {...props}
      className={
        /* TODO: toggle a class name depending if the link is "active" or not*/
        className
      }
      href={realizedPath}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

export const Link = LinkToPath;

type GenericRouteRenderer = (params?: StringParams) => ReactNode;
type RouteMatchRenderer<Pattern extends string> = (params: Params<Pattern>) => ReactNode;
type RouteChildren<Pattern extends string> = ReactNode | RouteMatchRenderer<Pattern>;

type RouteProps<Pattern extends string> = {
  readonly path: Path<Pattern>;
  readonly children?: RouteChildren<Pattern>;
};

/**
 * Defines a route within a router: `route` prop will be an Express-like
 * route pattern, and the JSX children inside will be the component to
 * mount when the route matches.
 *
 * TODO: Allow for defining function-as-children
 */
export function Route<Pattern extends string>(props: RouteProps<Pattern>) {
  return <>{props.children}</>;
}

interface SwitchProps {
  readonly children?: ReactElement<unknown, typeof Route> | ReactElement<unknown, typeof Route>[];
}

export function Switch(props: SwitchProps) {
  return <>{props.children}</>;
}

interface FallbackProps {
  routeNoMatched?: string;
  onRouteNotMatched?: (route: string) => void;
  readonly children?: ReactNode;
}

export function Fallback({ routeNoMatched, onRouteNotMatched, children }: FallbackProps) {
  const routesNotFoundAndSeen = useConstant(() => {
    const seen = new Set<string>();
    seen.add('/');
    return seen;
  });

  if (onRouteNotMatched && routeNoMatched && !routesNotFoundAndSeen.has(routeNoMatched)) {
    routesNotFoundAndSeen.add(routeNoMatched);
    onRouteNotMatched(routeNoMatched);
  }

  return <>{children}</>;
}

export function useHistory(): HistoryImpl | undefined {
  return useContext(HistoryContext);
}

export function useRouteParams(): StringParams | undefined {
  return useContext(RouteParamsContext);
}
