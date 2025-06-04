import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    let whereClause: any = {};

    // Filtre par statut
    if (status && status !== "all") {
      whereClause.status = status;
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

      whereClause.createdAt = {
        gte: startDate,
        lte: now,
      };
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        birthDeclaration: {
          select: {
            id: true,
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
            id: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la récupération des paiements" },
      { status: 500 }
    );
  }
} 