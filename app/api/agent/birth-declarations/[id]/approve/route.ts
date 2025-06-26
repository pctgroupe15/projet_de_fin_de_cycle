import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

export async function POST(
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

    const db = await getDb();
    // Vérifier si la déclaration existe
    const declaration = await db.collection('BirthDeclaration').aggregate([
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
    const decl = declaration[0];

    // Toutes les vérifications AVANT toute modification !
    if (!decl) {
      return NextResponse.json(
        { success: false, message: 'Déclaration non trouvée' },
        { status: 404 }
      );
    }
    if (decl.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Cette déclaration a déjà été traitée' },
        { status: 400 }
      );
    }
    if (!decl.payment || decl.payment.status !== 'PAID') {
      return NextResponse.json(
        { success: false, message: 'Le paiement n\'a pas été effectué' },
        { status: 400 }
      );
    }

    // Ici seulement, on modifie la base !
    // Mettre à jour le statut de la déclaration
    const updatedDeclaration = await db.collection('BirthDeclaration').findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: { status: 'COMPLETED', agentId: session.user.id, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    console.log('updatedDeclaration:', updatedDeclaration);
    if (!updatedDeclaration || Object.keys(updatedDeclaration).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la mise à jour de la déclaration' },
        { status: 500 }
      );
    }

    // Créer une notification pour le citoyen
    await db.collection('Notification').insertOne({
      citizenId: decl.citizen?._id || decl.citizenId,
      title: "Votre déclaration de naissance a été approuvée",
      message: `Votre déclaration de naissance pour ${decl.childFirstName} ${decl.childLastName} a été approuvée. Vous pouvez maintenant récupérer l'acte de naissance auprès de la mairie ou attendre qu'il soit téléversé par l'agent.`,
      type: "BIRTH_DECLARATION",
      referenceId: decl._id,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        declaration: updatedDeclaration.value || updatedDeclaration,
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'approbation:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 