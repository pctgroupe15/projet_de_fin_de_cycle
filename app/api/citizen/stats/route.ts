import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Obtenir la date du début du mois dernier
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setHours(0, 0, 0, 0);

    const db = await getDb();
    const citizenId = session.user.id;
    let objectId = null;
    try {
      objectId = new ObjectId(citizenId);
    } catch {}

    if (!objectId) {
      return NextResponse.json({
        totalRequests: 0,
        lastMonthRequests: 0,
        pendingRequests: 0,
        validatedRequests: 0,
        rejectedRequests: 0,
        recentRequests: []
      });
    }

    // Récupérer toutes les demandes du citoyen (citizenId en ObjectId uniquement)
    const [birthCertificates, birthDeclarations] = await Promise.all([
      db.collection('BirthCertificate').find({ citizenId: objectId }).toArray(),
      db.collection('BirthDeclaration').find({ citizenId: objectId }).toArray()
    ]);

    // Combiner les demandes
    const allRequests = [
      ...birthCertificates.map(cert => ({
        ...(cert as any),
        documentType: 'birth_certificate'
      })),
      ...birthDeclarations.map(decl => ({
        ...(decl as any),
        documentType: 'birth_declaration'
      }))
    ];

    // Calculer les statistiques
    const totalRequests = allRequests.length;
    const lastMonthRequests = allRequests.filter(req => new Date((req as any).createdAt) >= lastMonth).length;
    const pendingRequests = allRequests.filter(req => (req as any).status === 'PENDING').length;
    const validatedRequests = allRequests.filter(req => (req as any).status === 'COMPLETED').length;
    const rejectedRequests = allRequests.filter(req => (req as any).status === 'REJECTED').length;

    // Récupérer les demandes récentes (5 dernières)
    const recentRequests = allRequests
      .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime())
      .slice(0, 5)
      .map(req => ({
        _id: (req as any)._id,
        documentType: (req as any).documentType,
        status: (req as any).status,
        createdAt: (req as any).createdAt,
        trackingNumber: 'trackingNumber' in req ? (req as any).trackingNumber : null,
        files: 'files' in req ? (req as any).files : []
      }));

    return NextResponse.json({
      totalRequests,
      lastMonthRequests,
      pendingRequests,
      validatedRequests,
      rejectedRequests,
      recentRequests
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}