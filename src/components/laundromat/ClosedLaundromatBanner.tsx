import { Alert, AlertDescription } from '@/components/ui/alert';
import { PowerOff } from 'lucide-react';

interface ClosedLaundromatBannerProps {
  siteName?: string;
}

export function ClosedLaundromatBanner({ siteName }: ClosedLaundromatBannerProps) {
  return (
    <Alert className="border-amber-300 bg-amber-50">
      <PowerOff className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <span className="font-medium">
          {siteName ? `${siteName} est fermée` : 'Cette laverie est fermée'}
        </span>
        {' — '}
        Mode lecture seule. Les importations et modifications sont désactivées.
      </AlertDescription>
    </Alert>
  );
}
