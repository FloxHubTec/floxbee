import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import ChangePasswordDialog from "@/components/auth/ChangePasswordDialog";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "supervisor" | "agente";
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isSupervisor, isAgente, mustChangePassword, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-whatsapp-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-whatsapp-teal" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role if required
  if (requiredRole) {
    const hasRole = 
      requiredRole === "admin" ? isAdmin :
      requiredRole === "supervisor" ? (isAdmin || isSupervisor) :
      requiredRole === "agente" ? (isAdmin || isSupervisor || isAgente) :
      false;

    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <>
      {/* Force password change dialog */}
      <ChangePasswordDialog 
        open={mustChangePassword} 
        onSuccess={refreshProfile} 
      />
      {children}
    </>
  );
};
