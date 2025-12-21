import { useLoginLoggerOnAuth } from '@/hooks/useLoginLogger';

export const LoginLoggerProvider = ({ children }: { children: React.ReactNode }) => {
  useLoginLoggerOnAuth();
  return <>{children}</>;
};
