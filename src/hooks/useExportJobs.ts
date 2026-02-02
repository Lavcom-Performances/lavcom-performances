import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExportJob {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  role_scope: 'platform_admin' | 'saas_user';
  company_id: string | null;
  site_id: string | null;
  export_type: string;
  filters: Record<string, unknown>;
  status: 'queued' | 'running' | 'success' | 'failed' | 'expired' | 'canceled';
  progress: number;
  error_message: string | null;
  result_path: string | null;
  result_filename: string | null;
  result_mime: string;
  expires_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

interface CreateExportParams {
  export_type: string;
  filters?: Record<string, unknown>;
  site_id?: string;
}

export function useExportJobs(roleScope: 'platform_admin' | 'saas_user') {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching export jobs:', error);
        return;
      }

      // Cast data to ExportJob array
      setJobs((data || []) as unknown as ExportJob[]);
    } catch (err) {
      console.error('Error fetching export jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll for updates on running/queued jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (job) => job.status === 'queued' || job.status === 'running'
    );

    if (hasActiveJobs) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(fetchJobs, 4000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobs, fetchJobs]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const createExport = useCallback(
    async (params: CreateExportParams): Promise<string | null> => {
      setIsCreating(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-export-job', {
          body: {
            export_type: params.export_type,
            filters: params.filters || {},
            site_id: params.site_id,
          },
        });

        if (error) {
          console.error('Error creating export:', error);
          toast({
            title: 'Export failed',
            description: error.message || 'Failed to create export job',
            variant: 'destructive',
          });
          return null;
        }

        toast({
          title: 'Export started',
          description: 'Your export is being processed.',
        });

        // Refresh the list
        await fetchJobs();

        // Trigger the worker to process immediately
        try {
          await supabase.functions.invoke('run-export-job', {
            body: { job_id: data.job_id },
          });
        } catch {
          // Worker will pick it up eventually
        }

        return data.job_id;
      } catch (err) {
        console.error('Error creating export:', err);
        toast({
          title: 'Export failed',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [fetchJobs, toast]
  );

  const downloadExport = useCallback(
    async (jobId: string) => {
      try {
        const { data, error } = await supabase.functions.invoke(
          'get-export-download-url',
          {
            body: { job_id: jobId },
          }
        );

        if (error) {
          toast({
            title: 'Download failed',
            description: error.message || 'Failed to get download URL',
            variant: 'destructive',
          });
          return;
        }

        // Open the signed URL in a new tab
        window.open(data.url, '_blank');
      } catch (err) {
        console.error('Error downloading export:', err);
        toast({
          title: 'Download failed',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const cancelExport = useCallback(
    async (jobId: string) => {
      try {
        const { error } = await supabase
          .from('export_jobs')
          .update({ status: 'canceled' })
          .eq('id', jobId);

        if (error) {
          toast({
            title: 'Cancel failed',
            description: 'Failed to cancel export',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Export canceled',
          description: 'The export has been canceled.',
        });

        await fetchJobs();
      } catch (err) {
        console.error('Error canceling export:', err);
      }
    },
    [fetchJobs, toast]
  );

  return {
    jobs,
    isLoading,
    isCreating,
    createExport,
    downloadExport,
    cancelExport,
    refresh: fetchJobs,
  };
}
