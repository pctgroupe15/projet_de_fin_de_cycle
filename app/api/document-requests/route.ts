import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { type, deliveryMode, deliveryAddress, amount } = await req.json();

    // Récupérer l'ID du citoyen
    const citizen = await prisma.citizen.findUnique({
      where: { email: session.user.email },
    });

    if (!citizen) {
      return NextResponse.json(
        { error: 'Citoyen non trouvé' },
        { status: 404 }
      );
    }

    // Créer la demande de document
    const documentRequest = await prisma.documentRequest.create({
      data: {
        type,
        status: 'PENDING',
        citizenId: citizen.id,
        deliveryMode,
        deliveryAddress,
        amount,
      },
    });

    return NextResponse.json(documentRequest);
  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la demande' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Récupérer l'ID du citoyen
    const citizen = await prisma.citizen.findUnique({
      where: { email: session.user.email },
    });

    if (!citizen) {
      return NextResponse.json(
        { error: 'Citoyen non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer toutes les demandes du citoyen
    const documentRequests = await prisma.documentRequest.findMany({
      where: { citizenId: citizen.id },
      include: {
        documents: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(documentRequests);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des demandes' },
      { status: 500 }
    );
  }
} 