import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const db = await getDb();
    // Vérifier si l'utilisateur est un agent
    const agent = await db.collection('Agent').findOne({ email: session.user.email });

    if (!agent) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Obtenir la date du début du mois dernier
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setHours(0, 0, 0, 0);

    // Compter le nombre total de demandes
    const totalRequests = await db.collection('BirthCertificate').countDocuments();

    // Compter les demandes du mois dernier
    const lastMonthRequests = await db.collection('BirthCertificate').countDocuments({
      createdAt: { $gte: lastMonth }
    });

    // Compter les demandes en attente
    const pendingRequests = await db.collection('BirthCertificate').countDocuments({
      status: 'PENDING'
    });

    // Compter les demandes validées
    const validatedRequests = await db.collection('BirthCertificate').countDocuments({
      status: 'COMPLETED'
    });

    // Compter les demandes rejetées
    const rejectedRequests = await db.collection('BirthCertificate').countDocuments({
      status: 'REJECTED'
    });

    // Récupérer les demandes récentes (5 dernières)
    const recentRequests = await db.collection('BirthCertificate').aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      { $lookup: {
          from: 'Citizen',
          localField: 'citizenId',
          foreignField: '_id',
          as: 'citizenArr'
        }
      },
      { $addFields: {
          citizen: { $arrayElemAt: ['$citizenArr', 0] }
        }
      },
      { $project: { citizenArr: 0 } }
    ]).toArray();

    // Formater les demandes récentes
    const formattedRecentRequests = recentRequests.map(request => ({
      _id: request._id,
      documentType: 'birth_certificate',
      status: request.status,
      createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt,
      citizenEmail: request.citizen?.email || 'N/A'
    }));

    // Récupérer les statistiques par jour (7 derniers jours)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const statsByDay = await db.collection('BirthCertificate').aggregate([
      { $match: { createdAt: { $gte: lastWeek } } },
      { $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Formater les statistiques par jour
    const formattedStatsByDay = statsByDay.map(stat => ({
      _id: stat._id,
      count: stat.count
    }));

    // Statistiques par type de document
    const statsByType = [
      {
        _id: 'birth_certificate',
        count: totalRequests,
        pending: pendingRequests,
        validated: validatedRequests,
        rejected: rejectedRequests
      }
    ];

    return NextResponse.json({
      totalRequests,
      lastMonthRequests,
      pendingRequests,
      validatedRequests,
      rejectedRequests,
      recentRequests: formattedRecentRequests,
      statsByDay: formattedStatsByDay,
      statsByType
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}