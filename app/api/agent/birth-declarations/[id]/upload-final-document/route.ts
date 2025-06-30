import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const maxDuration = 60; // seconds
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'agent') {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }
    if (!params.id || !/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return NextResponse.json({ success: false, message: 'ID de déclaration invalide' }, { status: 400 });
    }
    const db = await getDb();
    const declaration = await db.collection('BirthDeclaration').findOne({ _id: new ObjectId(params.id) });
    if (!declaration) {
      return NextResponse.json({ success: false, message: 'Déclaration non trouvée' }, { status: 404 });
    }
    // Lire le fichier du form-data
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, message: 'Aucun fichier fourni' }, { status: 400 });
    }
    // Upload sur Cloudinary (ou autre)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadResult = await uploadToCloudinary(buffer, { filename: file.name });
    if (!uploadResult?.secure_url) {
      return NextResponse.json({ success: false, message: 'Erreur lors de l\'upload du fichier' }, { status: 500 });
    }
    // Créer le document en base
    const doc = {
      type: 'ACTE_NAISSANCE_FINAL',
      url: uploadResult.secure_url,
      birthDeclarationId: new ObjectId(params.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection('Document').insertOne(doc);

    // Créer une notification pour le citoyen
    await db.collection('Notification').insertOne({
      citizenId: declaration.citizenId,
      title: "Votre acte de naissance est prêt",
      message: `L'acte de naissance pour ${declaration.childFirstName} ${declaration.childLastName} a été téléversé et est maintenant disponible. Vous pouvez le télécharger depuis votre espace personnel.`,
      type: "BIRTH_DECLARATION",
      referenceId: new ObjectId(params.id),
      status: "UNREAD",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, url: uploadResult.secure_url });
  } catch (error) {
    console.error('[UPLOAD_FINAL_DOCUMENT_DECLARATION]', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
} 