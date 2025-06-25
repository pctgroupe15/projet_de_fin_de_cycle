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
    console.log('Début vérification paiement');
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('Utilisateur non autorisé');
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    const { sessionId } = await request.json();
    console.log('SessionId reçu :', sessionId);

    if (!sessionId) {
      console.log('Session ID manquant');
      return NextResponse.json({ success: false, message: "Session ID manquant" }, { status: 400 });
    }

    // Récupérer la session Stripe
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('Session Stripe récupérée :', stripeSession);
    } catch (error) {
      console.error('Erreur Stripe :', error);
      return NextResponse.json({ success: false, message: "Session de paiement invalide" }, { status: 400 });
    }

    if (!stripeSession) {
      console.log('Session Stripe non trouvée');
      return NextResponse.json({ success: false, message: "Session de paiement non trouvée" }, { status: 404 });
    }

    if (stripeSession.payment_status !== "paid") {
      console.log('Paiement non effectué');
      return NextResponse.json({ success: false, message: "Paiement non effectué" }, { status: 400 });
    }

    const requestId = stripeSession.metadata?.requestId;
    const requestType = stripeSession.metadata?.type;
    console.log('Metadata Stripe :', { requestId, requestType });

    if (!requestId || !requestType) {
      console.log('Métadonnées de session invalides');
      return NextResponse.json({ success: false, message: "Métadonnées de session invalides" }, { status: 400 });
    }

    const db = await getDb();
    let demande = null;
    if (requestType === 'birth_certificate') {
      demande = await db.collection('BirthCertificate').findOne({ _id: new ObjectId(requestId) });
    } else if (requestType === 'birth_declaration') {
      demande = await db.collection('BirthDeclaration').findOne({ _id: new ObjectId(requestId) });
    }
    console.log('Demande trouvée :', demande);

    if (!demande) {
      console.log('Demande non trouvée');
      return NextResponse.json({ success: false, message: "Demande non trouvée" }, { status: 404 });
    }

    let existingPayment = null;
    if (requestType === 'birth_certificate') {
      existingPayment = await db.collection('Payment').findOne({ birthCertificateId: new ObjectId(requestId) });
    } else if (requestType === 'birth_declaration') {
      existingPayment = await db.collection('Payment').findOne({ birthDeclarationId: new ObjectId(requestId) });
    }
    console.log('Paiement existant :', existingPayment);

    if (existingPayment) {
      console.log('Paiement déjà effectué');
      return NextResponse.json({
        success: true,
        requestId: requestId,
        message: "Paiement déjà effectué"
      });
    }

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
      } else {
        throw new Error('Type de demande inconnu');
      }
      console.log('Paiement inséré');
    } catch (error: any) {
      if (error.code === 11000) {
        console.log('Paiement déjà existant, on retourne un succès');
        return NextResponse.json({
          success: true,
          requestId: requestId,
          message: "Paiement déjà effectué"
        });
      }
      console.error('Erreur lors de la création du paiement :', error);
      return NextResponse.json(
        { success: false, message: "Erreur lors de la création du paiement" },
        { status: 500 }
      );
    }

    console.log('Vérification paiement terminée avec succès');
    return NextResponse.json({
      success: true,
      requestId: requestId,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du paiement :', error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la vérification du paiement" },
      { status: 500 }
    );
  }
} 