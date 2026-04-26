import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider, useStore } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import HomeFeed from "@/pages/HomeFeed";
import Explore from "@/pages/Explore";
import CreatePlan from "@/pages/CreatePlan";
import PlanDetails from "@/pages/PlanDetails";
import Profile from "@/pages/Profile";
import Store from "@/pages/Store";
import ProductDetails from "@/pages/ProductDetails";
import Guides from "@/pages/Guides";
import Chats from "@/pages/Chats";
import Subscription from "@/pages/Subscription";
import Auth from "@/pages/Auth";
import Notifications from "@/pages/Notifications";
import SettingsPage from "@/pages/Settings";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import { SocketProvider } from "@/lib/socket";

const queryClient = new QueryClient();

function Routed() {
  const [loc] = useLocation();
  const { isLoggedIn, authLoading } = useStore();

  // Admin pages - completely separate auth flow
  if (loc === "/admin/login") return <AdminLogin />;
  if (loc === "/admin" || loc.startsWith("/admin/")) return <AdminDashboard />;

  // Auth pages - always accessible
  if (loc === "/login") return <Auth mode="signin" />;
  if (loc === "/signup" || loc === "/auth") return <Auth mode={loc === "/signup" ? "signup" : "signin"} />;

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) return <Redirect to="/login" />;

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={HomeFeed} />
        <Route path="/explore" component={Explore} />
        <Route path="/plans/new" component={CreatePlan} />
        <Route path="/plans/:id" component={PlanDetails} />
        <Route path="/profile/:username" component={Profile} />
        <Route path="/store" component={Store} />
        <Route path="/store/:id" component={ProductDetails} />
        <Route path="/guides" component={Guides} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/saved" component={SettingsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/chats" component={Chats} />
        <Route path="/subscription" component={Subscription} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StoreProvider>
          <TooltipProvider>
            <WouterRouter>
              <SocketProvider>
                <Routed />
              </SocketProvider>
            </WouterRouter>
            <Toaster position="bottom-right" richColors />
          </TooltipProvider>
        </StoreProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
