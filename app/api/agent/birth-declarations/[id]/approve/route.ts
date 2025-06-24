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

    if (!decl) {
      return NextResponse.json(
        { success: false, message: 'Déclaration non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si la déclaration est en attente
    if (decl.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Cette déclaration a déjà été traitée' },
        { status: 400 }
      );
    }

    // Vérifier le paiement
    if (!decl.payment || decl.payment.status !== 'PAID') {
      return NextResponse.json(
        { success: false, message: 'Le paiement n\'a pas été effectué' },
        { status: 400 }
      );
    }

    // Générer un numéro d'acte unique
    const acteNumber = `ACTE-${nanoid(8)}`;
    const trackingNumber = nanoid(10);

    // Créer les fichiers associés à l'acte
    const files = (decl.documents || []).map((doc: any) => ({
      type: doc.type,
      url: doc.url
    }));

    // Créer l'acte de naissance
    const birthCertificateInsert = await db.collection('BirthCertificate').insertOne({
      citizenId: decl.citizenId,
      fullName: `${decl.childFirstName} ${decl.childLastName}`,
      birthDate: decl.birthDate,
      birthPlace: decl.birthPlace,
      fatherFullName: `${decl.fatherFirstName} ${decl.fatherLastName}`,
      motherFullName: `${decl.motherFirstName} ${decl.motherLastName}`,
      acteNumber,
      status: 'COMPLETED',
      trackingNumber,
      agentId: session.user.id,
      files,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const birthCertificate = await db.collection('BirthCertificate').findOne({ _id: birthCertificateInsert.insertedId });

    if (!birthCertificate) {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la création de l\'acte de naissance' },
        { status: 500 }
      );
    }

    // Mettre à jour le statut de la déclaration
    const updatedDeclaration = await db.collection('BirthDeclaration').findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: { status: 'COMPLETED', agentId: session.user.id, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updatedDeclaration || !updatedDeclaration.value) {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la mise à jour de la déclaration' },
        { status: 500 }
      );
    }

    // Créer une notification pour le citoyen
    await db.collection('Notification').insertOne({
      citizenId: decl.citizenId,
      title: "Votre déclaration de naissance a été approuvée",
      message: `Votre déclaration de naissance pour ${decl.childFirstName} ${decl.childLastName} a été approuvée. Votre acte de naissance (${acteNumber}) est maintenant disponible.`,
      type: "BIRTH_DECLARATION",
      referenceId: decl._id,
      createdAt: new Date(),
    });

    // Créer une notification pour l'acte de naissance
    await db.collection('Notification').insertOne({
      citizenId: decl.citizenId,
      title: "Votre acte de naissance est disponible",
      message: `Votre acte de naissance (${acteNumber}) pour ${decl.childFirstName} ${decl.childLastName} est maintenant disponible.`,
      type: "BIRTH_CERTIFICATE",
      referenceId: birthCertificate._id,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        declaration: updatedDeclaration.value,
        birthCertificate
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