'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      router.push('/citizen/dashboard');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/payment/verify?session_id=${sessionId}`);
        if (!response.ok) throw new Error('Erreur lors de la vérification du paiement');
        
        const data = await response.json();
        if (data.status === 'success') {
          toast.success('Paiement effectué avec succès');
        } else {
          toast.error('Erreur lors du paiement');
          router.push('/citizen/dashboard');
        }
      } catch (error) {
        toast.error('Erreur lors de la vérification du paiement');
        router.push('/citizen/dashboard');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  if (loading) {
    return <div>Vérification du paiement...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            Paiement réussi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Votre paiement a été effectué avec succès. Votre demande sera traitée dans les plus brefs délais.</p>
            <p>Vous recevrez une notification par email lorsque votre document sera prêt.</p>
            <div className="flex justify-end">
              <Button onClick={() => router.push('/citizen/dashboard')}>
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 