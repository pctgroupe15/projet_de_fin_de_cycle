'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CitizenLayout } from "@/components/layouts/citizen-layout";
import { toast } from "sonner";
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const requestId = searchParams.get('requestId');
  const amount = searchParams.get('amount');

  const handlePayment = async (paymentMethod: 'card' | 'mobile_money') => {
    if (!requestId || !amount) {
      toast.error('Informations de paiement manquantes');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          amount: parseFloat(amount),
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (data.sessionId) {
        const stripe = await stripePromise;
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          });

          if (error) {
            toast.error(error.message);
          }
        }
      } else {
        toast.error('Erreur lors de la création de la session de paiement');
      }
    } catch (error) {
      console.error('Erreur de paiement:', error);
      toast.error('Une erreur est survenue lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CitizenLayout>
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">Montant à payer</h3>
                <p className="text-3xl font-bold text-primary">{amount} FCFA</p>
              </div>

              <div className="space-y-4">
                <Button
                  className="w-full"
                  onClick={() => handlePayment('card')}
                  disabled={loading}
                >
                  Payer par carte bancaire
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handlePayment('mobile_money')}
                  disabled={loading}
                >
                  Payer par Mobile Money
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CitizenLayout>
  );
} 