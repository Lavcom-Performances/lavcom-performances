import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthUser {
  id: string;
  email: string | undefined;
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

// Verify user from authorization header
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  
  if (authError || !user) {
    return { user: null, error: authError?.message || 'Unauthorized' };
  }

  return {
    user: { id: user.id, email: user.email },
    error: null
  };
}

// Get service role client for privileged operations
export function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Check if user has platform admin role
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const serviceClient = getServiceClient();
  
  const { data, error } = await serviceClient
    .from('platform_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'super_admin'])
    .limit(1);

  if (error) {
    console.error('Error checking platform admin:', error);
    return false;
  }

  return data && data.length > 0;
}
