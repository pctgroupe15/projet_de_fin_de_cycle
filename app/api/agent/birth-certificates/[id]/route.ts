import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function isValidObjectId(id: string) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    if (!isValidObjectId(params.id)) {
      return NextResponse.json(
        { success: false, message: "ID invalide" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const birthCertificateArr = await db.collection('BirthCertificate').aggregate([
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
          foreignField: 'birthCertificateId',
          as: 'files'
        }
      },
      { $lookup: {
          from: 'Payment',
          localField: '_id',
          foreignField: 'birthCertificateId',
          as: 'paymentArr'
        }
      },
      { $addFields: {
          payment: { $arrayElemAt: ['$paymentArr', 0] }
        }
      },
      { $project: { citizenArr: 0 } }
    ]).toArray();
    const birthCertificate = birthCertificateArr[0];

    if (!birthCertificate) {
      return NextResponse.json(
        { success: false, message: "Acte de naissance non trouvé" },
        { status: 404 }
      );
    }

    // Transformer les données pour inclure l'ID dans le bon format
    const transformedData = {
      id: birthCertificate._id.toString(),
      ...birthCertificate
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATE_GET]", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('PATCH birth-certificate - ID reçu:', params.id);
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "agent") {
      console.log('PATCH birth-certificate - Non autorisé');
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }
    if (!params.id) {
      console.log('PATCH birth-certificate - ID manquant');
      return NextResponse.json({ success: false, message: "ID requis" }, { status: 400 });
    }
    const data = await request.json();
    const { status, comment } = data;
    console.log('PATCH birth-certificate - Données reçues:', { status, comment });
    if (!status) {
      console.log('PATCH birth-certificate - Statut manquant');
      return NextResponse.json({ success: false, message: "Statut manquant" }, { status: 400 });
    }
    const db = await getDb();
    console.log('PATCH birth-certificate - Recherche dans BirthCertificate avec ID:', params.id);
    
    // Vérifier d'abord si le document existe
    const existingCertificate = await db.collection('BirthCertificate').findOne({ _id: new ObjectId(params.id) });
    if (!existingCertificate) {
      console.log('PATCH birth-certificate - Acte de naissance non trouvé dans la base');
      return NextResponse.json({ success: false, message: "Acte de naissance non trouvé" }, { status: 404 });
    }
    
    const birthCertificate = await db.collection('BirthCertificate').findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          status,
          comment: comment || null,
          agentId: session.user.id,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    console.log('PATCH birth-certificate - Résultat findOneAndUpdate:', birthCertificate);
    if (!birthCertificate) {
      console.log('PATCH birth-certificate - Erreur lors de la mise à jour');
      return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    // Créer une notification pour le citoyen
    const statusLabel = status === 'COMPLETED' ? 'approuvée' : status === 'REJECTED' ? 'rejetée' : 'mise à jour';
    const notificationMessage = status === 'COMPLETED' 
      ? `Votre demande d'acte de naissance (${existingCertificate.trackingNumber}) a été approuvée. Votre document est prêt.`
      : status === 'REJECTED'
      ? `Votre demande d'acte de naissance (${existingCertificate.trackingNumber}) a été rejetée. ${comment ? `Raison : ${comment}` : ''}`
      : `Votre demande d'acte de naissance (${existingCertificate.trackingNumber}) a été mise à jour.`;

    await db.collection('Notification').insertOne({
      citizenId: existingCertificate.citizenId,
      title: `Mise à jour de votre demande d'acte de naissance`,
      message: notificationMessage,
      type: "BIRTH_CERTIFICATE",
      referenceId: new ObjectId(params.id),
      status: "UNREAD",
      createdAt: new Date(),
    });

    console.log('PATCH birth-certificate - Succès');
    return NextResponse.json({ success: true, data: birthCertificate });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATE_PATCH]", error);
    return NextResponse.json({ success: false, message: "Erreur interne" }, { status: 500 });
  }
} 