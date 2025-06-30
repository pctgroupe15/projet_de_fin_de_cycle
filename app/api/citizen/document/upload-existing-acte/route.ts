import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

// Configuration Cloudinary
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

    const db = await getDb();
    
    // Vérifier que la demande d'acte de naissance existe
    const birthCertificate = await db.collection('BirthCertificate').findOne({ 
      _id: new ObjectId(requestId),
      citizenId: new ObjectId(session.user.id)
    });

    if (!birthCertificate) {
      return NextResponse.json(
        { success: false, message: 'Demande d\'acte de naissance non trouvée' },
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
    const uploadResponse = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "existing-actes",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    if (!uploadResponse.secure_url) {
      throw new Error('Erreur lors du téléversement sur Cloudinary');
    }

    // Créer le document dans la base de données
    const documentInsert = await db.collection('Document').insertOne({
      type: 'EXISTING_ACTE',
      url: uploadResponse.secure_url,
      birthCertificateId: new ObjectId(requestId),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const document = await db.collection('Document').findOne({ _id: documentInsert.insertedId });

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Erreur lors de la création du document.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ancien acte téléversé avec succès.',
      data: document,
    });
  } catch (error) {
    console.error('Error uploading existing acte:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors du téléversement de l\'ancien acte.' },
      { status: 500 }
    );
  }
} 