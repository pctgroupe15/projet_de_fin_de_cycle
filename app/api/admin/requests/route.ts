import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Construire les conditions de filtrage
    const whereClause: any = {};
    if (status && status !== "all") {
      whereClause.status = status;
    }

    const db = await getDb();
    // Récupérer les déclarations de naissance
    const declarations = await db.collection('BirthDeclaration').aggregate([
      { $match: whereClause },
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
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthDeclarationId',
          as: 'documents'
        }
      },
      { $project: { citizenArr: 0 } }
    ]).toArray();

    // Récupérer les actes de naissance
    const certificates = await db.collection('BirthCertificate').aggregate([
      { $match: whereClause },
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
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthCertificateId',
          as: 'files'
        }
      },
      { $project: { citizenArr: 0 } }
    ]).toArray();

    // Combiner et formater les résultats
    const requests = [
      ...declarations.map((declaration: any) => ({
        id: declaration._id,
        documentType: "Déclaration de naissance",
        status: declaration.status,
        createdAt: declaration.createdAt,
        updatedAt: declaration.updatedAt || declaration.createdAt || null,
        name: `${declaration.childFirstName} ${declaration.childLastName}`,
        citizen: {
          ...declaration.citizen,
          name: (declaration.citizen?.prenom && declaration.citizen?.nom)
            ? `${declaration.citizen.prenom} ${declaration.citizen.nom}`
            : declaration.citizen?.name || 'N/A',
          email: declaration.citizen?.email || '',
        },
        documents: (declaration.documents || []).map((doc: any) => ({
          id: doc._id,
          name: doc.type,
          url: doc.url,
        })),
      })),
      ...certificates.map((certificate: any) => ({
        id: certificate._id,
        documentType: "Acte de naissance",
        status: certificate.status,
        createdAt: certificate.createdAt,
        updatedAt: certificate.updatedAt || certificate.createdAt || null,
        name: certificate.fullName,
        citizen: {
          ...certificate.citizen,
          name: (certificate.citizen?.prenom && certificate.citizen?.nom)
            ? `${certificate.citizen.prenom} ${certificate.citizen.nom}`
            : certificate.citizen?.name || 'N/A',
          email: certificate.citizen?.email || '',
        },
        documents: (certificate.files || []).map((doc: any) => ({
          id: doc._id,
          name: doc.type,
          url: doc.url,
        })),
      })),
    ];

    // Filtrer par type si spécifié
    const filteredRequests = type && type !== "all"
      ? requests.filter(request => request.documentType === type)
      : requests;

    return NextResponse.json(filteredRequests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la récupération des demandes" },
      { status: 500 }
    );
  }
}
