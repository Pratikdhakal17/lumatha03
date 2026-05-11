import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SplashScreen } from '@/components/SplashScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useGlobalProtection, GlobalWatermark, GlobalBlurOverlay } from '@/components/GlobalContentProtection';
import { AppPinLock } from '@/components/AppPinLock';
import { useAutoTheme } from '@/hooks/useAutoTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedSkeleton, PostCardSkeleton } from '@/components/ui/skeleton-loaders';
import { prefetchRoutes } from '@/lib/routePrefetch';

// Lazy-load pages for faster initial load
const Home = lazy(() => import('@/pages/Home'));
const Education = lazy(() => import('@/pages/Education'));
const MusicAdventure = lazy(() => import('@/pages/MusicAdventureFixed'));
const FunPun = lazy(() => import('@/pages/FunPun'));
const RandomConnect = lazy(() => import('@/pages/RandomConnect'));
const Marketplace = lazy(() => import('@/pages/Marketplace'));
const Manage = lazy(() => import('@/pages/Manage'));
const MarketplaceProfile = lazy(() => import('@/pages/MarketplaceProfile'));
const MarketplaceEditProfile = lazy(() => import('@/pages/MarketplaceEditProfile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Auth = lazy(() => import('@/pages/Auth'));
const Profile = lazy(() => import('@/pages/Profile'));
const Chat = lazy(() => import('@/pages/Chat'));
const Public = lazy(() => import('@/pages/Public'));
const Media = lazy(() => import('@/pages/Media'));
const Private = lazy(() => import('@/pages/Private'));
const Saved = lazy(() => import('@/pages/Saved'));
const Liked = lazy(() => import('@/pages/Liked'));
const Create = lazy(() => import('@/pages/Create'));
const Diary = lazy(() => import('@/pages/Diary'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Search = lazy(() => import('@/pages/Search'));
const PerformanceDebug = lazy(() => import('@/pages/PerformanceDebug'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageLoader() {
  return (
    <div className="p-4 animate-page-enter">
      <FeedSkeleton count={2} />
    </div>
  );
}

// ProtectedRoute component - redirects to /auth if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect to auth page if not logged in
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

// Auth route wrapper - redirects to home if already logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user) {
    // Redirect to home if already logged in
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function Index() {
  useEffect(() => {
    let cancelled = false;
    type IdleWindow = Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleWindow = window as IdleWindow;

    const prefetchHeavyRoutes = () => {
      if (cancelled) return;
      prefetchRoutes(['/chat', '/marketplace', '/music-adventure', '/education', '/search', '/profile/me']);
    };

    const timeoutId = window.setTimeout(prefetchHeavyRoutes, 3500);
    let idleId: number | undefined;
    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(prefetchHeavyRoutes, { timeout: 5000 });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (idleId !== undefined && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <SplashScreen />
      <AppPinLock>
        <BrowserRouter>
          <AuthProvider>
            <ProtectionLayer />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Auth route - no Layout wrapper, no sidebar */}
                <Route path="/auth" element={
                  <AuthRoute>
                    <div className="animate-page-enter">
                      <Auth />
                    </div>
                  </AuthRoute>
                } />
                
                {/* Protected routes - with Layout wrapper */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <Layout>
                      <div className="animate-page-enter">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/funpun" element={<FunPun />} />
                          <Route path="/education" element={<Education />} />
                          <Route path="/learn" element={<Education />} />
                          <Route path="/music-adventure" element={<MusicAdventure />} />
                          <Route path="/random-connect" element={<RandomConnect />} />
                          <Route path="/manage" element={<Manage />} />
                          <Route path="/marketplace" element={<Marketplace />} />
                          <Route path="/marketplace/profile/:userId" element={<MarketplaceProfile />} />
                          <Route path="/marketplace/edit-profile" element={<MarketplaceEditProfile />} />
                          <Route path="/marketplace/profile/edit" element={<MarketplaceEditProfile />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/profile/:userId" element={<Profile />} />
                          <Route path="/chat/:userId?" element={<Chat />} />
                          <Route path="/public" element={<Public />} />
                          <Route path="/media" element={<Media />} />
                          <Route path="/private" element={<Private />} />
                          <Route path="/saved" element={<Saved />} />
                          <Route path="/liked" element={<Liked />} />
                          <Route path="/create" element={<Create />} />
                          <Route path="/diary" element={<Diary />} />
                          <Route path="/notifications" element={<Notifications />} />
                          <Route path="/search" element={<Search />} />
                          <Route path="/privacy" element={<Privacy />} />
                          <Route path="/terms" element={<Terms />} />
                          <Route path="/debug/perf" element={<PerformanceDebug />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </Layout>
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </AppPinLock>
    </ErrorBoundary>
  );
}

function ProtectionLayer() {
  const { username } = useGlobalProtection();
  useAutoTheme();
  return (
    <>
      <GlobalWatermark username={username} />
      <GlobalBlurOverlay />
    </>
  );
}
