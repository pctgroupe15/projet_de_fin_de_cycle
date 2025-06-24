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
    const { 
      fullName, 
      birthDate, 
      birthPlace,
      fatherFullName,
      motherFullName,
      acteNumber,
      demandeurIdProofUrl,
      existingActeUrl 
    } = data;

    if (!fullName || !birthDate || !birthPlace || !demandeurIdProofUrl) {
      return NextResponse.json(
        { success: false, message: 'Tous les champs obligatoires sont requis' },
        { status: 400 }
      );
    }

    const db = await getDb();
    // Création du birthCertificate
    const birthCertificateDoc = {
      citizenId: new ObjectId(session.user.id),
      fullName,
      birthDate: new Date(birthDate),
      birthPlace,
      fatherFullName: fatherFullName || null,
      motherFullName: motherFullName || null,
      acteNumber: acteNumber || null,
      status: 'PENDING',
      trackingNumber: nanoid(10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('BirthCertificate').insertOne(birthCertificateDoc);
    const birthCertificateId = result.insertedId;

    // Ajout des fichiers associés
    const files = [
      {
        birthCertificateId,
        type: 'DEMANDEUR_ID',
        url: demandeurIdProofUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ...(existingActeUrl ? [{
        birthCertificateId,
        type: 'EXISTING_ACTE',
        url: existingActeUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      }] : [])
    ];
    if (files.length > 0) {
      await db.collection('Document').insertMany(files);
    }

    // Retourner le birthCertificate avec les fichiers
    const birthCertificate = await db.collection('BirthCertificate').findOne({ _id: birthCertificateId });
    const birthCertificateFiles = await db.collection('Document').find({ birthCertificateId }).toArray();

    return NextResponse.json({
      success: true,
      data: {
        ...birthCertificate,
        files: birthCertificateFiles
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

// Vous pouvez ajouter d'autres méthodes HTTP (GET, PUT, DELETE) si nécessaire pour cet endpoint spécifique