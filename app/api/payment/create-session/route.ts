import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { requestId, amount, paymentMethod } = body;

    // Vérifier le type de demande
    const birthCertificate = await prisma.birthCertificate.findUnique({
      where: { id: requestId }
    });

    const birthDeclaration = await prisma.birthDeclaration.findUnique({
      where: { id: requestId }
    });

    if (!birthCertificate && !birthDeclaration) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Créer la session de paiement Stripe
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethod === 'mobile_money' ? ['card'] : ['card'],
      line_items: [
        {
          price_data: {
            currency: 'xof',
            product_data: {
              name: birthCertificate ? 'Acte de naissance' : 'Déclaration de naissance',
            },
            unit_amount: amount * 100, // Stripe utilise les centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/citizen/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/citizen/payment/cancel`,
      metadata: {
        requestId,
        userId: session.user.id,
        type: birthCertificate ? 'birth_certificate' : 'birth_declaration'
      },
    });

    return NextResponse.json({ sessionId: stripeSession.id });
  } catch (error) {
    console.error('Erreur lors de la création de la session de paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    );
  }
} 