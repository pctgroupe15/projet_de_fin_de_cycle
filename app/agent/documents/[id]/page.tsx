"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AgentLayout } from '@/components/layouts/agent-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Download, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  type: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BirthCertificateRequest {
  id: string;
  citizenId: string;
  fullName: string;
  birthDate: Date;
  birthPlace: string;
  fatherFullName?: string;
  motherFullName?: string;
  acteNumber?: string;
  status: string;
  rejectReason?: string;
  trackingNumber: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  agentId?: string;
  citizen: {
    name: string;
    email: string;
  };
  files: Document[];
}

const DocumentDetails = ({ params }: { params: { id: string } }) => {
  const [request, setRequest] = useState<BirthCertificateRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [comment, setComment] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();

  const fetchRequestDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/agent/birth-certificates/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setRequest(data.data);
        setComment(data.data.comment || '');
      } else {
        toast.error(data.message || 'Erreur lors de la récupération des détails');
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Erreur lors de la récupération des détails');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const updateRequestStatus = useCallback(async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/agent/birth-certificates?id=${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          comment: comment,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Statut mis à jour avec succès');
        fetchRequestDetails();
        setIsModalOpen(false);
      } else {
        toast.error(data.message || 'Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdating(false);
    }
  }, [params.id, comment, fetchRequestDetails]);

  const getStatusVariant = useCallback((status: string): "default" | "secondary" | "destructive" | "success" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "success"> = {
      en_attente: "secondary",
      approuvé: "success",
      rejeté: "destructive"
    };
    return variants[status] || "default";
  }, []);

  const getStatusText = useCallback((status: string) => {
    const texts = {
      en_attente: 'En attente',
      approuvé: 'Approuvé',
      rejeté: 'Rejeté'
    };
    return texts[status as keyof typeof texts] || status;
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  }, []);

  const handleOk = useCallback(async () => {
    const newStatus = request?.status === 'en_attente' ? 'approuvé' : 'rejeté';
    setUpdating(true);

    if (newStatus === 'approuvé') {
      if (!selectedFile) {
        toast.warning('Veuillez joindre le document final pour valider la demande.');
        setUpdating(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const uploadResponse = await fetch(`/api/agent/birth-certificates/${params.id}/upload-final-document`, {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadData.success) {
          toast.error(uploadData.message || 'Erreur lors du téléversement du document final.');
          setUpdating(false);
          return;
        }

        await updateRequestStatus(newStatus);

      } catch (error) {
        console.error('Error uploading final document:', error);
        toast.error('Erreur lors du téléversement du document final.');
        setUpdating(false);
      }

    } else {
      await updateRequestStatus(newStatus);
    }
  }, [request?.status, selectedFile, params.id, updateRequestStatus]);

  const showModal = useCallback((statusToUpdate: 'approuvé' | 'rejeté') => {
    if (statusToUpdate === 'approuvé') {
      setSelectedFile(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setComment('');
    setSelectedFile(null);
  }, []);

  const handleBack = useCallback(() => {
    router.push('/agent/documents');
  }, [router]);

  const documentFiles = useMemo(() => {
    if (!request?.files) return null;

    return request.files.map((file) => (
      <Card key={file.id}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium mb-2">
                {file.type === 'DEMANDEUR_ID' ? 'Pièce d\'identité du demandeur' : 
                 file.type === 'EXISTING_ACTE' ? 'Acte existant' : 
                 file.type === 'ACTE_NAISSANCE_FINAL' ? 'Acte de naissance final' : 
                 file.type}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </a>
                </Button>
                {(file.type === 'DEMANDEUR_ID' || file.type === 'EXISTING_ACTE') && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      Voir le document
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  }, [request?.files]);

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AgentLayout>
    );
  }

  if (!request) {
    return (
      <AgentLayout>
        <div className="p-6">
          <h2 className="text-2xl font-bold">Demande non trouvée</h2>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <div className="p-6 space-y-6">
        <Button 
          variant="ghost"
          className="mb-4"
          onClick={handleBack}
          aria-label="Retour à la liste des documents"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Détails de la demande</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Numéro de suivi</p>
                <p>{request.trackingNumber}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge variant={getStatusVariant(request.status)}>
                    {getStatusText(request.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de la demande</p>
                  <p>{new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
                  <p>{new Date(request.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations du demandeur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p>{request.citizen.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{request.citizen.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations de l'acte de naissance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom complet</p>
                <p>{request.fullName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date de naissance</p>
                  <p>{new Date(request.birthDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lieu de naissance</p>
                  <p>{request.birthPlace}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom du père</p>
                  <p>{request.fatherFullName || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nom de la mère</p>
                  <p>{request.motherFullName || 'Non renseigné'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents fournis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentFiles}
            </div>
          </CardContent>
        </Card>

        {request.status === 'en_attente' && (
          <div className="flex gap-4">
            <Button
              onClick={() => showModal('approuvé')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approuver
            </Button>
            <Button
              onClick={() => showModal('rejeté')}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Rejeter
            </Button>
          </div>
        )}

        <Dialog 
          open={isModalOpen} 
          onOpenChange={setIsModalOpen}
          aria-label="Confirmer l'action"
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {request.status === 'en_attente' ? 'Approuver la demande' : 'Rejeter la demande'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="comment" className="text-sm font-medium">
                  Commentaire
                </label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ajoutez un commentaire..."
                  className="mt-2"
                />
              </div>
              {request.status === 'en_attente' && (
                <div>
                  <label htmlFor="final-document" className="text-sm font-medium">
                    Document final
                  </label>
                  <input
                    id="final-document"
                    type="file"
                    onChange={handleFileChange}
                    className="mt-2"
                    accept=".pdf,.doc,.docx"
                    aria-label="Sélectionner le document final"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                aria-label="Annuler l'action"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleOk} 
                disabled={updating}
                aria-label={request.status === 'en_attente' ? "Approuver la demande" : "Rejeter la demande"}
              >
                {updating ? 'Traitement...' : request.status === 'en_attente' ? 'Approuver' : 'Rejeter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AgentLayout>
  );
};

export default DocumentDetails;