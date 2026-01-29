import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Inbox from "./pages/Inbox";
import Contacts from "./pages/Contacts";
import Tickets from "./pages/Tickets";
import Campaigns from "./pages/Campaigns";
import QRCodes from "./pages/QRCodes";
import LandingPages from "./pages/LandingPages";
import Templates from "./pages/Templates";
import Automations from "./pages/Automations";
import AIService from "./pages/AIService";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PublicRegister from "./pages/PublicRegister";
import PublicLandingPage from "./pages/PublicLandingPage";
import PublicQRCodeRedirect from "./pages/PublicQRCodeRedirect";
import ApiDocs from "./pages/ApiDocs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Departments from "./pages/Departments";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* CORREÇÃO: AuthProvider DEVE vir primeiro (por fora) */}
      <AuthProvider>
        {/* Agora o TenantProvider consegue acessar o useAuth */}
        <TenantProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/cadastro" element={<PublicRegister />} />
              <Route path="/lp/:slug" element={<PublicLandingPage />} />
              <Route path="/qr/:id" element={<PublicQRCodeRedirect />} />
              <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
              <Route path="/termos-de-uso" element={<TermsOfService />} />

              {/* Protected routes */}
              <Route element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/qr-codes" element={<QRCodes />} />
                <Route path="/landing-pages" element={<LandingPages />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/automations" element={<Automations />} />
                <Route path="/ai-service" element={<AIService />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/api-docs" element={<ApiDocs />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TenantProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;