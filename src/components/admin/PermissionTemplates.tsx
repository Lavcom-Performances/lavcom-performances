import { Eye, Edit, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PermissionKey } from "@/hooks/useUserPermissions";

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof Eye;
  color: string;
  permissions: Partial<Record<PermissionKey, boolean>>;
}

export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'readonly',
    name: 'Lecture seule',
    description: 'Peut voir les laveries et rapports sans modification',
    icon: Eye,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    permissions: {
      can_view_sites: true,
      can_edit_sites: false,
      can_delete_sites: false,
      can_import_data: false,
      can_export_data: false,
      can_delete_data: false,
      can_view_reports: true,
      can_export_reports: false,
      can_invite_members: false,
      can_manage_roles: false,
      can_view_billing: false,
      can_manage_billing: false,
    },
  },
  {
    id: 'editor',
    name: 'Éditeur',
    description: 'Peut modifier les laveries et importer/exporter des données',
    icon: Edit,
    color: 'bg-green-100 text-green-700 border-green-200',
    permissions: {
      can_view_sites: true,
      can_edit_sites: true,
      can_delete_sites: false,
      can_import_data: true,
      can_export_data: true,
      can_delete_data: false,
      can_view_reports: true,
      can_export_reports: true,
      can_invite_members: false,
      can_manage_roles: false,
      can_view_billing: false,
      can_manage_billing: false,
    },
  },
  {
    id: 'manager',
    name: 'Gestionnaire',
    description: 'Accès complet sauf facturation et gestion des rôles',
    icon: Settings,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    permissions: {
      can_view_sites: true,
      can_edit_sites: true,
      can_delete_sites: true,
      can_import_data: true,
      can_export_data: true,
      can_delete_data: true,
      can_view_reports: true,
      can_export_reports: true,
      can_invite_members: true,
      can_manage_roles: false,
      can_view_billing: true,
      can_manage_billing: false,
    },
  },
];

interface PermissionTemplatesProps {
  userId: string;
  userName: string;
  onApplyTemplate: (userId: string, permissions: Partial<Record<PermissionKey, boolean>>) => void;
  disabled?: boolean;
}

export function PermissionTemplates({
  userId,
  userName,
  onApplyTemplate,
  disabled = false,
}: PermissionTemplatesProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              Template
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          Appliquer un template de permissions
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Templates pour {userName}</p>
          <p className="text-xs text-muted-foreground">
            Choisissez un profil de permissions prédéfini
          </p>
        </div>
        <DropdownMenuSeparator />
        {PERMISSION_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <DropdownMenuItem
              key={template.id}
              onClick={() => onApplyTemplate(userId, template.permissions)}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className={`p-2 rounded-md ${template.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{template.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {Object.values(template.permissions).filter(Boolean).length} droits
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {template.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Component to display which template matches current permissions
export function PermissionTemplateMatch({
  currentPermissions,
}: {
  currentPermissions: Partial<Record<PermissionKey, boolean>>;
}) {
  const matchingTemplate = PERMISSION_TEMPLATES.find((template) => {
    return Object.entries(template.permissions).every(([key, value]) => {
      return currentPermissions[key as PermissionKey] === value;
    });
  });

  if (!matchingTemplate) return null;

  const Icon = matchingTemplate.icon;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className={`text-[10px] ${matchingTemplate.color}`}>
          <Icon className="h-3 w-3 mr-1" />
          {matchingTemplate.name}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{matchingTemplate.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
