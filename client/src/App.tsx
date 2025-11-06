import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import Home from "@/pages/home";
import Terms from "@/pages/terms";
import Team from "@/pages/team";
import Contact from "@/pages/contact";
import AuthPage from "@/pages/auth-page";
import VerifyEmailPage from "@/pages/verify-email";
import Giveaway from "@/pages/giveaway";
import AdminPage from "@/pages/admin";
import TermsOfUse from "@/pages/terms-of-use";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

const pageVariantsReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1],
};

function Router() {
  const [location] = useLocation();
  const shouldReduceMotion = useReducedMotion();
  
  useScrollToTop();
  
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-200px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={shouldReduceMotion ? pageVariantsReduced : pageVariants}
            transition={pageTransition}
            className="w-full"
          >
            <Switch location={location}>
              <Route path="/" component={Home} />
              <Route path="/pravila" component={Terms} />
              <Route path="/tim" component={Team} />
              <Route path="/kontakt" component={Contact} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/prijava" component={AuthPage} />
              <Route path="/registracija" component={AuthPage} />
              <Route path="/verify-email" component={VerifyEmailPage} />
              <Route path="/uslovi-koriscenja" component={TermsOfUse} />
              <ProtectedRoute path="/giveaway" component={Giveaway} />
              <ProtectedRoute path="/admin" component={AdminPage} />
              <ProtectedRoute path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <EditModeProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </EditModeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
