import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { v2 as cloudinary } from 'cloudinary';
import { ObjectId } from 'mongodb';

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
    const uploadResponse = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "birth-certificates",
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

    const db = await getDb();
    // Créer le document dans la base de données
    const documentInsert = await db.collection('Document').insertOne({
      type: 'ACTE_NAISSANCE_FINAL',
      url: uploadResponse.secure_url,
      birthCertificateId: new ObjectId(params.id),
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

    // Mettre à jour le statut de la certificat de naissance
    await db.collection('BirthCertificate').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { status: 'COMPLETED' } }
    );

    // Récupérer les informations du certificat pour la notification
    const birthCertificate = await db.collection('BirthCertificate').findOne({ _id: new ObjectId(params.id) });

    // Créer une notification pour le citoyen
    if (birthCertificate) {
      await db.collection('Notification').insertOne({
        citizenId: birthCertificate.citizenId,
        title: "Votre acte de naissance est prêt",
        message: `Votre demande d'acte de naissance (${birthCertificate.trackingNumber}) a été traitée et le document final est maintenant disponible. Vous pouvez le télécharger depuis votre espace personnel.`,
        type: "BIRTH_CERTIFICATE",
        referenceId: new ObjectId(params.id),
        status: "UNREAD",
        createdAt: new Date(),
      });
    }

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