import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { requestId, paymentMethod, mobileNumber } = await req.json();

    // Récupérer les détails de la demande
    const request = await prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: { citizen: true },
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    if (paymentMethod === 'card') {
      // Créer une session Stripe
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'xof',
              product_data: {
                name: `Document: ${request.type}`,
              },
              unit_amount: Math.round(request.amount * 100), // Stripe utilise les centimes
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/citizen/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/citizen/payment/cancel`,
        metadata: {
          requestId,
        },
      });

      // Créer l'enregistrement de paiement
      await prisma.documentRequestPayment.create({
        data: {
          requestId,
          amount: request.amount,
          status: 'PENDING',
          stripePaymentId: stripeSession.id,
        },
      });

      return NextResponse.json({ sessionId: stripeSession.id });
    } else {
      // Logique pour le paiement mobile money
      // Ici, vous devrez intégrer avec votre fournisseur de paiement mobile
      // Pour l'instant, nous simulons juste la création d'une session
      const mobileSessionId = `mobile_${Date.now()}`;

      await prisma.documentRequestPayment.create({
        data: {
          requestId,
          amount: request.amount,
          status: 'PENDING',
          stripePaymentId: mobileSessionId,
        },
      });

      return NextResponse.json({ sessionId: mobileSessionId });
    }
  } catch (error) {
    console.error('Erreur lors de la création du paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
} 