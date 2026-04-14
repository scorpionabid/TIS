import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DebugProvider } from "@/contexts/DebugContext";
import WebSocketProvider from "@/contexts/WebSocketContext";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EnhancedDebugPanel } from "@/components/debug/EnhancedDebugPanel";
import queryClient from "@/lib/queryClient";
import { AppRoutes } from "@/routes";
import "@/utils/debugHelpers";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DebugProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <Toaster />
            <EnhancedDebugPanel />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </WebSocketProvider>
      </DebugProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
