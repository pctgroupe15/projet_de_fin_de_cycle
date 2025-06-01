"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H2, H3, P } from "@/components/ui/typography";
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { toast } from "sonner";

interface RequestDetails {
  id: string;
  childName: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: string;
  fatherName: string;
  motherName: string;
  status: string;
  trackingNumber: string;
  createdAt: string;
  updatedAt: string;
  documents: {
    birthCertificate: string;
    familyBook: string | null;
  };
  payment: {
    amount: number;
    method: string;
    status: string;
  };
  citizen: {
    name: string;
    email: string;
  };
}

const RequestDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequestDetails();
  }, []);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/agent/requests/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setRequest(data.data);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error("Erreur lors du chargement des détails");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/agent/requests/${params.id}/approve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Demande approuvée avec succès");
        fetchRequestDetails();
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleReject = async () => {
    try {
      const response = await fetch(`/api/agent/requests/${params.id}/reject`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Demande rejetée");
        fetchRequestDetails();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error("Erreur lors du rejet");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <H2>Demande non trouvée</H2>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <H2>Détails de la demande</H2>
        <P className="text-muted-foreground">
          Numéro de suivi: {request.trackingNumber}
        </P>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations de l'enfant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <P className="text-sm text-muted-foreground">Nom complet</P>
                <P>{request.childName}</P>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <P className="text-sm text-muted-foreground">Date de naissance</P>
                  <P>{new Date(request.birthDate).toLocaleDateString()}</P>
                </div>
                <div>
                  <P className="text-sm text-muted-foreground">Heure de naissance</P>
                  <P>{request.birthTime}</P>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <P className="text-sm text-muted-foreground">Lieu de naissance</P>
                  <P>{request.birthPlace}</P>
                </div>
                <div>
                  <P className="text-sm text-muted-foreground">Genre</P>
                  <P>{request.gender}</P>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations des parents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <P className="text-sm text-muted-foreground">Nom du père</P>
                <P>{request.fatherName}</P>
              </div>
              <div>
                <P className="text-sm text-muted-foreground">Nom de la mère</P>
                <P>{request.motherName}</P>
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
                <P className="text-sm text-muted-foreground">Nom complet</P>
                <P>{request.citizen.name}</P>
              </div>
              <div>
                <P className="text-sm text-muted-foreground">Email</P>
                <P>{request.citizen.email}</P>
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
              <div className="flex items-center justify-between">
                <div>
                  <P className="text-sm text-muted-foreground">Acte de naissance</P>
                </div>
                <Button variant="outline" asChild>
                  <a href={request.documents.birthCertificate} target="_blank" rel="noopener noreferrer">
                    Voir le document
                  </a>
                </Button>
              </div>
              {request.documents.familyBook && (
                <div className="flex items-center justify-between">
                  <div>
                    <P className="text-sm text-muted-foreground">Livre de famille</P>
                  </div>
                  <Button variant="outline" asChild>
                    <a href={request.documents.familyBook} target="_blank" rel="noopener noreferrer">
                      Voir le document
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <P className="text-sm text-muted-foreground">Statut</P>
                <Badge variant={request.payment.status === 'completed' ? 'success' : 'secondary'}>
                  {request.payment.status === 'completed' ? 'Payé' : 'En attente'}
                </Badge>
              </div>
              <div>
                <P className="text-sm text-muted-foreground">Montant</P>
                <P>{request.payment.amount} €</P>
              </div>
              <div>
                <P className="text-sm text-muted-foreground">Méthode de paiement</P>
                <P>{request.payment.method}</P>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={handleApprove}
            className="flex items-center gap-2"
            disabled={request.status !== 'PENDING'}
          >
            <CheckCircle className="h-4 w-4" />
            Approuver
          </Button>
          <Button
            onClick={handleReject}
            variant="destructive"
            className="flex items-center gap-2"
            disabled={request.status !== 'PENDING'}
          >
            <XCircle className="h-4 w-4" />
            Rejeter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsPage;