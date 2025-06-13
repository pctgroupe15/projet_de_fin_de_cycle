import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { RequestStatus } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const birthCertificates = await prisma.birthCertificate.findMany({
      include: {
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(birthCertificates);
  } catch (error) {
    console.error("[BIRTH_CERTIFICATES_GET]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const body = await request.json();
    const { documentId, status } = body;

    if (!documentId || !status) {
      return new NextResponse("Données manquantes", { status: 400 });
    }

    // Récupérer le certificat de naissance avec les informations du citoyen
    const birthCertificate = await prisma.birthCertificate.findUnique({
      where: { id: documentId },
      include: { citizen: true },
    });

    if (!birthCertificate) {
      return new NextResponse("Certificat non trouvé", { status: 404 });
    }

    // Mettre à jour le statut du certificat
    const updatedCertificate = await prisma.birthCertificate.update({
      where: {
        id: documentId,
      },
      data: {
        status: status === "approuvé" ? RequestStatus.COMPLETED : 
                status === "rejeté" ? RequestStatus.REJECTED : 
                RequestStatus.PENDING,
        agentId: session.user.id,
      },
    });

    // Créer une notification pour le citoyen
    const statusLabel = status === "approuvé" ? "validée" : status === "rejeté" ? "rejetée" : "en attente";
    
    await prisma.notification.create({
      data: {
        citizenId: birthCertificate.citizenId,
        title: "Mise à jour de votre demande d'acte de naissance",
        message: `Votre demande d'acte de naissance (${birthCertificate.trackingNumber}) a été ${statusLabel}.`,
        type: "BIRTH_CERTIFICATE",
        referenceId: documentId,
      },
    });

    return NextResponse.json(updatedCertificate);
  } catch (error) {
    console.error("[BIRTH_CERTIFICATES_PUT]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID de la demande manquant' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, comment } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: 'Statut manquant' },
        { status: 400 }
      );
    }

    // Vérifier si l'admin a déjà validé la demande
    const existingCertificate = await prisma.birthCertificate.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existingCertificate) {
      return NextResponse.json(
        { success: false, message: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Si l'admin a déjà validé ou rejeté la demande, empêcher la modification
    if (existingCertificate.status === RequestStatus.COMPLETED || existingCertificate.status === RequestStatus.REJECTED) {
      return NextResponse.json(
        { success: false, message: 'Cette demande a déjà été traitée par l\'administrateur' },
        { status: 403 }
      );
    }

    // Convertir le statut au format correct
    const normalizedStatus = status === "approuvé" ? "approuvé" :
                           status === "rejeté" ? "rejeté" :
                           status === "en_attente" ? "en_attente" : status;

    const updatedCertificate = await prisma.birthCertificate.update({
      where: {
        id: id,
      },
      data: {
        status: normalizedStatus,
        comment: comment,
        updatedAt: new Date()
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: updatedCertificate
    });

  } catch (error) {
    console.error('Error updating birth certificate request:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
}