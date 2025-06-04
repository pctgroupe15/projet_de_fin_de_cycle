"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface DocumentType {
  id: string;
  name: string;
  description: string;
  requiredFields: string[];
  isActive: boolean;
  price: number;
}

export default function DocumentTypesPage() {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    requiredFields: [""],
    isActive: true,
    price: 0
  });

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const fetchDocumentTypes = async () => {
    try {
      const response = await fetch("/api/admin/document-types");
      if (!response.ok) throw new Error("Erreur lors de la récupération des types de documents");
      const data = await response.json();
      setDocumentTypes(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les types de documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedType 
        ? `/api/admin/document-types/${selectedType.id}`
        : "/api/admin/document-types";
      
      const response = await fetch(url, {
        method: selectedType ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erreur lors de l'opération");

      toast({
        title: "Succès",
        description: selectedType 
          ? "Type de document mis à jour avec succès"
          : "Type de document créé avec succès",
      });

      setIsDialogOpen(false);
      fetchDocumentTypes();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type de document ?")) return;

    try {
      const response = await fetch(`/api/admin/document-types/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      toast({
        title: "Succès",
        description: "Type de document supprimé avec succès",
      });

      fetchDocumentTypes();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le type de document",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (type: DocumentType) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      description: type.description,
      requiredFields: type.requiredFields,
      isActive: type.isActive,
      price: type.price
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedType(null);
    setFormData({
      name: "",
      description: "",
      requiredFields: [""],
      isActive: true,
      price: 0
    });
    setIsDialogOpen(true);
  };

  const addRequiredField = () => {
    setFormData(prev => ({
      ...prev,
      requiredFields: [...prev.requiredFields, ""]
    }));
  };

  const removeRequiredField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredFields: prev.requiredFields.filter((_, i) => i !== index)
    }));
  };

  const updateRequiredField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      requiredFields: prev.requiredFields.map((field, i) => 
        i === index ? value : field
      )
    }));
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Types de Documents</h1>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un type
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell>{type.name}</TableCell>
                <TableCell>{type.description}</TableCell>
                <TableCell>{type.price} €</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    type.isActive 
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {type.isActive ? "Actif" : "Inactif"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(type)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(type.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedType ? "Modifier le type" : "Ajouter un type"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Prix (€)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Champs requis</Label>
                {formData.requiredFields.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={field}
                      onChange={(e) => updateRequiredField(index, e.target.value)}
                      placeholder="Nom du champ"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeRequiredField(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRequiredField}
                >
                  Ajouter un champ
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Actif</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {selectedType ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}