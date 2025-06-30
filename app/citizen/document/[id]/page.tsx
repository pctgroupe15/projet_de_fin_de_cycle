"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CitizenLayout } from '@/components/layouts/citizen-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Download, FileText, AlertCircle, CheckCircle, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  type: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
}

interface DocumentDetails {
  id: string;
  documentType: 'birth_certificate' | 'birth_declaration';
  fullName: string;
  birthDate: Date;
  birthPlace: string;
  fatherFullName?: string;
  motherFullName?: string;
  status: string;
  trackingNumber: string;
  rejectReason?: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  files: Document[];
  payment?: Payment;
}

const DocumentDetailsPage = ({ params }: { params: { id: string } }) => {
  const [document, setDocument] = useState<DocumentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchDocumentDetails();
    
    // Si on vient de la page de succès de paiement, rafraîchir immédiatement
    if (searchParams.get('refresh') === 'true') {
      setTimeout(() => {
        fetchDocumentDetails();
      }, 1000);
    }
    
    // Rafraîchir les données toutes les 10 secondes pour les mises à jour de paiement
    const interval = setInterval(fetchDocumentDetails, 10000);
    
    return () => clearInterval(interval);
  }, [params.id, searchParams]);

  const fetchDocumentDetails = async () => {
    try {
      // Vérifier que l'ID est valide
      if (!params.id || params.id === 'undefined') {
        console.error('ID de document invalide:', params.id);
        toast.error('ID de document invalide');
        router.push('/citizen/documents');
        return;
      }

      const response = await fetch(`/api/citizen/documents/${params.id}`);
      const data = await response.json();
      if (data.success) {
        console.log('Document data:', data.data);
        setDocument(data.data);
      } else {
        toast.error(data.message || 'Erreur lors de la récupération des détails');
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
      toast.error('Erreur lors de la récupération des détails');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "success" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "success"> = {
      PENDING: "secondary",
      APPROVED: "success",
      REJECTED: "destructive"
    };
    return variants[status] || "default";
  };

  const getStatusText = (status: string) => {
    const texts = {
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      REJECTED: 'Rejeté'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'birth_certificate':
        return "Acte de naissance";
      case 'birth_declaration':
        return "Déclaration de naissance";
      default:
        return type;
    }
  };

  const handlePayment = () => {
    // Vérifier que l'ID est valide
    if (!params.id || params.id === 'undefined') {
      toast.error('ID de document invalide');
      return;
    }
    
    router.push(`/citizen/payment?requestId=${params.id}&amount=5000`);
  };

  if (loading) {
    return (
      <CitizenLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CitizenLayout>
    );
  }

  if (!document) {
    return (
      <CitizenLayout>
        <div className="p-6">
          <h2 className="text-2xl font-bold">Document non trouvé</h2>
        </div>
      </CitizenLayout>
    );
  }

  return (
    <CitizenLayout>
      <div className="p-6 space-y-6">
        <Button 
          variant="ghost"
          className="mb-4"
          onClick={() => router.push('/citizen/documents')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Détails de la demande</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchDocumentDetails}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Détails de la demande</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type de document</p>
                  <p>{getDocumentTypeLabel(document.documentType)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de suivi</p>
                  <p>{document.trackingNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge variant={getStatusVariant(document.status)}>
                    {getStatusText(document.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de la demande</p>
                  <p>{new Date(document.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
                  <p>{new Date(document.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                {document.status === 'PENDING' && (!document.payment || document.payment.status !== 'PAID') ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Pour finaliser votre demande, veuillez procéder au paiement des frais.
                    </p>
                    <Button onClick={handlePayment} className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Procéder au paiement (5000 FCFA)
                    </Button>
                  </div>
                ) : document.payment && document.payment.status === 'PAID' ? (
                  <Alert>
                    <AlertTitle>Statut du paiement</AlertTitle>
                    <AlertDescription>
                      <p>Montant payé : {document.payment.amount} FCFA</p>
                      <p>Statut : Payé</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Votre paiement a été confirmé. Votre demande est maintenant en cours de traitement.
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : document.payment && document.payment.status !== 'PAID' ? (
                  <Alert variant="destructive">
                    <AlertTitle>Problème avec le paiement</AlertTitle>
                    <AlertDescription>
                      <p>Montant : {document.payment.amount} FCFA</p>
                      <p>Statut : {document.payment.status}</p>
                      <p className="text-sm mt-2">
                        Il y a eu un problème avec votre paiement. Veuillez réessayer.
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations du document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom complet</p>
                <p>{document.fullName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date de naissance</p>
                  <p>{new Date(document.birthDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lieu de naissance</p>
                  <p>{document.birthPlace}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom du père</p>
                  <p>{document.fatherFullName || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nom de la mère</p>
                  <p>{document.motherFullName || 'Non renseigné'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {document.status === 'REJECTED' && document.comment && (
          <Card>
            <CardHeader>
              <CardTitle>Motif du rejet</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Votre demande a été rejetée</AlertTitle>
                <AlertDescription>{document.comment}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Documents fournis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {document.files.map((file) => (
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
              ))}
            </div>
          </CardContent>
        </Card>

        {document.status === 'COMPLETED' && document.files.some(f => f.type === 'ACTE_NAISSANCE_FINAL') && (
          <Card>
            <CardHeader>
              <CardTitle>Votre document est prêt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="text-lg text-center">
                  Votre acte de naissance a été validé et est prêt à être téléchargé.
                </p>
                <Button
                  onClick={() => {
                    const finalDocument = document.files.find(f => f.type === 'ACTE_NAISSANCE_FINAL');
                    console.log('Document final trouvé:', finalDocument);
                    if (finalDocument) {
                      console.log('URL du document final:', finalDocument.url);
                      window.open(finalDocument.url, '_blank');
                    } else {
                      console.log('Aucun document final trouvé dans les fichiers:', document.files);
                      toast.error("Le document final n'est pas encore disponible.");
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger mon acte
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CitizenLayout>
  );
};

export default DocumentDetailsPage;