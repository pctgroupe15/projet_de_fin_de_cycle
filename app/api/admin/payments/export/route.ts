import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { UserRole } from "@/types/user";
import { parse } from "json2csv";

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
    // Vérifier que l'utilisateur est admin
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

    // Récupérer les paiements avec relations
    const payments = await db.collection('Payment').aggregate([
      { $lookup: {
          from: 'BirthDeclaration',
          localField: 'birthDeclarationId',
          foreignField: '_id',
          as: 'birthDeclarationArr'
        }
      },
      { $lookup: {
          from: 'BirthCertificate',
          localField: 'birthCertificateId',
          foreignField: '_id',
          as: 'birthCertificateArr'
        }
      },
      { $addFields: {
          birthDeclaration: { $arrayElemAt: ['$birthDeclarationArr', 0] },
          birthCertificate: { $arrayElemAt: ['$birthCertificateArr', 0] }
        }
      },
      { $lookup: {
          from: 'Citizen',
          localField: 'birthDeclaration.citizenId',
          foreignField: '_id',
          as: 'declarationCitizenArr'
        }
      },
      { $lookup: {
          from: 'Citizen',
          localField: 'birthCertificate.citizenId',
          foreignField: '_id',
          as: 'certificateCitizenArr'
        }
      },
      { $addFields: {
          declarationCitizen: { $arrayElemAt: ['$declarationCitizenArr', 0] },
          certificateCitizen: { $arrayElemAt: ['$certificateCitizenArr', 0] }
        }
      },
      { $project: { birthDeclarationArr: 0, birthCertificateArr: 0, declarationCitizenArr: 0, certificateCitizenArr: 0 } }
    ]).toArray();

    // Transformer les données pour le CSV
    const csvData = payments.map((payment: any) => ({
      ID: payment._id,
      "Nom du citoyen": payment.declarationCitizen?.name || payment.certificateCitizen?.name || "Inconnu",
      "Email du citoyen": payment.declarationCitizen?.email || payment.certificateCitizen?.email || "Inconnu",
      Montant: payment.amount,
      Statut: payment.status,
      Date: payment.createdAt instanceof Date ? payment.createdAt.toISOString() : payment.createdAt,
    }));

    // Convertir en CSV
    const csv = parse(csvData);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=payments.csv",
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'export CSV:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export des paiements" },
      { status: 500 }
    );
  }
}
