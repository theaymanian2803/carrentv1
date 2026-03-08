import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (requiredRole && !hasRole(requiredRole)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
