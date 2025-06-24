import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    // Vérifier la session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Validation des données requises
    const requiredFields = [
      'childName',
      'birthDate',
      'birthTime',
      'birthPlace',
      'gender',
      'fatherName',
      'motherName',
      'receptionMode',
      'communeId'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, error: `Le champ ${field} est requis` },
          { status: 400 }
        );
      }
    }

    // Séparer le nom complet en prénom et nom
    const [childFirstName, childLastName] = data.childName.split(' ').filter(Boolean);
    const [fatherFirstName, fatherLastName] = data.fatherName.split(' ').filter(Boolean);
    const [motherFirstName, motherLastName] = data.motherName.split(' ').filter(Boolean);

    if (!motherLastName) {
      return NextResponse.json(
        { success: false, error: 'Le nom de famille de la mère est requis' },
        { status: 400 }
      );
    }

    // Le citoyen doit renseigner la commune (communeId)
    if (!data.communeId) {
      return NextResponse.json(
        { success: false, error: 'La commune est requise' },
        { status: 400 }
      );
    }

    const db = await getDb();
    // Trouver l'agent de la commune
    const agent = await db.collection('Agent').findOne({ communeId: new ObjectId(data.communeId) });
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Aucun agent trouvé pour la commune sélectionnée' },
        { status: 400 }
      );
    }

    // Créer la déclaration de naissance dans la base de données
    const birthDeclarationDoc = {
      citizenId: new ObjectId(session.user.id),
      childFirstName,
      childLastName,
      childGender: data.gender,
      birthDate: new Date(data.birthDate),
      birthPlace: data.birthPlace,
      fatherFirstName,
      fatherLastName,
      motherFirstName,
      motherLastName,
      status: 'PENDING',
      communeId: new ObjectId(data.communeId),
      agentId: agent._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('BirthDeclaration').insertOne(birthDeclarationDoc);
    const birthDeclarationId = result.insertedId;

    // Ajout des documents associés
    const documents = [
      ...((data.documents?.map((doc: any) => ({
        birthDeclarationId,
        type: doc.type || 'DOCUMENT',
        url: doc.url,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) || [])),
      {
        birthDeclarationId,
        type: 'DELIVERY_INFO',
        url: JSON.stringify({
          mode: data.receptionMode,
          address: data.deliveryAddress
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];
    if (documents.length > 0) {
      await db.collection('Document').insertMany(documents);
    }

    // Retourner la déclaration avec les documents
    const birthDeclaration = await db.collection('BirthDeclaration').findOne({ _id: birthDeclarationId });
    const birthDeclarationDocuments = await db.collection('Document').find({ birthDeclarationId }).toArray();

    if (!birthDeclaration) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de la déclaration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: birthDeclaration._id.toString(),
        ...birthDeclaration,
        documents: birthDeclarationDocuments
      }
    });
  } catch (error) {
    console.error('Error creating birth declaration:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la déclaration' },
      { status: 500 }
    );
  }
} 