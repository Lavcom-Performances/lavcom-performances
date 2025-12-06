// Types for the permissions system

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CHECKER' | 'USER' | 'GUEST';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'operations' | 'charts' | 'admin' | 'settings';
}

export interface RolePermissions {
  role: UserRole;
  permissions: Record<string, boolean>;
}

export interface UserWithPermissions {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  laundromats: string[];
  customPermissions?: Record<string, boolean>;
}

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  GUEST: 0,
  USER: 1,
  CHECKER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, { label: string; description: string; color: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Accès total à toutes les fonctionnalités. Peut gérer tous les utilisateurs et permissions.',
    color: 'hsl(var(--primary))',
  },
  ADMIN: {
    label: 'Admin',
    description: 'Peut gérer les utilisateurs (sauf Super Admin) et modifier les permissions.',
    color: 'hsl(142, 70%, 45%)',
  },
  CHECKER: {
    label: 'Contrôleur',
    description: 'Accès en lecture aux données et rapports. Peut vérifier les opérations.',
    color: 'hsl(200, 70%, 50%)',
  },
  USER: {
    label: 'Utilisateur',
    description: 'Accès limité aux fonctionnalités de base du tableau de bord.',
    color: 'hsl(280, 60%, 55%)',
  },
  GUEST: {
    label: 'Invité',
    description: 'Accès en lecture seule. Rôle par défaut pour les nouveaux utilisateurs.',
    color: 'hsl(0, 0%, 50%)',
  },
};

// Available permissions
export const AVAILABLE_PERMISSIONS: Permission[] = [
  // Dashboard
  { id: 'dashboard_view', name: 'Tableau de bord', description: 'Voir le tableau de bord principal', category: 'dashboard' },
  { id: 'dashboard_kpi', name: 'KPIs', description: 'Voir les indicateurs clés', category: 'dashboard' },
  { id: 'dashboard_revenue', name: 'Chiffre d\'affaires', description: 'Voir les données de CA', category: 'dashboard' },
  
  // Operations
  { id: 'operations_view', name: 'Opérations', description: 'Accéder à la page opérations', category: 'operations' },
  { id: 'operations_machines', name: 'Machines', description: 'Voir les données machines', category: 'operations' },
  { id: 'operations_products', name: 'Produits', description: 'Voir les données produits', category: 'operations' },
  
  // Charts
  { id: 'charts_daily', name: 'CA Journalier', description: 'Graphiques journaliers', category: 'charts' },
  { id: 'charts_monthly', name: 'CA Mensuel', description: 'Graphiques mensuels', category: 'charts' },
  { id: 'charts_annual', name: 'Comparaison annuelle', description: 'Comparaisons annuelles', category: 'charts' },
  { id: 'charts_frequency', name: 'Fréquences', description: 'Analyses de fréquence', category: 'charts' },
  { id: 'charts_heatmap', name: 'Heatmap', description: 'Carte de chaleur des ventes', category: 'charts' },
  { id: 'charts_payments', name: 'Paiements', description: 'Distribution des paiements', category: 'charts' },
  { id: 'charts_machines', name: 'Types de machines', description: 'Analyse par type de machine', category: 'charts' },
  { id: 'charts_occupancy', name: 'Taux occupation', description: 'Taux d\'occupation', category: 'charts' },
  { id: 'charts_products', name: 'CA Produits', description: 'CA par produit', category: 'charts' },
  
  // Settings
  { id: 'settings_laundromat', name: 'Paramètres laverie', description: 'Modifier les paramètres', category: 'settings' },
  { id: 'settings_import', name: 'Import/Export', description: 'Importer ou exporter des données', category: 'settings' },
  
  // Admin
  { id: 'admin_users', name: 'Gestion utilisateurs', description: 'Gérer les utilisateurs', category: 'admin' },
  { id: 'admin_permissions', name: 'Gestion permissions', description: 'Modifier les permissions', category: 'admin' },
  { id: 'admin_roles', name: 'Gestion rôles', description: 'Modifier les rôles', category: 'admin' },
];

// Default permissions by role
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: AVAILABLE_PERMISSIONS.map(p => p.id), // All permissions
  ADMIN: [
    'dashboard_view', 'dashboard_kpi', 'dashboard_revenue',
    'operations_view', 'operations_machines', 'operations_products',
    'charts_daily', 'charts_monthly', 'charts_annual', 'charts_frequency',
    'charts_heatmap', 'charts_payments', 'charts_machines', 'charts_occupancy', 'charts_products',
    'settings_laundromat', 'settings_import',
    'admin_users', 'admin_permissions',
  ],
  CHECKER: [
    'dashboard_view', 'dashboard_kpi', 'dashboard_revenue',
    'operations_view', 'operations_machines', 'operations_products',
    'charts_daily', 'charts_monthly', 'charts_frequency', 'charts_heatmap',
  ],
  USER: [
    'dashboard_view', 'dashboard_kpi',
    'operations_view',
    'charts_daily', 'charts_monthly',
  ],
  GUEST: [
    'dashboard_view',
  ],
};

// Check if a role can manage another role
export const canManageRole = (managerRole: UserRole, targetRole: UserRole): boolean => {
  if (managerRole === 'SUPER_ADMIN') return true;
  if (managerRole === 'ADMIN' && targetRole !== 'SUPER_ADMIN' && targetRole !== 'ADMIN') return true;
  return false;
};

// Check if a role can delete another role
export const canDeleteUser = (managerRole: UserRole, targetRole: UserRole): boolean => {
  if (managerRole === 'SUPER_ADMIN' && targetRole !== 'SUPER_ADMIN') return true;
  if (managerRole === 'ADMIN' && targetRole !== 'SUPER_ADMIN' && targetRole !== 'ADMIN') return true;
  return false;
};
