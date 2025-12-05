import { useState } from "react";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Shield, 
  ShieldCheck, 
  User, 
  Eye,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock data for V1
const mockUsers = [
  { id: "1", email: "admin@lavcom.fr", fullName: "Jean Dupont", role: "SUPER_ADMIN", isActive: true, laundromats: ["Laverie Saint-Michel", "Laverie Bastille"] },
  { id: "2", email: "marie@lavcom.fr", fullName: "Marie Martin", role: "ADMIN", isActive: true, laundromats: ["Laverie République"] },
  { id: "3", email: "pierre@lavcom.fr", fullName: "Pierre Durand", role: "CHECKER", isActive: true, laundromats: ["Laverie Saint-Michel"] },
  { id: "4", email: "sophie@lavcom.fr", fullName: "Sophie Bernard", role: "USER", isActive: true, laundromats: ["Laverie Bastille"] },
  { id: "5", email: "guest@example.com", fullName: "Invité Test", role: "GUEST", isActive: false, laundromats: [] },
];

const roleConfig: Record<string, { label: string; icon: typeof Shield; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  SUPER_ADMIN: { label: "Super Admin", icon: ShieldCheck, variant: "default" },
  ADMIN: { label: "Admin", icon: Shield, variant: "default" },
  CHECKER: { label: "Contrôleur", icon: Eye, variant: "secondary" },
  USER: { label: "Utilisateur", icon: User, variant: "outline" },
  GUEST: { label: "Invité", icon: User, variant: "outline" },
};

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = mockUsers.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Utilisateurs
          </h1>
          <p className="text-muted-foreground">
            Gérez les accès et les rôles des utilisateurs
          </p>
        </div>
        <Button variant="lavcom">
          <Plus className="h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Search */}
      <div className="card-lavcom p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card-lavcom overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Laveries</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const role = roleConfig[user.role];
              const RoleIcon = role.icon;
              
              return (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.fullName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.variant} className="gap-1">
                      <RoleIcon className="h-3 w-3" />
                      {role.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.laundromats.length > 0 ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{user.laundromats.length} laverie(s)</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                      user.isActive 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        user.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                      )} />
                      {user.isActive ? "Actif" : "Inactif"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem>Changer le rôle</DropdownMenuItem>
                        <DropdownMenuItem>Gérer les laveries</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Désactiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
