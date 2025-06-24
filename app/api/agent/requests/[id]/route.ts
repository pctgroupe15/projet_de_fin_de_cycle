import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

    // Validation de l'ID
    if (!params.id || params.id === 'undefined') {
      return NextResponse.json(
        { success: false, message: 'ID de demande invalide' },
        { status: 400 }
      );
    }

    // Validation du format ObjectId
    if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Format d\'ID invalide' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const requestDetails = await db.collection('BirthDeclaration').aggregate([
      { $match: { _id: new ObjectId(params.id) } },
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
      { $project: { paymentArr: 0, citizenArr: 0 } }
    ]).toArray();

    if (!requestDetails[0]) {
      return NextResponse.json(
        { success: false, message: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Transformer les données pour inclure l'ID dans le bon format
    const transformedData = {
      id: requestDetails[0]._id.toString(),
      ...requestDetails[0]
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des détails de la demande' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Validation de l'ID
    if (!params.id || params.id === 'undefined') {
      return NextResponse.json(
        { success: false, message: 'ID de demande invalide' },
        { status: 400 }
      );
    }

    // Validation du format ObjectId
    if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Format d\'ID invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: 'Le statut est requis' },
        { status: 400 }
      );
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Statut invalide' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    if (status === 'IN_PROGRESS') {
      updateData.agentId = session.user.id;
    }

    const updatedRequest = await db.collection('BirthDeclaration').findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!updatedRequest || !updatedRequest.value) {
      return NextResponse.json(
        { success: false, message: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Transformer les données pour inclure l'ID dans le bon format
    const transformedData = {
      id: updatedRequest.value._id.toString(),
      ...updatedRequest.value
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
}