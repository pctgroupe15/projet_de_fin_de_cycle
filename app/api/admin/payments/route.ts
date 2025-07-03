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
    const dateRange = searchParams.get("dateRange");

    let matchClause: any = {};

    // Filtre par statut
    if (status && status !== "all") {
      matchClause.status = status;
    }

    // Filtre par date
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      matchClause.createdAt = {
        $gte: startDate,
        $lte: now,
      };
    }

    const db = await getDb();
    const payments = await db.collection('Payment').aggregate([
      { $match: matchClause },
      { $sort: { createdAt: -1 } },
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

    // Enrichir chaque paiement avec citizen.name pour birthDeclaration et birthCertificate
    const enrichedPayments = payments.map(payment => {
      // Pour la déclaration de naissance
      let birthDeclaration = payment.birthDeclaration;
      let declarationCitizen = payment.declarationCitizen;
      if (birthDeclaration && declarationCitizen) {
        birthDeclaration = {
          ...birthDeclaration,
          citizen: {
            ...declarationCitizen,
            name: (declarationCitizen.prenom && declarationCitizen.nom)
              ? `${declarationCitizen.prenom} ${declarationCitizen.nom}`
              : declarationCitizen.name || '',
            email: declarationCitizen.email || ''
          }
        };
      }
      // Pour l'acte de naissance
      let birthCertificate = payment.birthCertificate;
      let certificateCitizen = payment.certificateCitizen;
      if (birthCertificate && certificateCitizen) {
        birthCertificate = {
          ...birthCertificate,
          citizen: {
            ...certificateCitizen,
            name: (certificateCitizen.prenom && certificateCitizen.nom)
              ? `${certificateCitizen.prenom} ${certificateCitizen.nom}`
              : certificateCitizen.name || '',
            email: certificateCitizen.email || ''
          }
        };
      }
      return {
        ...payment,
        birthDeclaration,
        birthCertificate
      };
    });

    return NextResponse.json(enrichedPayments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la récupération des paiements" },
      { status: 500 }
    );
  }
} 