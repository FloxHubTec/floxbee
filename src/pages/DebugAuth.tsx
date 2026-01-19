import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DebugAuth: React.FC = () => {
  const { profile, user, isSuperadmin, isAdmin, isSupervisor } = useAuth();

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      <h1 className="text-2xl font-bold">Debug de Autenticação</h1>

      <Card>
        <CardHeader>
          <CardTitle>User Info (auth.users)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded overflow-auto text-xs">
            {JSON.stringify(
              {
                id: user?.id,
                email: user?.email,
                user_metadata: user?.user_metadata,
              },
              null,
              2
            )}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Info (profiles table)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded overflow-auto text-xs">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Computation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>profile?.role:</strong> <code>{profile?.role || 'undefined'}</code></p>
          <p><strong>isSuperadmin:</strong> <code>{String(isSuperadmin)}</code></p>
          <p><strong>isAdmin:</strong> <code>{String(isAdmin)}</code></p>
          <p><strong>isSupervisor:</strong> <code>{String(isSupervisor)}</code></p>
        </CardContent>
      </Card>

      <Button onClick={refreshPage}>Recarregar Dados</Button>
    </div>
  );
};

export default DebugAuth;
