import { useEffect, useCallback, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UseUnsavedChangesWarningOptions {
  isDirty: boolean;
  message?: string;
}

/**
 * Hook to warn users when they try to navigate away from a page with unsaved changes.
 * Uses browser beforeunload for tab close/refresh. Does NOT use useBlocker (requires data router).
 */
export function useUnsavedChangesWarning({
  isDirty,
  message = "Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter cette page ?",
}: UseUnsavedChangesWarningOptions) {
  const [isBlocked, setIsBlocked] = useState(false);
  const pendingNavigationRef = useRef<string | null>(null);
  const navigate = useNavigate();

  // Handle browser beforeunload event (tab close, refresh, external navigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  const confirmNavigation = useCallback(() => {
    const target = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    setIsBlocked(false);
    if (target) {
      navigate(target);
    }
  }, [navigate]);

  const cancelNavigation = useCallback(() => {
    pendingNavigationRef.current = null;
    setIsBlocked(false);
  }, []);

  return {
    isBlocked,
    confirmNavigation,
    cancelNavigation,
  };
}

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

/**
 * Dialog component to display when user tries to navigate away with unsaved changes.
 */
export function UnsavedChangesDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = "Modifications non enregistrées",
  description = "Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter cette page ? Vos modifications seront perdues.",
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Rester sur la page
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Quitter sans enregistrer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
