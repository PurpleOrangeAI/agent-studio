export type ViewId = 'overview' | 'live' | 'replay' | 'optimize' | 'connect';

export interface AppRouteState {
  view: ViewId;
  systemId: string | null;
}

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '');

  return normalized.length > 0 ? normalized : '/';
}

export function parseAppRoute(pathname: string): AppRouteState {
  const normalized = normalizePathname(pathname);
  const parts = normalized.split('/').filter(Boolean);

  if (parts[0] === 'connect') {
    return {
      view: 'connect',
      systemId: null,
    };
  }

  if (parts[0] === 'systems' && parts[1]) {
    const systemId = decodeURIComponent(parts[1]);
    const view = parts[2];

    if (view === 'live' || view === 'replay' || view === 'optimize') {
      return {
        view,
        systemId,
      };
    }

    return {
      view: 'overview',
      systemId,
    };
  }

  return {
    view: 'overview',
    systemId: null,
  };
}

export function buildAppRoute(route: AppRouteState) {
  if (route.view === 'connect') {
    return '/connect';
  }

  if (!route.systemId) {
    return '/';
  }

  const encodedSystemId = encodeURIComponent(route.systemId);

  if (route.view === 'overview') {
    return `/systems/${encodedSystemId}`;
  }

  return `/systems/${encodedSystemId}/${route.view}`;
}
