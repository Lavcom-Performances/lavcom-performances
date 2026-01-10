import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp,
  Map,
  AlertTriangle,
  ShieldCheck,
  Receipt,
  ScrollText
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlatformStats {
  total_users: number;
  total_sites: number;
  total_demo_sites: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expired_subscriptions: number;
  total_departments: number;
  total_regions: number;
}

export default function PlatformAdminHome() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['platform-admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_stats');
      if (error) throw error;
      return data as unknown as PlatformStats;
    },
  });

  const quickLinks = [
    { to: '/admin/users', label: 'Utilisateurs', icon: Users, color: 'text-[#7DD3E8]' },
    { to: '/admin/sites', label: 'Laveries', icon: Building2, color: 'text-[#A3C615]' },
    { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp, color: 'text-purple-400' },
    { to: '/admin/roles', label: 'Rôles', icon: ShieldCheck, color: 'text-red-400' },
    { to: '/admin/sales', label: 'Ventes', icon: CreditCard, color: 'text-[#FCD259]' },
    { to: '/admin/invoices', label: 'Factures', icon: Receipt, color: 'text-orange-400' },
    { to: '/admin/audit-logs', label: 'Logs', icon: ScrollText, color: 'text-[#A8B4D0]' },
    { to: '/admin/system-status', label: 'Système', icon: AlertTriangle, color: 'text-rose-400' },
  ];

  return (
    <>
      <SEOHead 
        title="Back-office Plateforme | Lavcom Performances"
        description="Administration de la plateforme Lavcom"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Back-office Plateforme</h1>
          <p className="text-[#A8B4D0] mt-1">
            Vue d'ensemble de la plateforme Lavcom Performances
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              <Card className="bg-[#3D4B7A]/40 border-[#5C6B9A]/50 hover:bg-[#3D4B7A]/60 hover:border-[#7DD3E8]/50 transition-all cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <link.icon className={`h-8 w-8 ${link.color} mb-2`} />
                  <span className="text-sm font-medium text-white text-center">{link.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Users */}
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#A8B4D0]">Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-[#7DD3E8]" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20 bg-[#5C6B9A]/50" />
              ) : (
                <div className="text-2xl font-bold text-white">{stats?.total_users ?? 0}</div>
              )}
              <p className="text-xs text-[#A8B4D0] mt-1">
                Inscrits sur la plateforme
              </p>
            </CardContent>
          </Card>

          {/* Sites */}
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#A8B4D0]">Laveries</CardTitle>
              <Building2 className="h-4 w-4 text-[#A3C615]" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20 bg-[#5C6B9A]/50" />
              ) : (
                <div className="text-2xl font-bold text-white">{stats?.total_sites ?? 0}</div>
              )}
              <p className="text-xs text-[#A8B4D0] mt-1">
                {stats?.total_demo_sites ?? 0} démo
              </p>
            </CardContent>
          </Card>

          {/* Subscriptions */}
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#A8B4D0]">Abonnements actifs</CardTitle>
              <CreditCard className="h-4 w-4 text-[#FCD259]" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20 bg-[#5C6B9A]/50" />
              ) : (
                <div className="text-2xl font-bold text-white">{stats?.active_subscriptions ?? 0}</div>
              )}
              <p className="text-xs text-[#A8B4D0] mt-1">
                {stats?.trial_subscriptions ?? 0} en essai, {stats?.expired_subscriptions ?? 0} expirés
              </p>
            </CardContent>
          </Card>

          {/* Geography */}
          <Card className="bg-[#3D4B7A]/30 border-[#5C6B9A]/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#A8B4D0]">Couverture</CardTitle>
              <Map className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20 bg-[#5C6B9A]/50" />
              ) : (
                <div className="text-2xl font-bold text-white">{stats?.total_departments ?? 0} dép.</div>
              )}
              <p className="text-xs text-[#A8B4D0] mt-1">
                {stats?.total_regions ?? 0} régions
              </p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="mt-6 bg-red-900/20 border-red-800/50">
            <CardContent className="py-4">
              <p className="text-red-400 text-sm">
                Erreur lors du chargement des statistiques: {error.message}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
