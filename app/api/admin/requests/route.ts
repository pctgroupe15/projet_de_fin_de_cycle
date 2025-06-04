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
    const type = searchParams.get("type");

    // Construire les conditions de filtrage
    const whereClause: any = {};
    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Récupérer les déclarations de naissance
    const declarations = await prisma.birthDeclaration.findMany({
      where: whereClause,
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
        documents: {
          select: {
            id: true,
            type: true,
            url: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Récupérer les actes de naissance
    const certificates = await prisma.birthCertificate.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        createdAt: true,
        fullName: true,
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
        files: {
          select: {
            id: true,
            type: true,
            url: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Combiner et formater les résultats
    const requests = [
      ...declarations.map(declaration => ({
        id: declaration.id,
        documentType: "Déclaration de naissance",
        status: declaration.status,
        createdAt: declaration.createdAt,
        name: `${declaration.childFirstName} ${declaration.childLastName}`,
        citizen: {
          name: declaration.citizen.name,
          email: declaration.citizen.email,
        },
        documents: declaration.documents.map(doc => ({
          id: doc.id,
          name: doc.type,
          url: doc.url,
        })),
      })),
      ...certificates.map(certificate => ({
        id: certificate.id,
        documentType: "Acte de naissance",
        status: certificate.status,
        createdAt: certificate.createdAt,
        name: certificate.fullName,
        citizen: {
          name: certificate.citizen.name,
          email: certificate.citizen.email,
        },
        documents: certificate.files.map(doc => ({
          id: doc.id,
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