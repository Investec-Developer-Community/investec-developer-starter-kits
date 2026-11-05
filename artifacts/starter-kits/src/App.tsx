import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Library from '@/pages/library';
import KitDetail from '@/pages/kit-detail';
import GettingStarted from '@/pages/getting-started';
import Reference from '@/pages/reference';
import { Shell } from '@/components/shell';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  useEffect(() => {
    const scroll = () => {
      if (window.location.hash) {
        document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
    };
    const frame = requestAnimationFrame(scroll);
    window.addEventListener('hashchange', scroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('hashchange', scroll); };
  }, [location]);
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Library} />
          <Route path="/kits/:slug" component={KitDetail} />
          <Route path="/saved"><Redirect to="/" replace /></Route>
          <Route path="/getting-started" component={GettingStarted} />
          <Route path="/reference" component={Reference} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
