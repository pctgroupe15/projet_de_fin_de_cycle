"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H2, H3, P } from "@/components/ui/typography";
import { AgentLayout } from '@/components/layouts/agent-layout';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface BirthDeclaration {
  id: string;
  childFirstName: string;
  childLastName: string;
  birthDate: Date;
  birthPlace: string;
  gender: string;
  status: string;
  createdAt: string;
  citizen: {
    name: string;
    email: string;
  };
  documents: {
    type: string;
    url: string;
  }[];
  payment: {
    status: string;
    amount: number;
  } | null;
}

const BirthDeclarationDetails = () => {
  const params = useParams();
  const [declaration, setDeclaration] = useState<BirthDeclaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    fetchDeclarationDetails();
  }, []);

  const fetchDeclarationDetails = async () => {
    try {
      const response = await fetch(`/api/agent/birth-declarations/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setDeclaration(data.data);
      }
    } catch (error) {
      console.error('Error fetching declaration details:', error);
      toast.error("Erreur lors du chargement des détails");
    } finally {
      setLoading(false);
    }
  };

  const showModal = () => {
    toast.info('Ouverture du modal d\'approbation');
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setComment('');
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleOk = async () => {
    toast.info('Début de la validation (handleOk)');
    if (!selectedFile) {
      toast.warning('Veuillez joindre le document final pour valider la déclaration.');
      return;
    }
    setUpdating(true);
    try {
      toast.info('Envoi du fichier à l\'API...');
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadResponse = await fetch(`/api/agent/birth-declarations/${params.id}/upload-final-document`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      toast.info('Réponse upload : ' + JSON.stringify(uploadData));
      if (!uploadData.success) {
        toast.error(uploadData.message || 'Erreur lors du téléversement du document final.');
        setUpdating(false);
        return;
      }
      toast.success('Document uploadé, approbation en cours...');
      const approveResponse = await fetch(`/api/agent/birth-declarations/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const approveData = await approveResponse.json();
      toast.info('Réponse approbation : ' + JSON.stringify(approveData));
      if (approveData.success) {
        toast.success("Déclaration approuvée");
        fetchDeclarationDetails();
        setIsModalOpen(false);
      } else {
        toast.error(approveData.message || "Erreur lors de l'approbation");
      }
    } catch (error: any) {
      console.error('Error approving declaration:', error);
      toast.error("Erreur lors de l'approbation : " + (typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)));
    } finally {
      setUpdating(false);
    }
  };

  const showRejectModal = () => {
    toast.info('Ouverture du modal de rejet');
    setIsRejectModalOpen(true);
  };

  const handleRejectCancel = () => {
    setIsRejectModalOpen(false);
    setRejectComment('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectComment.trim()) {
      toast.warning('Veuillez saisir un commentaire pour rejeter la déclaration.');
      return;
    }
    setRejecting(true);
    try {
      const response = await fetch(`/api/agent/birth-declarations/${params.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: rejectComment }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Déclaration rejetée');
        fetchDeclarationDetails();
        setIsRejectModalOpen(false);
      } else {
        toast.error(data.message || 'Erreur lors du rejet');
      }
    } catch (error: any) {
      console.error('Error rejecting declaration:', error);
      toast.error('Erreur lors du rejet : ' + (typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)));
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AgentLayout>
    );
  }

  if (!declaration) {
    return (
      <AgentLayout>
        <div className="p-6">
          <H2>Déclaration non trouvée</H2>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <div className="p-6">
        <div className="mb-6">
          <H2>Détails de la déclaration</H2>
          <P className="text-muted-foreground">
            Numéro de suivi: {declaration.id}
          </P>
          <P className="text-muted-foreground">
            Statut actuel: <b>{declaration.status}</b>
          </P>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'enfant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <P className="text-sm text-muted-foreground">Prénom</P>
                    <P>{declaration.childFirstName}</P>
                  </div>
                  <div>
                    <P className="text-sm text-muted-foreground">Nom</P>
                    <P>{declaration.childLastName}</P>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <P className="text-sm text-muted-foreground">Date de naissance</P>
                    <P>{new Date(declaration.birthDate).toLocaleDateString()}</P>
                  </div>
                  <div>
                    <P className="text-sm text-muted-foreground">Lieu de naissance</P>
                    <P>{declaration.birthPlace}</P>
                  </div>
                </div>
                <div>
                  <P className="text-sm text-muted-foreground">Genre</P>
                  <P>{declaration.gender}</P>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations du citoyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <P className="text-sm text-muted-foreground">Nom complet</P>
                  <P>{declaration.citizen.name}</P>
                </div>
                <div>
                  <P className="text-sm text-muted-foreground">Email</P>
                  <P>{declaration.citizen.email}</P>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {declaration.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <P className="text-sm text-muted-foreground">Type de document</P>
                      <P>{doc.type}</P>
                    </div>
                    <Button variant="outline" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        Voir le document
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {declaration.payment && (
            <Card>
              <CardHeader>
                <CardTitle>Paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <P className="text-sm text-muted-foreground">Statut</P>
                    <Badge variant={declaration.payment.status?.toUpperCase() === 'PAID' ? 'success' : 'secondary'}>
                      {declaration.payment.status?.toUpperCase() === 'PAID' ? 'Payé' : 'En attente'}
                    </Badge>
                  </div>
                  <div>
                    <P className="text-sm text-muted-foreground">Montant</P>
                    <P>{declaration.payment.amount} €</P>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button
              onClick={showModal}
              className="flex items-center gap-2"
              disabled={declaration.status !== 'PENDING'}
            >
              <CheckCircle className="h-4 w-4" />
              Approuver
            </Button>
            <Button
              onClick={showRejectModal}
              variant="destructive"
              className="flex items-center gap-2"
              disabled={declaration.status !== 'PENDING'}
            >
              <XCircle className="h-4 w-4" />
              Rejeter
            </Button>
          </div>
        </div>
      </div>

      <Dialog 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        aria-label="Confirmer l'action"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Approuver la déclaration
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
            <div>
              <label htmlFor="final-document" className="text-sm font-medium">
                Document final <span className="text-red-500">*</span>
              </label>
              <input
                id="final-document"
                type="file"
                onChange={handleFileChange}
                className="mt-2"
                accept=".pdf,.doc,.docx"
                aria-label="Sélectionner le document final"
                required
              />
            </div>
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
              aria-label="Approuver la déclaration"
            >
              {updating ? 'Traitement...' : 'Approuver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRejectModalOpen}
        onOpenChange={setIsRejectModalOpen}
        aria-label="Confirmer le rejet"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la déclaration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="reject-comment" className="text-sm font-medium">
                Commentaire <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="reject-comment"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Indiquez la raison du rejet..."
                className="mt-2"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleRejectCancel}
              aria-label="Annuler le rejet"
            >
              Annuler
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={rejecting || !rejectComment.trim()}
              variant="destructive"
              aria-label="Rejeter la déclaration"
            >
              {rejecting ? 'Traitement...' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AgentLayout>
  );
};

export default BirthDeclarationDetails;