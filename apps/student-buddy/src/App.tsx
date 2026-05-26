import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store";

// Pages
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import GenerateQuiz from "@/pages/generate-quiz";
import TakeQuiz from "@/pages/take-quiz";
import Results from "@/pages/results";
import Profile from "@/pages/profile";
import PdfLearning from "@/pages/pdf-learning";
import PdfHistory from "@/pages/pdf-history";

// --- Global Fetch Interceptor for generated API client ---
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const req = new Request(input, init);
  
  // Try to get token from Zustand's persisted store in localStorage
  try {
    const storageStr = localStorage.getItem('auth-storage');
    if (storageStr) {
      const storageObj = JSON.parse(storageStr);
      const token = storageObj?.state?.token;
      
      if (token && !req.headers.has('Authorization')) {
        req.headers.set('Authorization', `Bearer ${token}`);
      }
    }
  } catch (e) {
    console.error("Failed to parse auth storage", e);
  }

  // Common headers for JSON requests if not FormData
  if (!req.headers.has('Content-Type') && req.method !== 'GET') {
      req.headers.set('Content-Type', 'application/json');
  }

  const response = await originalFetch(req);
  
  // Basic 401 handling - could trigger a logout or refresh here
  if (response.status === 401 && !req.url.includes('/auth/login')) {
    useAuthStore.getState().logout();
    window.location.href = '/auth';
  }

  return response;
};
// ---------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Route Guard Component
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { token } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) {
      setLocation("/auth");
    }
  }, [token, setLocation]);

  if (!token) return null;
  return <Component {...rest} />;
}

// Redirect if already logged in
function AuthRoute({ component: Component, ...rest }: any) {
  const { token } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (token) {
      setLocation("/dashboard");
    }
  }, [token, setLocation]);

  if (token) return null;
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth"><AuthRoute component={Auth} /></Route>
      
      {/* Protected Routes */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/quiz/generate"><ProtectedRoute component={GenerateQuiz} /></Route>
      <Route path="/quiz/take"><ProtectedRoute component={TakeQuiz} /></Route>
      <Route path="/results/:id"><ProtectedRoute component={Results} /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
      <Route path="/pdf/learning"><ProtectedRoute component={PdfLearning} /></Route>
      <Route path="/pdf/history"><ProtectedRoute component={PdfHistory} /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
