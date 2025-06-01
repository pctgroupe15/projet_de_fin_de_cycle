import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface BirthCertificateUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile?: File;
}

export function BirthCertificateUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
}: BirthCertificateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast.error('Le fichier doit être au format PDF ou image');
      return;
    }

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 5MB');
      return;
    }

    setIsUploading(true);
    try {
      onFileSelect(file);
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      toast.error('Une erreur est survenue lors de la sélection du fichier');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Certificat de naissance</Label>
      <div className="flex items-center space-x-4">
        <Input
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileChange}
          disabled={isUploading || !!selectedFile}
          className="hidden"
          id="birth-certificate"
        />
        <Label
          htmlFor="birth-certificate"
          className="flex items-center justify-center px-4 py-2 border border-dashed rounded-md cursor-pointer hover:bg-muted/50"
        >
          <Upload className="w-4 h-4 mr-2" />
          {selectedFile ? 'Fichier sélectionné' : 'Sélectionner un fichier'}
        </Label>
        {selectedFile && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {selectedFile.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onFileRemove}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 