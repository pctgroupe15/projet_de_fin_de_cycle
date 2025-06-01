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
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      console.log("Session Stripe récupérée:", {
        id: stripeSession.id,
        payment_status: stripeSession.payment_status,
        metadata: stripeSession.metadata,
        type: stripeSession.metadata?.type,
        amount_total: stripeSession.amount_total
      });
    } catch (error) {
      console.error("Erreur lors de la récupération de la session Stripe:", error);
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
      console.error("Métadonnées manquantes:", stripeSession.metadata);
      return NextResponse.json(
        { success: false, message: "Métadonnées de session invalides" },
        { status: 400 }
      );
    }

    console.log("Vérification de la demande:", {
      id: requestId,
      type: requestType
    });

    // Vérifier d'abord le type de demande
    const birthCertificate = await prisma.birthCertificate.findUnique({
      where: { id: requestId }
    });

    const birthDeclaration = await prisma.birthDeclaration.findUnique({
      where: { id: requestId }
    });

    console.log("Résultats de la recherche:", {
      birthCertificate: birthCertificate ? {
        id: birthCertificate.id,
        fullName: birthCertificate.fullName
      } : "non trouvé",
      birthDeclaration: birthDeclaration ? {
        id: birthDeclaration.id,
        childFirstName: birthDeclaration.childFirstName,
        childLastName: birthDeclaration.childLastName
      } : "non trouvé"
    });

    if (!birthCertificate && !birthDeclaration) {
      console.error("Aucune demande trouvée pour l'ID:", requestId);
      return NextResponse.json(
        { success: false, message: "Demande non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier si un paiement existe déjà
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { birthCertificateId: requestType === 'birth_certificate' ? requestId : undefined },
          { birthDeclarationId: requestType === 'birth_declaration' ? requestId : undefined }
        ]
      }
    });

    if (existingPayment) {
      console.log("Un paiement existe déjà pour cette demande:", existingPayment);
      return NextResponse.json({
        success: true,
        requestId: requestId,
        message: "Paiement déjà effectué"
      });
    }

    // Créer un nouveau paiement
    const paymentData = {
      amount: stripeSession.amount_total ? stripeSession.amount_total / 100 : 0,
      status: "PAID" as const,
    };

    try {
      if (requestType === 'birth_certificate') {
        console.log("Début création du paiement pour l'acte de naissance:", {
          requestId,
          amount: paymentData.amount,
          type: requestType
        });

        // Vérifier si l'acte de naissance existe
        const birthCertificate = await prisma.birthCertificate.findUnique({
          where: { id: requestId }
        });

        if (!birthCertificate) {
          console.error("Acte de naissance non trouvé:", requestId);
          return NextResponse.json(
            { success: false, message: "Acte de naissance non trouvé" },
            { status: 404 }
          );
        }

        console.log("Acte de naissance trouvé:", {
          id: birthCertificate.id,
          fullName: birthCertificate.fullName
        });
        
        const payment = await prisma.payment.create({
          data: {
            amount: paymentData.amount,
            status: "PAID",
            birthCertificateId: requestId
          } as any
        });

        console.log("Paiement créé avec succès:", {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          birthCertificateId: (payment as any).birthCertificateId
        });
      } else if (requestType === 'birth_declaration') {
        console.log("Création du paiement pour la déclaration de naissance:", {
          requestId,
          amount: paymentData.amount
        });
        
        const payment = await prisma.payment.create({
          data: {
            amount: paymentData.amount,
            status: "PAID",
            birthDeclarationId: requestId
          } as any
        });
        console.log("Paiement créé avec succès:", payment);
      }
    } catch (error) {
      console.error("Erreur détaillée lors de la création du paiement:", {
        error,
        message: error instanceof Error ? error.message : "Erreur inconnue",
        stack: error instanceof Error ? error.stack : undefined
      });
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
    console.error("Erreur lors de la vérification du paiement:", {
      error,
      message: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { success: false, message: "Erreur lors de la vérification du paiement" },
      { status: 500 }
    );
  }
} 