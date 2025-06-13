import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Parser } from "json2csv";

interface PaymentWithDetails {
  id: string;
  amount: number;
  status: string;
  createdAt: Date;
  birthDeclaration: {
    childFirstName: string;
    childLastName: string;
    citizen: {
      name: string | null;
      email: string;
    };
  } | null;
  birthCertificate: {
    fullName: string;
    citizen: {
      name: string | null;
      email: string;
    };
  } | null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, dateRange } = body;

    let whereClause: any = {};

    if (status && status !== "all") {
      whereClause.status = status;
    }

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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transformer les données pour le CSV
    const csvData = payments.map((payment: PaymentWithDetails) => ({
      ID: payment.id,
      "Nom du citoyen": payment.birthDeclaration?.citizen.name || payment.birthCertificate?.citizen.name,
      "Email du citoyen": payment.birthDeclaration?.citizen.email || payment.birthCertificate?.citizen.email,
      "Type de document": payment.birthDeclaration ? "Déclaration de naissance" : "Acte de naissance",
      "Nom du document": payment.birthDeclaration
        ? `${payment.birthDeclaration.childFirstName} ${payment.birthDeclaration.childLastName}`
        : payment.birthCertificate?.fullName,
      Montant: `${payment.amount} €`,
      Statut: payment.status === "PAID" ? "Payé" : payment.status === "PENDING" ? "En attente" : "Échoué",
      "Date de création": new Date(payment.createdAt).toLocaleString(),
    }));

    const fields = [
      "ID",
      "Nom du citoyen",
      "Email du citoyen",
      "Type de document",
      "Nom du document",
      "Montant",
      "Statut",
      "Date de création",
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="paiements-${new Date()
          .toISOString()
          .split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting payments:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de l'export des paiements" },
      { status: 500 }
    );
  }
} 