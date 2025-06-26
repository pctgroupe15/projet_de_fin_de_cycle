import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'agent') {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }
    const db = await getDb();
    // Vérifier si la déclaration existe
    const declaration = await db.collection('BirthDeclaration').findOne({ _id: new ObjectId(params.id) });
    if (!declaration) {
      return NextResponse.json({ success: false, message: 'Déclaration non trouvée' }, { status: 404 });
    }
    if (declaration.status !== 'PENDING') {
      return NextResponse.json({ success: false, message: 'Cette déclaration a déjà été traitée' }, { status: 400 });
    }
    // Rejeter la déclaration
    const updatedDeclaration = await db.collection('BirthDeclaration').findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: { status: 'REJECTED', agentId: session.user.id, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!updatedDeclaration || !updatedDeclaration.value) {
      return NextResponse.json({ success: false, message: 'Erreur lors du rejet de la déclaration' }, { status: 500 });
    }
    // (Optionnel) Créer une notification pour le citoyen
    // await db.collection('Notification').insertOne({ ... });
    return NextResponse.json({ success: true, data: updatedDeclaration.value });
  } catch (error) {
    console.error('Erreur lors du rejet de la déclaration:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
} 