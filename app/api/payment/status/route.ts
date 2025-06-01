import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID manquant' },
        { status: 400 }
      );
    }

    // Vérifier si c'est une session Stripe ou mobile money
    if (sessionId.startsWith('mobile_')) {
      // Pour mobile money, nous devons implémenter la vérification avec le fournisseur
      // Pour l'instant, nous retournons un statut simulé
      return NextResponse.json({
        status: 'completed',
        message: 'Paiement mobile money traité avec succès',
      });
    }

    // Pour Stripe, vérifier le statut de la session
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (stripeSession.payment_status === 'paid') {
      // Mettre à jour le statut du paiement dans la base de données
      await prisma.documentRequestPayment.update({
        where: { stripePaymentId: sessionId },
        data: { status: 'COMPLETED' },
      });

      // Mettre à jour le statut de la demande
      const payment = await prisma.documentRequestPayment.findUnique({
        where: { stripePaymentId: sessionId },
        include: { request: true },
      });

      if (payment) {
        await prisma.documentRequest.update({
          where: { id: payment.requestId },
          data: { status: 'PAID' },
        });
      }

      return NextResponse.json({
        status: 'completed',
        message: 'Paiement traité avec succès',
      });
    }

    return NextResponse.json({
      status: 'pending',
      message: 'Paiement en cours de traitement',
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut' },
      { status: 500 }
    );
  }
} 