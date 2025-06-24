import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    // Récupérer les demandes d'acte de naissance de l'utilisateur
    const requests = await db.collection('BirthCertificate').aggregate([
      { $match: { citizenId: new ObjectId(session.user.id) } },
      { $sort: { createdAt: -1 } },
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthCertificateId',
          as: 'files'
        }
      },
      { $project: {
          id: '$_id',
          fullName: 1,
          birthDate: 1,
          status: 1,
          trackingNumber: 1,
          createdAt: 1,
          files: {
            $map: {
              input: '$files',
              as: 'file',
              in: { type: '$$file.type', url: '$$file.url' }
            }
          }
        }
      }
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching citizen requests:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des demandes' },
      { status: 500 }
    );
  }
}