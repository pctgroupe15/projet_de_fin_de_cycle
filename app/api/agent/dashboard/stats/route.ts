import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const db = await getDb();
    // Récupérer toutes les demandes
    const [birthCertificates, birthDeclarations] = await Promise.all([
      db.collection('BirthCertificate').find().toArray(),
      db.collection('BirthDeclaration').find().toArray()
    ]);

    // Calculer les statistiques pour chaque type
    const birthCertificatesStats = {
      total: birthCertificates.length,
      pending: birthCertificates.filter(d => d.status === 'PENDING').length,
      approved: birthCertificates.filter(d => d.status === 'COMPLETED').length,
      rejected: birthCertificates.filter(d => d.status === 'REJECTED').length
    };

    const birthDeclarationsStats = {
      total: birthDeclarations.length,
      pending: birthDeclarations.filter(d => d.status === 'PENDING').length,
      approved: birthDeclarations.filter(d => d.status === 'COMPLETED').length,
      rejected: birthDeclarations.filter(d => d.status === 'REJECTED').length
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
      pending: allRequests.filter(req => (req as any).status === 'PENDING').length,
      approved: allRequests.filter(req => (req as any).status === 'COMPLETED').length,
      rejected: allRequests.filter(req => (req as any).status === 'REJECTED').length
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