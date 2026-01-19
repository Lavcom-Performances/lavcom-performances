import React from 'react';
import { FileText, Upload, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecureFileUpload } from '@/components/storage/SecureFileUpload';
import { SecureFileBrowser } from '@/components/storage/SecureFileBrowser';

export default function DocumentsContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
          <CardDescription>
            Manage your files securely. Upload documents, images, and other files with automatic encryption.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="browse" className="space-y-4">
            <TabsList>
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Browse Files
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-4">
              <SecureFileBrowser 
                subfolder="documents"
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Drag and drop files or click to browse. Files are stored securely and can only be accessed by you.
                </p>
                <SecureFileUpload
                  subfolder="documents"
                  multiple={true}
                  maxFiles={10}
                  onUploadComplete={(files) => {
                    console.log('Uploaded files:', files);
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Max file size</p>
              <p className="font-medium">10 MB</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Allowed types</p>
              <p className="font-medium">Images, PDF, CSV, XLSX, DOCX</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Security</p>
              <p className="font-medium">Private bucket with signed URLs</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Access</p>
              <p className="font-medium">Owner only (RLS protected)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
