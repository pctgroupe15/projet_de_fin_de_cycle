import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const documentRequest = await prisma.documentRequest.findUnique({
      where: {
        id: params.id,
      },
      include: {
        documents: true,
        payment: true,
        citizen: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!documentRequest) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que la demande appartient bien au citoyen connecté
    if (documentRequest.citizen.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    return NextResponse.json(documentRequest);
  } catch (error) {
    console.error('Erreur lors de la récupération des détails:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des détails' },
      { status: 500 }
    );
  }
} 