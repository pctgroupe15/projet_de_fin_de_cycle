import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';

// Vérifier la configuration Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Configuration Cloudinary manquante');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const requestId = formData.get('requestId') as string;

    if (!file || !requestId) {
      return NextResponse.json(
        { success: false, message: 'Fichier et ID de demande requis' },
        { status: 400 }
      );
    }

    // Vérifier que la déclaration existe
    const declaration = await prisma.birthDeclaration.findUnique({
      where: { id: requestId }
    });

    if (!declaration) {
      return NextResponse.json(
        { success: false, message: 'Déclaration de naissance non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier le type de fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Type de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG' },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Le fichier est trop volumineux. Taille maximale : 5MB' },
        { status: 400 }
      );
    }

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload vers Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'birth-certificates',
          allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
        },
        (error, result) => {
          if (error) {
            console.error('Erreur Cloudinary:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    });

    if (!result || !(result as any).secure_url) {
      throw new Error('Échec de l\'upload vers Cloudinary');
    }

    // Créer le document dans la base de données
    const document = await prisma.document.create({
      data: {
        type: 'DOCUMENT', // Utiliser un type valide selon le schéma
        url: (result as any).secure_url,
        birthDeclarationId: requestId,
      },
    });

    return NextResponse.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Erreur détaillée lors de l\'upload:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erreur lors de l\'upload du certificat',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
} 