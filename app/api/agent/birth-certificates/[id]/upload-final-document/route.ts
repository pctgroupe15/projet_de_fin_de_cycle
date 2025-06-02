import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Téléverser sur Cloudinary
    const uploadResponse = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "birth-certificates",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as UploadApiResponse);
        }
      ).end(buffer);
    });

    if (!uploadResponse.secure_url) {
      throw new Error('Erreur lors du téléversement sur Cloudinary');
    }

    // Créer le document dans la base de données
    const document = await prisma.document.create({
      data: {
        type: 'ACTE_NAISSANCE_FINAL',
        url: uploadResponse.secure_url,
        birthCertificate: {
          connect: {
            id: params.id,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATE_UPLOAD]", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors du téléversement du document" },
      { status: 500 }
    );
  }
} 