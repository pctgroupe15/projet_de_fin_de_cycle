import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const birthCertificate = await prisma.birthCertificate.findUnique({
      where: {
        id: params.id,
      },
      include: {
        citizen: {
          select: {
            name: true,
            email: true,
          },
        },
        files: true,
      },
    });

    if (!birthCertificate) {
      return NextResponse.json(
        { success: false, message: "Acte de naissance non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: birthCertificate
    });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATE_GET]", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne" },
      { status: 500 }
    );
  }
} 