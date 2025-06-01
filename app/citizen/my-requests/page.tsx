'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { FileText, Download, Clock, CheckCircle, XCircle } from 'lucide-react';

interface DocumentRequest {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  trackingNumber?: string;
  deliveryMode: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string;
  amount: number;
  payment?: {
    status: string;
    amount: number;
  };
}

export default function MyRequests() {
  const { data: session } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/document-requests');
      if (!response.ok) throw new Error('Erreur lors de la récupération des demandes');
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Erreur:', error);
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
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Mes demandes</h1>
      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {getDocumentTypeLabel(request.type)}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(request.status)}
                  {request.trackingNumber && (
                    <span className="text-sm text-muted-foreground">
                      N° de suivi: {request.trackingNumber}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push(`/citizen/document/${request.id}`)}
              >
                Voir les détails
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date de création</p>
                  <p>{new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mode de livraison</p>
                  <p>{request.deliveryMode === 'PICKUP' ? 'Retrait sur place' : 'Livraison à domicile'}</p>
                </div>
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
        ))}
      </div>
    </div>
  );
}