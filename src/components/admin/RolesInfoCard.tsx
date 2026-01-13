import { Shield, ShieldCheck, Eye, User, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_DESCRIPTIONS, DEFAULT_ROLE_PERMISSIONS, UserRole } from "@/types/permissions";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  SUPER_ADMIN: ShieldCheck,
  COMPANY_ADMIN: Shield,
  ADMIN: Shield, // Legacy
  CHECKER: Eye,
  USER: User,
  GUEST: UserX,
};

// Only show non-deprecated roles in UI
const ROLE_ORDER: UserRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'CHECKER', 'USER', 'GUEST'];

export function RolesInfoCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Hiérarchie des rôles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ROLE_ORDER.map((role, index) => {
          const Icon = ROLE_ICONS[role];
          const info = ROLE_DESCRIPTIONS[role];
          const permissionCount = DEFAULT_ROLE_PERMISSIONS[role].length;
          
          return (
            <div 
              key={role}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                "hover:bg-muted/50"
              )}
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${info.color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: info.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{info.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {permissionCount} permissions
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {info.description}
                </p>
                {role === 'SUPER_ADMIN' && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    ⚠️ Ne peut pas être supprimé ou rétrogradé
                  </p>
                )}
                {role === 'GUEST' && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    ℹ️ Rôle par défaut des nouveaux utilisateurs
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
