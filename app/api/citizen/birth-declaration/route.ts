import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';

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
      'receptionMode'
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

    // Créer la déclaration de naissance dans la base de données
    const birthDeclaration = await prisma.birthDeclaration.create({
      data: {
        citizenId: session.user.id,
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
        documents: {
          create: [
            ...(data.documents?.map((doc: any) => ({
              type: doc.type || 'DOCUMENT',
              url: doc.url
            })) || []),
            // Stocker le mode de réception et l'adresse dans un document
            {
              type: 'DELIVERY_INFO',
              url: JSON.stringify({
                mode: data.receptionMode,
                address: data.deliveryAddress
              })
            }
          ]
        },
        payment: {
          create: {
            amount: 1000,
            status: 'en_attente'
          }
        }
      },
      include: {
        documents: true,
        payment: true
      }
    });

    return NextResponse.json({
      success: true,
      data: birthDeclaration
    });
  } catch (error) {
    console.error('Error creating birth declaration:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la déclaration' },
      { status: 500 }
    );
  }
} 