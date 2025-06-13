import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RequestWithCitizen {
  id: string;
  status: string;
  createdAt: Date;
  childFirstName: string;
  childLastName: string;
  citizen: { 
    name: string | null; 
    email: string; };
}

interface PaymentWithDetails {
  id: string;
  amount: number;
  status: string;
  createdAt: Date;
  birthDeclaration?: { 
    childFirstName: string;
    childLastName: string;
    citizen: { 
      name: string | null; 
      email: string; 
    }
  } | null;
  birthCertificate?: {
    fullName: string;
    citizen: { 
      name: string | null; 
      email: string; 
    }
  } | null;
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

    // Définir la période en fonction du timeRange
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
        startDate.setDate(now.getDate() - 7); // Par défaut, une semaine
    }

    // Récupérer les statistiques des utilisateurs
    const [totalUsers, activeUsers, newUsers] = await Promise.all([
      prisma.citizen.count(),
      prisma.citizen.count({
        where: { status: "active" },
      }),
      prisma.citizen.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
      }),
    ]);

    // Récupérer les statistiques des documents
    const [totalDeclarations, totalCertificates, pendingDeclarations, pendingCertificates, completedDeclarations, completedCertificates] = await Promise.all([
      prisma.birthDeclaration.count(),
      prisma.birthCertificate.count(),
      prisma.birthDeclaration.count({
        where: { status: "PENDING" },
      }),
      prisma.birthCertificate.count({
        where: { status: "PENDING" },
      }),
      prisma.birthDeclaration.count({
        where: { status: "COMPLETED" },
      }),
      prisma.birthCertificate.count({
        where: { status: "COMPLETED" },
      }),
    ]);

    // Récupérer les statistiques des paiements
    const [totalPayments, totalAmount, pendingPayments] = await Promise.all([
      prisma.payment.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: "PAID",
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.payment.count({
        where: {
          status: "PENDING",
        },
      }),
    ]);

    // Récupérer les statistiques des agents
    const [totalAgents, activeAgents] = await Promise.all([
      prisma.agent.count(),
      prisma.agent.count({
        where: { status: "active" },
      }),
    ]);

    // Récupérer les requêtes récentes
    const recentRequests = await prisma.birthDeclaration.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        childFirstName: true,
        childLastName: true,
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Récupérer les paiements récents
    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        birthDeclaration: {
          select: {
            childFirstName: true,
            childLastName: true,
            citizen: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        birthCertificate: {
          select: {
            fullName: true,
            citizen: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Formater les données pour le tableau de bord
    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
      },
      documents: {
        declarations: totalDeclarations,
        certificates: totalCertificates,
        total: totalDeclarations + totalCertificates,
        pending: pendingDeclarations + pendingCertificates,
        completed: completedDeclarations + completedCertificates,
      },
      payments: {
        total: totalPayments,
        amount: totalAmount._sum.amount || 0,
        pending: pendingPayments,
      },
      agents: {
        total: totalAgents,
        active: activeAgents,
      },
      recentRequests: recentRequests.map((request: RequestWithCitizen) => ({
        id: request.id,
        type: "Déclaration de naissance",
        status: request.status,
        createdAt: request.createdAt,
        name: `${request.childFirstName} ${request.childLastName}`,
        citizen: request.citizen.name,
        email: request.citizen.email,
      })),
      recentPayments: recentPayments.map((payment: PaymentWithDetails) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        type: payment.birthDeclaration ? "Déclaration de naissance" : "Acte de naissance",
        name: payment.birthDeclaration 
          ? `${payment.birthDeclaration.childFirstName} ${payment.birthDeclaration.childLastName}`
          : payment.birthCertificate?.fullName || "Document inconnu",
        citizen: payment.birthDeclaration?.citizen.name || payment.birthCertificate?.citizen.name || "Citoyen inconnu",
        email: payment.birthDeclaration?.citizen.email || payment.birthCertificate?.citizen.email || "Email inconnu",
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
} 