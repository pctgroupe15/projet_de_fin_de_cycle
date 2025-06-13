import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';

enum RequestStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

interface Document {
  type: string;
  url: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérifier si la déclaration existe
    const declaration = await prisma.birthDeclaration.findUnique({
      where: { id: params.id },
      include: {
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
        documents: true,
        payment: true,
      },
    });

    if (!declaration) {
      return NextResponse.json(
        { success: false, message: 'Déclaration non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si la déclaration est en attente
    if (declaration.status !== RequestStatus.PENDING) {
      return NextResponse.json(
        { success: false, message: 'Cette déclaration a déjà été traitée' },
        { status: 400 }
      );
    }

    // Vérifier le paiement
    if (!declaration.payment || declaration.payment.status !== 'PAID') {
      return NextResponse.json(
        { success: false, message: 'Le paiement n\'a pas été effectué' },
        { status: 400 }
      );
    }

    // Générer un numéro d'acte unique
    const acteNumber = `ACTE-${nanoid(8)}`;

    // Créer l'acte de naissance
    const birthCertificate = await prisma.birthCertificate.create({
      data: {
        citizenId: declaration.citizenId,
        fullName: `${declaration.childFirstName} ${declaration.childLastName}`,
        birthDate: declaration.birthDate,
        birthPlace: declaration.birthPlace,
        fatherFullName: `${declaration.fatherFirstName} ${declaration.fatherLastName}`,
        motherFullName: `${declaration.motherFirstName} ${declaration.motherLastName}`,
        acteNumber,
        status: RequestStatus.COMPLETED,
        trackingNumber: nanoid(10),
        agentId: session.user.id,
        files: {
          create: declaration.documents.map((doc: Document) => ({
            type: doc.type,
            url: doc.url
          }))
        }
      },
      include: {
        files: true
      }
    });

    // Mettre à jour le statut de la déclaration
    const updatedDeclaration = await prisma.birthDeclaration.update({
      where: { id: params.id },
      data: {
        status: RequestStatus.COMPLETED,
        agentId: session.user.id,
      },
      include: {
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
        documents: true,
        payment: true,
      },
    });

    // Créer une notification pour le citoyen
    await prisma.notification.create({
      data: {
        citizenId: declaration.citizenId,
        title: "Votre déclaration de naissance a été approuvée",
        message: `Votre déclaration de naissance pour ${declaration.childFirstName} ${declaration.childLastName} a été approuvée. Votre acte de naissance (${acteNumber}) est maintenant disponible.`,
        type: "BIRTH_DECLARATION",
        referenceId: declaration.id,
      },
    });

    // Créer une notification pour l'acte de naissance
    await prisma.notification.create({
      data: {
        citizenId: declaration.citizenId,
        title: "Votre acte de naissance est disponible",
        message: `Votre acte de naissance (${acteNumber}) pour ${declaration.childFirstName} ${declaration.childLastName} est maintenant disponible.`,
        type: "BIRTH_CERTIFICATE",
        referenceId: birthCertificate.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        declaration: updatedDeclaration,
        birthCertificate
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'approbation:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 