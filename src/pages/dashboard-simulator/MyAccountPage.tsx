import { useState } from "react";
import { BadgeCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { WelcomeHeader } from "@/components/dashboard-simulator/layout/WelcomeHeader";
import { useMockUser } from "@/components/auth/RequireAuth";
import { ACCOUNT_STRINGS } from "@/constants/dashboard-simulator/account.strings";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { fillTemplate, formatDateFr } from "@/components/dashboard-simulator/shared/format";

export default function MyAccountPage() {
  const user = useMockUser();
  const [emailNotifications, setEmailNotifications] = useState(user.emailNotifications);

  const personalFields: Array<[string, string, string]> = [
    ["firstName", ACCOUNT_STRINGS.fields.firstName, user.firstName],
    ["lastName", ACCOUNT_STRINGS.fields.lastName, user.lastName],
    ["email", ACCOUNT_STRINGS.fields.email, user.email],
    ["phone", ACCOUNT_STRINGS.fields.phone, user.phone],
  ];

  const companyFields: Array<[string, string, string]> = [
    ["companyName", ACCOUNT_STRINGS.fields.companyName, user.companyName],
    ["siret", ACCOUNT_STRINGS.fields.siret, user.siret],
  ];

  return (
    <div className="space-y-6">
      <WelcomeHeader title={ACCOUNT_STRINGS.title} subtitle={ACCOUNT_STRINGS.subtitle} />

      <Card className="shadow-form">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
            {user.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fillTemplate(ACCOUNT_STRINGS.memberSince, {
                date: formatDateFr(user.memberSince),
              })}
            </p>
          </div>
          <Badge variant={user.emailVerified ? "secondary" : "outline"} className="gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5" />
            {user.emailVerified ? ACCOUNT_STRINGS.emailVerified : ACCOUNT_STRINGS.emailNotVerified}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-form">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{ACCOUNT_STRINGS.personalInfoTitle}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {personalFields.map(([id, label, value]) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input id={id} defaultValue={value} className="bg-card shadow-form" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-form">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{ACCOUNT_STRINGS.companyTitle}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {companyFields.map(([id, label, value]) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input id={id} defaultValue={value} className="bg-card shadow-form" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-form">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{ACCOUNT_STRINGS.passwordTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">{ACCOUNT_STRINGS.fields.newPassword}</Label>
              <Input id="newPassword" type="password" className="bg-card shadow-form" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{ACCOUNT_STRINGS.fields.confirmPassword}</Label>
              <Input id="confirmPassword" type="password" className="bg-card shadow-form" />
            </div>
            <Button variant="outline">{ACCOUNT_STRINGS.updatePassword}</Button>
          </CardContent>
        </Card>

        <Card className="shadow-form">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{ACCOUNT_STRINGS.preferencesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="language">{ACCOUNT_STRINGS.fields.language}</Label>
              <Input id="language" defaultValue={user.language} className="bg-card shadow-form" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="notifications" className="font-normal">
                {ACCOUNT_STRINGS.emailNotifications}
              </Label>
              <Switch
                id="notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost">{COMMON_STRINGS.actions.cancel}</Button>
        <Button>{COMMON_STRINGS.actions.save}</Button>
      </div>

      <Card className="border-destructive/40 shadow-form">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">{ACCOUNT_STRINGS.deleteTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-muted-foreground">
            {ACCOUNT_STRINGS.deleteDescription}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                {ACCOUNT_STRINGS.deleteTitle}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{ACCOUNT_STRINGS.deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {ACCOUNT_STRINGS.deleteConfirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{COMMON_STRINGS.actions.cancel}</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {ACCOUNT_STRINGS.deleteConfirmCta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
