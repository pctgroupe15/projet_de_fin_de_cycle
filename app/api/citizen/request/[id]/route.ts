import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const requestData = await db.collection('BirthCertificate').aggregate([
      { $match: { _id: new ObjectId(params.id), citizenId: new ObjectId(session.user.id) } },
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthCertificateId',
          as: 'files'
        }
      }
    ]).next();

    if (!requestData) {
      return NextResponse.json(
        { success: false, message: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requestData
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des détails' },
      { status: 500 }
    );
  }
}