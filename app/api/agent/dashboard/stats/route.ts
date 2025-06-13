import { NextResponse } from 'next/server';
import { prisma} from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

type RequestStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'IN_PROGRESS';

interface BirthDeclaration {
  id: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  citizenId: string;
  birthDate: Date;
  birthPlace: string;
  rejectReason: string | null;
  childFirstName: string;
  childLastName: string;
  childGender: string;
  fatherFirstName: string;
  fatherLastName: string;
  motherFirstName: string;
  motherLastName: string;
  receptionMode: string;
  deliveryAddress: string | null;
}

interface BirthCertificate {
  id: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  citizenId: string;
  birthDate: Date;
  birthPlace: string;
  rejectReason: string | null;
  fullName: string;
  fatherFullName: string | null;
  motherFullName: string | null;
  acteNumber: string | null;
  trackingNumber: string;
  comment: string | null;
}

interface RequestWithType extends Document {
  type: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Récupérer toutes les demandes
    const [birthCertificates, birthDeclarations] = await Promise.all([
      prisma.birthCertificate.findMany(),
      prisma.birthDeclaration.findMany()
    ]);

    // Calculer les statistiques pour chaque type
    const birthCertificatesStats = {
      total: birthCertificates.length,
      pending: birthCertificates.filter((d: BirthCertificate) => d.status === 'PENDING').length,
      approved: birthCertificates.filter((d: BirthCertificate) => d.status === 'COMPLETED').length,
      rejected: birthCertificates.filter((d: BirthCertificate) => d.status === 'REJECTED').length
    };

    const birthDeclarationsStats = {
      total: birthDeclarations.length,
      pending: birthDeclarations.filter((d: BirthDeclaration) => d.status === 'PENDING').length,
      approved: birthDeclarations.filter((d: BirthDeclaration) => d.status === 'COMPLETED').length,
      rejected: birthDeclarations.filter((d: BirthDeclaration) => d.status === 'REJECTED').length
    };

    // Combiner toutes les demandes pour les statistiques générales
    const allRequests = [
      ...birthCertificates.map((cert: BirthCertificate) => ({
        ...cert,
        type: 'birth_certificate'
      })),
      ...birthDeclarations.map((decl: BirthDeclaration) => ({
        ...decl,
        type: 'birth_declaration'
      }))
    ];

    const requestsStats = {
      total: allRequests.length,
      pending: allRequests.filter(req => req.status === 'PENDING').length,
      approved: allRequests.filter(req => req.status === 'COMPLETED').length,
      rejected: allRequests.filter(req => req.status === 'REJECTED').length
    };

    return NextResponse.json({
      success: true,
      data: {
        birthDeclarations: birthDeclarationsStats,
        birthCertificates: birthCertificatesStats,
        requests: requestsStats
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}