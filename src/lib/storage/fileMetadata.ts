import { supabase } from "@/integrations/supabase/client";

export interface FileMetadata {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  tags: string[];
  is_public: boolean;
  shared_with: string[];
  share_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMetadataParams {
  filePath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateMetadataParams {
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  sharedWith?: string[];
  shareExpiresAt?: string | null;
}

/**
 * Creates metadata for an uploaded file
 */
export async function createFileMetadata(
  params: CreateMetadataParams
): Promise<{ data?: FileMetadata; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const { data, error } = await supabase
    .from('file_metadata')
    .insert({
      user_id: user.id,
      file_path: params.filePath,
      file_name: params.fileName,
      file_size: params.fileSize ?? null,
      mime_type: params.mimeType ?? null,
      description: params.description ?? null,
      tags: params.tags ?? [],
      is_public: params.isPublic ?? false,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: data as FileMetadata };
}

/**
 * Gets metadata for a file by path
 */
export async function getFileMetadata(
  filePath: string
): Promise<{ data?: FileMetadata; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const { data, error } = await supabase
    .from('file_metadata')
    .select('*')
    .eq('file_path', filePath)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  return { data: data as FileMetadata | undefined };
}

/**
 * Gets all file metadata for the current user
 */
export async function listFileMetadata(options?: {
  tags?: string[];
  isPublic?: boolean;
  limit?: number;
}): Promise<{ data?: FileMetadata[]; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  let query = supabase
    .from('file_metadata')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (options?.tags && options.tags.length > 0) {
    query = query.contains('tags', options.tags);
  }

  if (options?.isPublic !== undefined) {
    query = query.eq('is_public', options.isPublic);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { data: data as FileMetadata[] };
}

/**
 * Updates metadata for a file
 */
export async function updateFileMetadata(
  filePath: string,
  updates: UpdateMetadataParams
): Promise<{ data?: FileMetadata; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const updateData: Record<string, unknown> = {};
  
  if (updates.description !== undefined) {
    updateData.description = updates.description;
  }
  if (updates.tags !== undefined) {
    updateData.tags = updates.tags;
  }
  if (updates.isPublic !== undefined) {
    updateData.is_public = updates.isPublic;
  }
  if (updates.sharedWith !== undefined) {
    updateData.shared_with = updates.sharedWith;
  }
  if (updates.shareExpiresAt !== undefined) {
    updateData.share_expires_at = updates.shareExpiresAt;
  }

  const { data, error } = await supabase
    .from('file_metadata')
    .update(updateData)
    .eq('file_path', filePath)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: data as FileMetadata };
}

/**
 * Deletes metadata for a file
 */
export async function deleteFileMetadata(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Authentication required' };
  }

  const { error } = await supabase
    .from('file_metadata')
    .delete()
    .eq('file_path', filePath)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Gets all unique tags used by the current user
 */
export async function getUserTags(): Promise<{ tags?: string[]; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const { data, error } = await supabase
    .from('file_metadata')
    .select('tags')
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  const allTags = new Set<string>();
  data?.forEach(row => {
    (row.tags as string[] || []).forEach(tag => allTags.add(tag));
  });

  return { tags: Array.from(allTags).sort() };
}

/**
 * Searches files by tags, name, or description
 */
export async function searchFiles(
  query: string
): Promise<{ data?: FileMetadata[]; error?: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const { data, error } = await supabase
    .from('file_metadata')
    .select('*')
    .eq('user_id', user.id)
    .or(`file_name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: data as FileMetadata[] };
}
