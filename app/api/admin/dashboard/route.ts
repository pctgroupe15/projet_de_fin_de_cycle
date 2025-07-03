import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface RecentRequest {
  id: string;
  status: string;
  createdAt: Date;
  childFirstName: string;
  childLastName: string;
  citizen: {
    name: string;
    email: string;
  };
}

interface RecentPayment {
  id: string;
  amount: number;
  status: string;
  createdAt: Date;
  birthDeclaration?: {
    childFirstName: string;
    childLastName: string;
    citizen: {
      name: string;
      email: string;
    };
  };
  birthCertificate?: {
    fullName: string;
    citizen: {
      name: string;
      email: string;
    };
  };
}

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
    const timeRange = searchParams.get("timeRange") || "week";

    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
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
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const db = await getDb();

    const [totalUsers, activeUsers, newUsers] = await Promise.all([
      db.collection('Citizen').countDocuments(),
      db.collection('Citizen').countDocuments({ status: "active" }),
      db.collection('Citizen').countDocuments({
        createdAt: { $gte: startDate, $lte: now },
      }),
    ]);

    const [totalDeclarations, totalCertificates, pendingDeclarations, pendingCertificates, completedDeclarations, completedCertificates] = await Promise.all([
      db.collection('BirthDeclaration').countDocuments(),
      db.collection('BirthCertificate').countDocuments(),
      db.collection('BirthDeclaration').countDocuments({ status: "PENDING" }),
      db.collection('BirthCertificate').countDocuments({ status: "PENDING" }),
      db.collection('BirthDeclaration').countDocuments({ status: "COMPLETED" }),
      db.collection('BirthCertificate').countDocuments({ status: "COMPLETED" }),
    ]);

    const [totalPayments, totalAmountAgg, pendingPayments] = await Promise.all([
      db.collection('Payment').countDocuments({
        createdAt: { $gte: startDate, $lte: now },
      }),
      db.collection('Payment').aggregate([
        { $match: { status: "PAID", createdAt: { $gte: startDate, $lte: now } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).toArray(),
      db.collection('Payment').countDocuments({ status: "PENDING" }),
    ]);
    const totalAmount = totalAmountAgg[0]?.total || 0;

    const [totalAgents, activeAgents] = await Promise.all([
      db.collection('Agent').countDocuments(),
      db.collection('Agent').countDocuments({ status: "active" }),
    ]);

    const recentRequests = await db.collection('BirthDeclaration').aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
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

    const recentPayments = await db.collection('Payment').aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
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
      { $project: { birthDeclarationArr: 0, birthCertificateArr: 0 } }
    ]).toArray();

    // Enrichir les demandes récentes avec citizen.name
    const enrichedRecentRequests = recentRequests.map(req => ({
      ...req,
      citizen: req.citizen ? {
        ...req.citizen,
        name: (req.citizen.prenom && req.citizen.nom)
          ? `${req.citizen.prenom} ${req.citizen.nom}`
          : req.citizen.name || '',
        email: req.citizen.email || ''
      } : { name: '', email: '' }
    }));

    // Formater les demandes récentes pour le frontend
    const formattedRecentRequests = enrichedRecentRequests.map((req: any) => ({
      id: (req?._id && req._id.toString()) || req?.id || '',
      type: "Déclaration de naissance",
      status: req?.status || '',
      createdAt: req?.createdAt || '',
      name: (req?.childFirstName && req?.childLastName)
        ? `${req.childFirstName} ${req.childLastName}`
        : req?.name || '',
      citizen: req?.citizen ? {
        name: req.citizen.name || '',
        email: req.citizen.email || ''
      } : { name: '', email: '' }
    }));

    // Enrichir les paiements récents avec citizen.name
    const enrichedRecentPayments = await Promise.all(recentPayments.map(async payment => {
      let birthDeclaration = payment.birthDeclaration;
      let birthCertificate = payment.birthCertificate;
      let declarationCitizen = null;
      let certificateCitizen = null;
      const db = await getDb();
      if (birthDeclaration && birthDeclaration.citizenId) {
        declarationCitizen = await db.collection('Citizen').findOne({ _id: birthDeclaration.citizenId });
      }
      if (birthCertificate && birthCertificate.citizenId) {
        certificateCitizen = await db.collection('Citizen').findOne({ _id: birthCertificate.citizenId });
      }
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
    }));

    // Formater les paiements récents pour le frontend
    const formattedRecentPayments = enrichedRecentPayments.map((payment: any) => ({
      ...payment,
      citizen: payment.birthDeclaration?.citizen
        ? {
            name: payment.birthDeclaration.citizen.name || '',
            email: payment.birthDeclaration.citizen.email || ''
          }
        : payment.birthCertificate?.citizen
        ? {
            name: payment.birthCertificate.citizen.name || '',
            email: payment.birthCertificate.citizen.email || ''
          }
        : { name: '', email: '' }
    }));

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
      },
      declarations: {
        total: totalDeclarations,
        pending: pendingDeclarations,
        completed: completedDeclarations,
      },
      certificates: {
        total: totalCertificates,
        pending: pendingCertificates,
        completed: completedCertificates,
      },
      payments: {
        total: totalPayments,
        amount: totalAmount,
        pending: pendingPayments,
      },
      agents: {
        total: totalAgents,
        active: activeAgents,
      },
      recentRequests: formattedRecentRequests,
      recentPayments: formattedRecentPayments,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la récupération des données du dashboard" },
      { status: 500 }
    );
  }
}
