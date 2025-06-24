import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Validation des données requises
    const requiredFields = [
      'fullName',
      'birthDate',
      'birthPlace',
      'fatherName',
      'motherName',
      'reason',
      'communeId'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, message: `Le champ ${field} est requis` },
          { status: 400 }
        );
      }
    }

    if (!data.communeId) {
      return NextResponse.json(
        { success: false, message: 'La commune est requise' },
        { status: 400 }
      );
    }

    const db = await getDb();
    // Trouver l'agent de la commune
    const agent = await db.collection('Agent').findOne({ communeId: new ObjectId(data.communeId) });
    if (!agent) {
      return NextResponse.json(
        { success: false, message: 'Aucun agent trouvé pour la commune sélectionnée' },
        { status: 400 }
      );
    }

    // Créer la demande d'acte de naissance
    const birthCertificateDoc = {
      citizenId: new ObjectId(session.user.id),
      fullName: data.fullName,
      birthDate: new Date(data.birthDate),
      birthPlace: data.birthPlace,
      fatherFullName: data.fatherName,
      motherFullName: data.motherName,
      status: 'PENDING',
      trackingNumber: nanoid(10),
      comment: data.reason,
      communeId: new ObjectId(data.communeId),
      agentId: agent._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('BirthCertificate').insertOne(birthCertificateDoc);
    const birthCertificate = await db.collection('BirthCertificate').findOne({ _id: result.insertedId });

    if (!birthCertificate) {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la création de la demande' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: birthCertificate._id.toString(),
        ...birthCertificate
      }
    });
  } catch (error) {
    console.error('Error creating birth certificate request:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la création de la demande' },
      { status: 500 }
    );
  }
} 