type RouteImporter = () => Promise<unknown>;

const routeImporters: Record<string, RouteImporter> = {
  '/auth': () => import('@/pages/Auth'),
  '/': () => import('@/pages/Home'),
  '/education': () => import('@/pages/Education'),
  '/learn': () => import('@/pages/Education'),
  '/music-adventure': () => import('@/pages/MusicAdventureFixed'),
  '/funpun': () => import('@/pages/FunPun'),
  '/random-connect': () => import('@/pages/RandomConnect'),
  '/manage': () => import('@/pages/Manage'),
  '/marketplace': () => import('@/pages/Marketplace'),
  '/settings': () => import('@/pages/Settings'),
  '/chat': () => import('@/pages/Chat'),
  '/public': () => import('@/pages/Public'),
  '/media': () => import('@/pages/Media'),
  '/search': () => import('@/pages/Search'),
  '/private': () => import('@/pages/Private'),
  '/saved': () => import('@/pages/Saved'),
  '/liked': () => import('@/pages/Liked'),
  '/create': () => import('@/pages/Create'),
  '/diary': () => import('@/pages/Diary'),
  '/notifications': () => import('@/pages/Notifications'),
  '/profile': () => import('@/pages/Profile'),
};

const prefetched = new Set<string>();

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

const canPrefetchOnCurrentNetwork = () => {
  const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return !['slow-2g', '2g'].includes(String(connection.effectiveType || '').toLowerCase());
};

const resolveRouteKey = (rawPath: string): string | null => {
  if (!rawPath) return null;
  const path = rawPath.split('?')[0].split('#')[0];

  if (routeImporters[path]) return path;
  if (path.startsWith('/chat/')) return '/chat';
  if (path.startsWith('/profile/')) return '/profile';
  if (path.startsWith('/marketplace/')) return '/marketplace';
  return null;
};

export const prefetchRoute = (path: string) => {
  if (!canPrefetchOnCurrentNetwork()) return;

  const key = resolveRouteKey(path);
  if (!key || prefetched.has(key)) return;

  const importer = routeImporters[key];
  if (!importer) return;

  prefetched.add(key);
  importer().catch(() => {
    prefetched.delete(key);
  });
};

export const prefetchRoutes = (paths: string[]) => {
  paths.forEach(prefetchRoute);
};
