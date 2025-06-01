import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';

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
      'reason'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, message: `Le champ ${field} est requis` },
          { status: 400 }
        );
      }
    }

    // Créer la demande d'acte de naissance
    const birthCertificate = await prisma.birthCertificate.create({
      data: {
        citizenId: session.user.id,
        fullName: data.fullName,
        birthDate: new Date(data.birthDate),
        birthPlace: data.birthPlace,
        fatherFullName: data.fatherName,
        motherFullName: data.motherName,
        status: 'PENDING',
        trackingNumber: nanoid(10),
        comment: data.reason
      }
    });

    return NextResponse.json({
      success: true,
      data: birthCertificate
    });
  } catch (error) {
    console.error('Error creating birth certificate request:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la création de la demande' },
      { status: 500 }
    );
  }
} 