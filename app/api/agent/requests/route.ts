import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type RequestStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'IN_PROGRESS';

interface BirthCertificate {
  id: string;
  fullName: string;
  birthDate: Date;
  birthPlace: string;
  status: RequestStatus;
  createdAt: Date;
  citizenId: string;
}

interface BirthDeclaration {
  id: string;
  childFirstName: string;
  childLastName: string;
  birthDate: Date;
  birthPlace: string;
  status: RequestStatus;
  createdAt: Date;
  citizenId: string;
}

interface BirthCertificateWithCitizen {
  id: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  citizenId: string;
  fullName: string;
  birthDate: Date;
  birthPlace: string;
  fatherFullName: string | null;
  motherFullName: string | null;
  acteNumber: string | null;
  trackingNumber: string;
  comment: string | null;
  citizen: {
    name: string | null;
    email: string;
  };
}

type BirthDeclarationWithCitizen = BirthDeclaration & {
  citizen: {
    name: string | null;
    email: string;
  };
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    // Récupérer les actes de naissance
    const birthCertificates = await prisma.birthCertificate.findMany({
      where: {
        status: {
          not: 'REJECTED'
        }
      },
      include: {
        citizen: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Récupérer les déclarations de naissance
    const birthDeclarations = await prisma.birthDeclaration.findMany({
      where: {
        status: {
          not: 'REJECTED'
        }
      },
      include: {
        citizen: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formater les données pour un affichage uniforme
    const formattedBirthCertificates = birthCertificates.map((cert: BirthCertificateWithCitizen) => ({
      id: cert.id,
      type: 'birth_certificate' as const,
      fullName: cert.fullName,
      birthDate: cert.birthDate,
      birthPlace: cert.birthPlace,
      status: cert.status,
      createdAt: cert.createdAt,
      citizen: {
        name: cert.citizen.name,
        email: cert.citizen.email
      }
    }));

    const formattedBirthDeclarations = birthDeclarations.map((decl: BirthDeclarationWithCitizen) => ({
      id: decl.id,
      type: 'birth_declaration' as const,
      childFirstName: decl.childFirstName,
      childLastName: decl.childLastName,
      birthDate: decl.birthDate,
      birthPlace: decl.birthPlace,
      status: decl.status,
      createdAt: decl.createdAt,
      citizen: {
        name: decl.citizen.name || 'N/A',
        email: decl.citizen.email
      }
    }));

    // Combiner et trier toutes les demandes par date de création
    const allRequests = [...formattedBirthCertificates, ...formattedBirthDeclarations]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({
      success: true,
      data: allRequests
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    return new NextResponse("Erreur interne du serveur", { status: 500 });
  }
}