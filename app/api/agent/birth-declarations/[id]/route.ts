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

    if (!session || session.user.role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Validation de l'ID
    if (!params.id || params.id === 'undefined') {
      return NextResponse.json(
        { success: false, message: 'ID de déclaration invalide' },
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
    const declarationArr = await db.collection('BirthDeclaration').aggregate([
      { $match: { _id: new ObjectId(params.id) } },
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
      { $project: { citizenArr: 0, paymentArr: 0 } }
    ]).toArray();

    const declaration = declarationArr[0];

    if (!declaration) {
      return NextResponse.json(
        { success: false, message: 'Déclaration non trouvée' },
        { status: 404 }
      );
    }

    // Transformer les données pour inclure l'ID dans le bon format
    const transformedData = {
      id: declaration._id.toString(),
      ...declaration
    };

    return NextResponse.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
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

    if (!session || session.user.role !== 'agent') {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Validation de l'ID
    if (!params.id || params.id === 'undefined') {
      return NextResponse.json(
        { success: false, message: 'ID de déclaration invalide' },
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

    if (!status || !['en_attente', 'approuvé', 'rejeté'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Statut invalide' },
        { status: 400 }
      );
    }

    const db = await getDb();
    // Vérifier si l'admin a déjà validé la déclaration
    const existingDeclaration = await db.collection('BirthDeclaration').findOne({ _id: new ObjectId(params.id) });

    if (!existingDeclaration) {
      return NextResponse.json(
        { success: false, message: 'Déclaration non trouvée' },
        { status: 404 }
      );
    }

    // Si l'admin a déjà validé ou rejeté la déclaration, empêcher la modification
    if (["COMPLETED", "REJECTED"].includes(existingDeclaration.status)) {
      return NextResponse.json(
        { success: false, message: 'Cette déclaration a déjà été traitée par l\'administrateur' },
        { status: 403 }
      );
    }

    const updatedDeclaration = await db.collection('BirthDeclaration').findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: { status } },
      { returnDocument: 'after' }
    );

    if (!updatedDeclaration || !updatedDeclaration.value) {
      return NextResponse.json(
        { success: false, message: 'Déclaration non trouvée' },
        { status: 404 }
      );
    }

    // Transformer les données pour inclure l'ID dans le bon format
    const transformedData = {
      id: updatedDeclaration.value._id.toString(),
      ...updatedDeclaration.value
    };

    return NextResponse.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}