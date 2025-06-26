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
      // Essayer d'abord de récupérer un acte de naissance
      let response = await fetch(`/api/agent/birth-certificates/${params.id}`);
      let data = await response.json();
      
      if (data.success) {
        console.log('STATUT REÇU:', data.data.status);
        setRequest(data.data);
        setComment(data.data.comment || '');
        return;
      }
      
      // Si ce n'est pas un acte de naissance, essayer une déclaration de naissance
      response = await fetch(`/api/agent/birth-declarations/${params.id}`);
      data = await response.json();
      
      if (data.success) {
        console.log('STATUT REÇU:', data.data.status);
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
      let response = await fetch(`/api/agent/birth-certificates/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          comment: comment,
        }),
      });
      let data = await response.json();
      if (data.success) {
        toast.success('Statut mis à jour avec succès');
        fetchRequestDetails();
        setIsModalOpen(false);
        return;
      } else {
        toast.error(data.message || 'Erreur lors de la mise à jour du statut (acte de naissance)');
      }
      // Si ce n'est pas un acte de naissance, essayer une déclaration de naissance
      const declarationStatus = newStatus === 'COMPLETED' ? 'approuvé' : newStatus === 'REJECTED' ? 'rejeté' : 'en_attente';
      response = await fetch(`/api/agent/birth-declarations/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: declarationStatus,
        }),
      });
      data = await response.json();
      if (data.success) {
        toast.success('Statut mis à jour avec succès');
        fetchRequestDetails();
        setIsModalOpen(false);
      } else {
        toast.error(data.message || 'Erreur lors de la mise à jour du statut (déclaration de naissance)');
      }
    } catch (error: any) {
      console.error('Error updating request status:', error);
      toast.error('Erreur lors de la mise à jour du statut: ' + (error?.message || error));
    } finally {
      setUpdating(false);
    }
  }, [params.id, comment, fetchRequestDetails]);

  const getStatusVariant = useCallback((status: string): "default" | "secondary" | "destructive" | "success" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "success"> = {
      PENDING: "secondary",
      COMPLETED: "success",
      REJECTED: "destructive",
      IN_PROGRESS: "default"
    };
    return variants[status] || "default";
  }, []);

  const getStatusText = useCallback((status: string) => {
    const texts = {
      PENDING: 'En attente',
      COMPLETED: 'Approuvé',
      REJECTED: 'Rejeté',
      IN_PROGRESS: 'En cours'
    };
    return texts[status as keyof typeof texts] || status;
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  }, []);

  const handleOk = useCallback(async () => {
    const newStatus = request?.status === 'PENDING' ? 'COMPLETED' : 'REJECTED';
    setUpdating(true);

    if (newStatus === 'COMPLETED') {
      if (!selectedFile) {
        toast.warning('Veuillez joindre le document final pour valider la demande.');
        setUpdating(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        // Essayer d'abord l'upload pour un acte de naissance
        let uploadResponse = await fetch(`/api/agent/birth-certificates/${params.id}/upload-final-document`, {
          method: 'POST',
          body: formData,
        });
        let uploadData = await uploadResponse.json();
        if (uploadData.success) {
          await updateRequestStatus(newStatus);
          return;
        }
        // Si ce n'est pas un acte de naissance, essayer une déclaration de naissance
        uploadResponse = await fetch(`/api/agent/birth-declarations/${params.id}/upload-final-document`, {
          method: 'POST',
          body: formData,
        });
        uploadData = await uploadResponse.json();
        if (uploadData.success) {
          await updateRequestStatus(newStatus);
        } else {
          toast.error(uploadData.message || 'Erreur lors du téléversement du document final.');
        }
      } catch (error) {
        console.error('Error uploading final document:', error);
        toast.error('Erreur lors du téléversement du document final.');
        setUpdating(false);
      }
    } else {
      await updateRequestStatus(newStatus);
    }
  }, [request?.status, selectedFile, params.id, updateRequestStatus]);

  const showModal = useCallback((statusToUpdate: 'COMPLETED' | 'REJECTED') => {
    if (statusToUpdate === 'COMPLETED') {
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
                {(file.type === 'DEMANDEUR_ID' || file.type === 'EXISTING_ACTE') && (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        Voir le document
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  }, [request?.files]);

  // Séparation des fichiers
  const citizenFiles = request?.files?.filter(f => f.type !== 'ACTE_NAISSANCE_FINAL') || [];
  const finalActeFile = request?.files?.find(f => f.type === 'ACTE_NAISSANCE_FINAL');

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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Documents fournis par le citoyen</CardTitle>
          </CardHeader>
          <CardContent>
            {citizenFiles.length === 0 ? (
              <p>Aucun document fourni.</p>
            ) : (
              <div className="grid gap-4">
                {citizenFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{file.type === 'DEMANDEUR_ID' ? 'Pièce d\'identité du demandeur' : file.type === 'EXISTING_ACTE' ? 'Acte existant' : file.type}</span>
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {finalActeFile && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Acte de naissance final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Acte de naissance final soumis</span>
              </div>
            </CardContent>
          </Card>
        )}

        {request.status === 'PENDING' && (
          <div className="flex gap-4">
            <Button
              onClick={() => showModal('COMPLETED')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approuver
            </Button>
            <Button
              onClick={() => showModal('REJECTED')}
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
                {request.status === 'PENDING' ? 'Approuver la demande' : 'Rejeter la demande'}
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
              {request.status === 'PENDING' && (
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
                aria-label={request.status === 'PENDING' ? "Approuver la demande" : "Rejeter la demande"}
              >
                {updating ? 'Traitement...' : request.status === 'PENDING' ? 'Approuver' : 'Rejeter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AgentLayout>
  );
};

export default DocumentDetails;