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

  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/agent/birth-declarations/${params.id}/approve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Déclaration approuvée avec succès");
        fetchDeclarationDetails();
      }
    } catch (error) {
      console.error('Error approving declaration:', error);
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleReject = async () => {
    try {
      const response = await fetch(`/api/agent/birth-declarations/${params.id}/reject`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Déclaration rejetée");
        fetchDeclarationDetails();
      }
    } catch (error) {
      console.error('Error rejecting declaration:', error);
      toast.error("Erreur lors du rejet");
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
                    <Badge variant={declaration.payment.status === 'completed' ? 'success' : 'secondary'}>
                      {declaration.payment.status === 'completed' ? 'Payé' : 'En attente'}
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
              onClick={handleApprove}
              className="flex items-center gap-2"
              disabled={declaration.status !== 'PENDING'}
            >
              <CheckCircle className="h-4 w-4" />
              Approuver
            </Button>
            <Button
              onClick={handleReject}
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
    </AgentLayout>
  );
};

export default BirthDeclarationDetails;