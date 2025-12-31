-- Enable realtime for site_analytics_state table
ALTER TABLE public.site_analytics_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_analytics_state;