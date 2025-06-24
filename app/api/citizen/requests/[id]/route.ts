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
    const pipeline = [
      { $match: { _id: new ObjectId(params.id), citizenId: new ObjectId(session.user.id) } },
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthDeclarationId',
          as: 'documents'
        }
      },
      { $lookup: {
          from: 'Payment',
          localField: '_id',
          foreignField: 'birthDeclarationId',
          as: 'paymentArr'
        }
      },
      { $addFields: {
          payment: { $arrayElemAt: ['$paymentArr', 0] }
        }
      },
      { $lookup: {
          from: 'Agent',
          localField: 'agentId',
          foreignField: '_id',
          as: 'agentArr'
        }
      },
      { $addFields: {
          agent: {
            $cond: [
              { $gt: [ { $size: '$agentArr' }, 0 ] },
              {
                firstName: { $arrayElemAt: ['$agentArr.firstName', 0] },
                lastName: { $arrayElemAt: ['$agentArr.lastName', 0] },
                email: { $arrayElemAt: ['$agentArr.email', 0] }
              },
              null
            ]
          }
        }
      },
      { $project: { paymentArr: 0, agentArr: 0 } }
    ];
    const requestDetails = await db.collection('BirthDeclaration').aggregate(pipeline).next();

    if (!requestDetails) {
      return NextResponse.json(
        { success: false, message: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requestDetails
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des détails de la demande' },
      { status: 500 }
    );
  }
}