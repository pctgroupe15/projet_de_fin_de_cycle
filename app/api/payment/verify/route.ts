import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "Session ID manquant" },
        { status: 400 }
      );
    }

    // Récupérer la session Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json(
        { success: false, message: "Paiement non effectué" },
        { status: 400 }
      );
    }

    // Récupérer l'ID de la demande depuis les métadonnées
    const requestId = stripeSession.metadata?.requestId;
    if (!requestId) {
      return NextResponse.json(
        { success: false, message: "ID de demande manquant" },
        { status: 400 }
      );
    }

    // Vérifier si le paiement existe déjà
    const existingPayment = await prisma.payment.findFirst({
      where: {
        birthCertificateId: requestId,
      },
    });

    if (existingPayment) {
      // Mettre à jour le paiement existant
      await prisma.payment.update({
        where: {
          id: existingPayment.id,
        },
        data: {
          status: "PAID",
        },
      });
    } else {
      // Créer un nouveau paiement
      await prisma.payment.create({
        data: {
          birthCertificateId: requestId,
          amount: stripeSession.amount_total ? stripeSession.amount_total / 100 : 0, // Convertir les centimes en euros
          status: "PAID",
        },
      });
    }

    return NextResponse.json({
      success: true,
      requestId: requestId,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification du paiement:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la vérification du paiement" },
      { status: 500 }
    );
  }
} 