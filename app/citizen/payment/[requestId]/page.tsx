'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentPage({ params }: { params: { requestId: string } }) {
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile'>('card');
  const [mobileNumber, setMobileNumber] = useState('');

  useEffect(() => {
    fetchRequestDetails();
  }, [params.requestId]);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/citizen/requests/${params.requestId}`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des détails');
      const data = await response.json();
      setRequest(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: params.requestId,
          paymentMethod,
          mobileNumber: paymentMethod === 'mobile' ? mobileNumber : undefined,
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de la création du paiement');

      const { sessionId } = await response.json();

      if (paymentMethod === 'card') {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe non initialisé');
        
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) throw error;
      } else {
        // Redirection vers la page de confirmation pour le paiement mobile
        router.push(`/citizen/payment/confirm/${sessionId}`);
      }
    } catch (error) {
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="font-medium mb-2">Détails de la demande</h3>
              <p>Type de document: {request?.type}</p>
              <p>Montant: {request?.amount} XOF</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Méthode de paiement</h3>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as 'card' | 'mobile')}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card">Carte bancaire</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mobile" id="mobile" />
                  <Label htmlFor="mobile">Mobile Money</Label>
                </div>
              </RadioGroup>

              {paymentMethod === 'mobile' && (
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Numéro de téléphone</Label>
                  <Input
                    id="mobileNumber"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+225 0123456789"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handlePayment}
              disabled={loading || (paymentMethod === 'mobile' && !mobileNumber)}
              className="w-full"
            >
              {loading ? 'Traitement...' : 'Payer maintenant'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 