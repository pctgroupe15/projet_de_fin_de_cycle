"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CitizenLayout } from '@/components/layouts/citizen-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Download, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface DocumentRequest {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  deliveryMode: "PICKUP" | "DELIVERY";
  deliveryAddress?: string;
  amount: number;
  documents: {
    id: string;
    type: string;
    url: string;
  }[];
  payment?: {
    status: string;
    amount: number;
    stripePaymentId?: string;
  };
}

const DocumentDetailsPage = ({ params }: { params: { id: string } }) => {
  const [request, setRequest] = useState<DocumentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRequestDetails();
  }, [params.id]);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/document-requests/${params.id}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des détails');
      const data = await response.json();
      setRequest(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'PAID':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Payé</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">En cours</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'birth_certificate':
        return 'Acte de naissance';
      case 'identity_card':
        return 'Carte d\'identité';
      case 'residence_certificate':
        return 'Certificat de résidence';
      case 'marriage_certificate':
        return 'Acte de mariage';
      default:
        return type;
    }
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

  if (!request) {
    return (
      <CitizenLayout>
        <div className="p-6">
          <h2 className="text-2xl font-bold">Demande non trouvée</h2>
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

        <Card>
          <CardHeader>
            <CardTitle>Détails de la demande</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type de document</p>
                  <p className="font-medium">{getDocumentTypeLabel(request.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <div className="mt-1">{getStatusBadge(request.status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date de création</p>
                  <p>{new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
                  <p>{new Date(request.updatedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mode de livraison</p>
                  <p>{request.deliveryMode === 'PICKUP' ? 'Retrait sur place' : 'Livraison à domicile'}</p>
                </div>
              </div>
              {request.deliveryAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">Adresse de livraison</p>
                  <p>{request.deliveryAddress}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Montant</p>
                <p>{request.amount} XOF</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut du paiement</p>
                <p>{request.payment?.status || 'Non payé'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {request.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{doc.type}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {request.status === 'PENDING' && !request.payment && (
          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Veuillez effectuer le paiement pour continuer le traitement de votre demande.</p>
              <Button onClick={() => router.push(`/citizen/payment/${request.id}`)}>
                Procéder au paiement
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </CitizenLayout>
  );
};

export default DocumentDetailsPage;