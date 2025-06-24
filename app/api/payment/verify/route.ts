import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
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
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Session de paiement invalide" },
        { status: 400 }
      );
    }

    if (!stripeSession) {
      return NextResponse.json(
        { success: false, message: "Session de paiement non trouvée" },
        { status: 404 }
      );
    }

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json(
        { success: false, message: "Paiement non effectué" },
        { status: 400 }
      );
    }

    // Récupérer l'ID de la demande depuis les métadonnées
    const requestId = stripeSession.metadata?.requestId;
    const requestType = stripeSession.metadata?.type;

    if (!requestId || !requestType) {
      return NextResponse.json(
        { success: false, message: "Métadonnées de session invalides" },
        { status: 400 }
      );
    }

    const db = await getDb();
    // Vérifier d'abord le type de demande
    let demande = null;
    if (requestType === 'birth_certificate') {
      demande = await db.collection('BirthCertificate').findOne({ _id: new ObjectId(requestId) });
    } else if (requestType === 'birth_declaration') {
      demande = await db.collection('BirthDeclaration').findOne({ _id: new ObjectId(requestId) });
    }

    if (!demande) {
      return NextResponse.json(
        { success: false, message: "Demande non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier si un paiement existe déjà
    let existingPayment = null;
    if (requestType === 'birth_certificate') {
      existingPayment = await db.collection('Payment').findOne({ birthCertificateId: new ObjectId(requestId) });
    } else if (requestType === 'birth_declaration') {
      existingPayment = await db.collection('Payment').findOne({ birthDeclarationId: new ObjectId(requestId) });
    }

    if (existingPayment) {
      return NextResponse.json({
        success: true,
        requestId: requestId,
        message: "Paiement déjà effectué"
      });
    }

    // Créer un nouveau paiement
    const paymentData = {
      amount: stripeSession.amount_total ? stripeSession.amount_total / 100 : 0,
      status: "PAID",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      if (requestType === 'birth_certificate') {
        await db.collection('Payment').insertOne({
          ...paymentData,
          birthCertificateId: new ObjectId(requestId)
        });
      } else if (requestType === 'birth_declaration') {
        await db.collection('Payment').insertOne({
          ...paymentData,
          birthDeclarationId: new ObjectId(requestId)
        });
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Erreur lors de la création du paiement" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requestId: requestId,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erreur lors de la vérification du paiement" },
      { status: 500 }
    );
  }
} 