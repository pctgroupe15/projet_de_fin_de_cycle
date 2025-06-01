'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import FileUpload from '@/components/FileUpload';
import type { DocumentUploadResponse } from '@/types/document';

export default function TestUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<DocumentUploadResponse['data'][]>([]);

  const handleUploadSuccess = (fileData: DocumentUploadResponse['data']) => {
    console.log('Fichier uploadé avec succès:', fileData);
    setUploadedFiles(prev => [...prev, fileData]);
    toast.success('Fichier uploadé avec succès !');
  };

  const handleUploadError = (error: any) => {
    console.error('Erreur lors de l\'upload:', error);
    toast.error('Erreur lors de l\'upload du fichier');
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Test d'Upload de Fichiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Test Upload Pièce d'Identité</h3>
              <FileUpload
                documentType="id_proof"
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                maxSize={2}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Test Upload Document</h3>
              <FileUpload
                documentType="document"
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                maxSize={2}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Fichiers Uploadés</h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p><span className="font-medium">Nom:</span> {file.fileName}</p>
                          <p><span className="font-medium">Type:</span> {file.fileType}</p>
                          <p><span className="font-medium">Taille:</span> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          <p>
                            <span className="font-medium">URL:</span>{' '}
                            <a 
                              href={file.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {file.fileUrl}
                            </a>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 