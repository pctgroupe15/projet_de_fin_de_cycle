"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Mail, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RequestDetails {
  id: string;
  fullName: string;
  birthDate: string;
  birthPlace: string;
  fatherFullName: string;
  motherFullName: string;
  status: string;
  trackingNumber: string;
  createdAt: string;
  updatedAt: string;
  files: {
    type: string;
    url: string;
  }[];
  payment?: {
    amount: number;
    method: string;
    status: string;
  };
  agent?: {
    name: string;
    email: string;
  };
}

interface TimelineItem {
  icon: React.ReactNode;
  title: string;
  date?: string;
  description?: string;
  variant: "default" | "secondary" | "destructive" | "success";
}

const RequestDetails = ({ params }: { params: { id: string } }) => {
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRequestDetails();
  }, [params.id]);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/citizen/request/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setRequest(data.data);
      } else {
        toast.error(data.message || 'Erreur lors de la récupération des détails');
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Erreur lors de la récupération des détails');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "success" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "success"> = {
      PENDING: "secondary",
      IN_PROGRESS: "default",
      COMPLETED: "success",
      REJECTED: "destructive"
    };
    return variants[status] || "default";
  };

  const getStatusText = (status: string) => {
    const texts = {
      PENDING: 'En attente',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Complété',
      REJECTED: 'Rejeté'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getTimelineItems = (): TimelineItem[] => {
    if (!request) return [];
    
    const items: TimelineItem[] = [
      {
        icon: <Clock className="h-4 w-4" />,
        title: 'Demande créée',
        date: format(new Date(request.createdAt), "dd MMMM yyyy", { locale: fr }),
        variant: 'success'
      }
    ];

    if (request.status === 'IN_PROGRESS') {
      items.push({
        icon: <AlertCircle className="h-4 w-4" />,
        title: 'En cours de traitement',
        description: `Par l'agent ${request.agent?.name || 'non assigné'}`,
        variant: 'default'
      });
    } else if (request.status === 'COMPLETED') {
      items.push({
        icon: <CheckCircle className="h-4 w-4" />,
        title: 'Demande complétée',
        date: format(new Date(request.updatedAt), "dd MMMM yyyy", { locale: fr }),
        variant: 'success'
      });
    } else if (request.status === 'REJECTED') {
      items.push({
        icon: <XCircle className="h-4 w-4" />,
        title: 'Demande rejetée',
        date: format(new Date(request.updatedAt), "dd MMMM yyyy", { locale: fr }),
        variant: 'destructive'
      });
    }

    return items;
  };

  const handlePayment = () => {
    router.push(`/citizen/payment?requestId=${params.id}&amount=5000`);
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
        <h2 className="text-2xl font-bold">Demande non trouvée</h2>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Détails de la demande</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations de base</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Numéro de suivi</p>
              <p>{request.trackingNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant={getStatusVariant(request.status)}>
                  {getStatusText(request.status)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de création</p>
                <p>{format(new Date(request.createdAt), "dd MMMM yyyy", { locale: fr })}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
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
                <p>{format(new Date(request.birthDate), "dd MMMM yyyy", { locale: fr })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lieu de naissance</p>
                <p>{request.birthPlace}</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nom du père</p>
              <p>{request.fatherFullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nom de la mère</p>
              <p>{request.motherFullName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {request.files && request.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {request.files.map((file, index) => (
                <div key={index}>
                  <p className="text-sm text-muted-foreground mb-2">{file.type}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
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

      {request.payment && (
        <Card>
          <CardHeader>
            <CardTitle>Paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Montant</p>
                <p>{request.payment.amount} FCFA</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Méthode</p>
                <p>{request.payment.method}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant={request.payment.status === 'PAID' ? 'success' : 'destructive'}>
                  {request.payment.status === 'PAID' ? 'Payé' : 'Non payé'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suivi de la demande</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getTimelineItems().map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${item.variant === 'success' ? 'bg-green-100 text-green-600' : 
                  item.variant === 'destructive' ? 'bg-red-100 text-red-600' : 
                  'bg-gray-100 text-gray-600'}`}>
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  {item.date && <p className="text-sm text-muted-foreground">{item.date}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {request.agent && (
        <Card>
          <CardHeader>
            <CardTitle>Agent assigné</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p>{request.agent.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{request.agent.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {request.status === "PENDING" && (
        <div className="mt-6">
          <Button onClick={handlePayment} className="w-full">
            Passer au paiement
          </Button>
        </div>
      )}
    </div>
  );
};

export default RequestDetails;