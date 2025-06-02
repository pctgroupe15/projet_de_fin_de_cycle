import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { RequestStatus } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const birthCertificates = await prisma.birthCertificate.findMany({
      include: {
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
        files: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: birthCertificates
    });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATES_GET]", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID de l'acte de naissance requis" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { status, comment } = data;

    if (!status || !Object.values(RequestStatus).includes(status as RequestStatus)) {
      return NextResponse.json(
        { success: false, message: "Statut invalide" },
        { status: 400 }
      );
    }

    const birthCertificate = await prisma.birthCertificate.update({
      where: {
        id,
      },
      data: {
        status: status as RequestStatus,
        comment: comment || null,
        agentId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: birthCertificate
    });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATE_PATCH]", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne" },
      { status: 500 }
    );
  }
} 