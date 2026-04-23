import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FreedomProvider } from "@/lib/context";
import { AuthProvider } from "@/lib/auth-context";
import AuthGate from "@/components/auth-gate";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import Journal from "@/pages/journal";
import Community from "@/pages/community";
import Fortress from "@/pages/fortress";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/journal" component={Journal} />
        <Route path="/community" component={Community} />
        <Route path="/fortress" component={Fortress} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <FreedomProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </FreedomProvider>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
