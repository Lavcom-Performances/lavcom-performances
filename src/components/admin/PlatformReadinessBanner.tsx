import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useState } from 'react';

interface ReadinessResult {
  status: 'READY' | 'NOT_READY';
  summary: {
    failed: number;
  };
}

export function PlatformReadinessBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ['platform-readiness-banner'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Check if user is platform admin
      const { data: platformRole } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .in('role', ['super_admin', 'admin'])
        .maybeSingle();

      if (!platformRole) return null;

      const response = await supabase.functions.invoke('evaluate-platform-readiness');
      if (response.error) return null;
      return response.data as ReadinessResult;
    },
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    staleTime: 5 * 60 * 1000,
  });

  // Don't show banner if ready, dismissed, or no data
  if (!data || data.status === 'READY' || dismissed) {
    return null;
  }

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Platform not ready for release — {data.summary.failed} blocker(s) detected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="text-destructive hover:text-destructive/80">
            <Link to="/admin/system-status">
              Review blockers
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive/80"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
