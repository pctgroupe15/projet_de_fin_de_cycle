import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload } from 'lucide-react';
import type { DocumentUploadResponse } from '@/types/document';

interface FileUploadProps {
  documentType: string;
  onUploadSuccess?: (fileData: DocumentUploadResponse['data']) => void;
  onUploadError?: (error: any) => void;
  maxSize?: number; // en MB
  accept?: string;
  maxCount?: number;
  value?: File[];
  onChange?: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  documentType,
  onUploadSuccess,
  onUploadError,
  maxSize = 5,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxCount = 1,
  value = [],
  onChange,
}) => {
  const { data: session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Vérification du nombre de fichiers
    if (files.length > maxCount) {
      toast.error(`Vous ne pouvez télécharger que ${maxCount} fichier${maxCount > 1 ? 's' : ''} au maximum`);
      return;
    }

    // Vérification de la taille des fichiers
    const oversizedFiles = files.filter(file => file.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`Certains fichiers dépassent la taille maximale de ${maxSize}MB`);
      return;
    }

    if (onChange) {
      onChange(files);
    }

    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!session?.user?.email) {
      toast.error("Vous devez être connecté pour télécharger des fichiers");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('documentType', documentType);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Fichiers téléchargés avec succès");
        if (onUploadSuccess) {
          onUploadSuccess(data.data);
        }
      } else {
        throw new Error(data.message || 'Erreur lors du téléchargement');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors du téléchargement des fichiers");
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          className="relative"
          disabled={uploading}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept={accept}
            multiple={maxCount > 1}
            disabled={uploading}
          />
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Téléchargement...' : 'Sélectionner des fichiers'}
        </Button>
        <span className="text-sm text-muted-foreground">
          {maxCount > 1 ? `Jusqu'à ${maxCount} fichiers` : '1 fichier'} • Max {maxSize}MB
        </span>
      </div>

      {uploading && (
        <Progress value={uploadProgress} className="w-full" />
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
              <span className="text-sm truncate">{file.name}</span>
              <span className="text-sm text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)}MB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;