"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface Document {
  id: string;
  type: "BirthDeclaration" | "BirthCertificate";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  citizenId: string;
  citizenName: string;
}

export default function DocumentsManagementPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [documentToReject, setDocumentToReject] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/documents");
      if (!response.ok) throw new Error("Erreur lors de la récupération des documents");
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleStatusChange = async (documentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/documents/${documentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus === "REJECTED" ? "REJECTED" :
                 newStatus === "COMPLETED" ? "COMPLETED" :
                 newStatus === "PENDING" ? "PENDING" : newStatus,
          rejectReason: newStatus === "REJECTED" ? rejectReason : null
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }

      toast({
        title: newStatus === "REJECTED" ? "Document rejeté" : "Statut mis à jour",
        description: newStatus === "REJECTED" ? "Document rejeté avec succès" : "Statut mis à jour avec succès",
      });

      fetchDocuments();
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du statut",
        variant: "destructive",
      });
    }
  };

  const handleRejectConfirm = useCallback(async () => {
    if (!documentToReject || !rejectReason.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un motif de rejet",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/documents/${documentToReject.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "rejeté",
          rejectReason: rejectReason.trim()
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de la modification du statut");

      toast({
        title: "Succès",
        description: "Document rejeté avec succès",
      });

      setIsRejectDialogOpen(false);
      setRejectReason("");
      setDocumentToReject(null);
      fetchDocuments();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rejeter le document",
        variant: "destructive",
      });
    }
  }, [documentToReject, rejectReason, fetchDocuments]);

  const handleRejectCancel = useCallback(() => {
    setIsRejectDialogOpen(false);
    setRejectReason("");
    setDocumentToReject(null);
  }, []);

  const handleViewDocument = useCallback((document: Document) => {
    setSelectedDocument(document);
    setIsDialogOpen(true);
  }, []);

  const tableContent = useMemo(() => (
    documents.map((document) => (
      <TableRow key={document.id}>
        <TableCell>
          {document.type === "BirthDeclaration" ? "Déclaration de naissance" : "Acte de naissance"}
        </TableCell>
        <TableCell>{document.citizenName}</TableCell>
        <TableCell>
          <Select
            value={document.status}
            onValueChange={(value) => handleStatusChange(document.id, value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="COMPLETED">Approuvé</SelectItem>
              <SelectItem value="REJECTED">Rejeté</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>{new Date(document.createdAt).toLocaleDateString()}</TableCell>
        <TableCell>{new Date(document.updatedAt).toLocaleDateString()}</TableCell>
        <TableCell>
          <Button
            variant="outline"
            onClick={() => handleViewDocument(document)}
            aria-label={`Voir les détails du document de ${document.citizenName}`}
          >
            Voir détails
          </Button>
        </TableCell>
      </TableRow>
    ))
  ), [documents, handleStatusChange, handleViewDocument]);

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Documents</h1>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Citoyen</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date de création</TableHead>
            <TableHead>Dernière modification</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableContent}
        </TableBody>
      </Table>

      <Dialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        aria-label="Détails du document"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du document</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="document-type">Type de document</Label>
                <p id="document-type">
                  {selectedDocument.type === "BirthDeclaration"
                    ? "Déclaration de naissance"
                    : "Acte de naissance"}
                </p>
              </div>
              <div>
                <Label htmlFor="citizen-name">Citoyen</Label>
                <p id="citizen-name">{selectedDocument.citizenName}</p>
              </div>
              <div>
                <Label htmlFor="document-status">Statut</Label>
                <Select
                  value={selectedDocument.status}
                  onValueChange={(value) => {
                    handleStatusChange(selectedDocument.id, value);
                    setIsDialogOpen(false);
                  }}
                >
                  <SelectTrigger id="document-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">En attente</SelectItem>
                    <SelectItem value="COMPLETED">Approuvé</SelectItem>
                    <SelectItem value="REJECTED">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de création</Label>
                <p>{new Date(selectedDocument.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <Label>Dernière modification</Label>
                <p>{new Date(selectedDocument.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={isRejectDialogOpen} 
        onOpenChange={setIsRejectDialogOpen}
        aria-label="Rejeter le document"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Motif du rejet</Label>
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Entrez le motif du rejet"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={handleRejectCancel}
                aria-label="Annuler le rejet"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleRejectConfirm}
                aria-label="Confirmer le rejet"
              >
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}