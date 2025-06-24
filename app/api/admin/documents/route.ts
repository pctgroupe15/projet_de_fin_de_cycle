import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { UserRole } from "@/types/user";

// GET - Récupérer tous les documents
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const db = await getDb();
    // Vérifier si l'utilisateur est un admin
    const admin = await db.collection('User').findOne({
      email: session.user.email,
      role: UserRole.ADMIN,
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Récupérer toutes les déclarations de naissance
    const birthDeclarations = await db.collection('BirthDeclaration').aggregate([
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

    // Récupérer tous les actes de naissance
    const birthCertificates = await db.collection('BirthCertificate').aggregate([
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

    // Transformer les données pour un format uniforme
    const documents = [
      ...birthDeclarations.map((doc: any) => ({
        id: doc._id,
        type: "BirthDeclaration",
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        citizenId: doc.citizenId,
        citizenName: doc.citizen?.name || '',
      })),
      ...birthCertificates.map((doc: any) => ({
        id: doc._id,
        type: "BirthCertificate",
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        citizenId: doc.citizenId,
        citizenName: doc.citizen?.name || '',
      })),
    ];

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Erreur lors de la récupération des documents:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des documents" },
      { status: 500 }
    );
  }
}
