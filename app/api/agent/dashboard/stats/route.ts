import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RequestStatus } from '@prisma/client';

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
      pending: birthCertificates.filter(d => d.status === RequestStatus.PENDING).length,
      approved: birthCertificates.filter(d => d.status === RequestStatus.COMPLETED).length,
      rejected: birthCertificates.filter(d => d.status === RequestStatus.REJECTED).length
    };

    const birthDeclarationsStats = {
      total: birthDeclarations.length,
      pending: birthDeclarations.filter(d => d.status === RequestStatus.PENDING).length,
      approved: birthDeclarations.filter(d => d.status === RequestStatus.COMPLETED).length,
      rejected: birthDeclarations.filter(d => d.status === RequestStatus.REJECTED).length
    };

    // Combiner toutes les demandes pour les statistiques générales
    const allRequests = [
      ...birthCertificates.map(cert => ({
        ...cert,
        type: 'birth_certificate'
      })),
      ...birthDeclarations.map(decl => ({
        ...decl,
        type: 'birth_declaration'
      }))
    ];

    const requestsStats = {
      total: allRequests.length,
      pending: allRequests.filter(req => req.status === RequestStatus.PENDING).length,
      approved: allRequests.filter(req => req.status === RequestStatus.COMPLETED).length,
      rejected: allRequests.filter(req => req.status === RequestStatus.REJECTED).length
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