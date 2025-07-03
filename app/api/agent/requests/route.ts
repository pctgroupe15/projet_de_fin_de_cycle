import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const db = await getDb();

    // Récupérer les actes de naissance
    const birthCertificates = await db.collection('BirthCertificate').aggregate([
      { $match: { status: { $ne: 'REJECTED' } } },
      { $sort: { createdAt: -1 } },
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
      { $project: { citizenArr: 0 } }
    ]).toArray();

    // Récupérer les déclarations de naissance
    const birthDeclarations = await db.collection('BirthDeclaration').aggregate([
      { $match: { status: { $ne: 'REJECTED' } } },
      { $sort: { createdAt: -1 } },
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
      { $project: { citizenArr: 0 } }
    ]).toArray();

    // Formater les données pour un affichage uniforme
    const formattedBirthCertificates = birthCertificates.map((cert: any) => ({
      id: cert._id.toString(),
      type: 'birth_certificate' as const,
      fullName: cert.fullName,
      birthDate: cert.birthDate,
      birthPlace: cert.birthPlace,
      status: cert.status,
      createdAt: cert.createdAt,
      citizen: {
        ...cert.citizen,
        name: (cert.citizen?.prenom && cert.citizen?.nom)
          ? `${cert.citizen.prenom} ${cert.citizen.nom}`
          : cert.citizen?.name || 'N/A',
        email: cert.citizen?.email || ''
      }
    }));

    const formattedBirthDeclarations = birthDeclarations.map((decl: any) => ({
      id: decl._id.toString(),
      type: 'birth_declaration' as const,
      childFirstName: decl.childFirstName,
      childLastName: decl.childLastName,
      birthDate: decl.birthDate,
      birthPlace: decl.birthPlace,
      status: decl.status,
      createdAt: decl.createdAt,
      citizen: {
        ...decl.citizen,
        name: (decl.citizen?.prenom && decl.citizen?.nom)
          ? `${decl.citizen.prenom} ${decl.citizen.nom}`
          : decl.citizen?.name || 'N/A',
        email: decl.citizen?.email || ''
      }
    }));

    // Combiner et trier toutes les demandes par date de création
    const allRequests = [...formattedBirthCertificates, ...formattedBirthDeclarations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: allRequests
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    return new NextResponse("Erreur interne du serveur", { status: 500 });
  }
}