import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function isValidObjectId(id: string) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }
    const { id } = params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'ID invalide' }, { status: 400 });
    }
    const db = await getDb();
    const body = await request.json();
    const update = { ...body };
    delete update._id;
    
    // Essayer de mettre à jour dans chaque collection
    let result;
    
    // Essayer d'abord la collection User (administrateurs)
    result = await db.collection('User').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    if (result.matchedCount > 0) {
      return NextResponse.json({ success: true, message: 'Administrateur mis à jour avec succès' });
    }
    
    // Essayer ensuite la collection Agent
    result = await db.collection('Agent').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    if (result.matchedCount > 0) {
      return NextResponse.json({ success: true, message: 'Agent mis à jour avec succès' });
    }
    
    // Essayer enfin la collection Citizen
    result = await db.collection('Citizen').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    if (result.matchedCount > 0) {
      return NextResponse.json({ success: true, message: 'Citoyen mis à jour avec succès' });
    }
    
    // Si aucune mise à jour n'a eu lieu, l'utilisateur n'existe pas
    return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
  } catch (error) {
    console.error('[USER_UPDATE]', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }
    const { id } = params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'ID invalide' }, { status: 400 });
    }
    const db = await getDb();
    
    // Essayer de supprimer de chaque collection
    let result;
    
    // Essayer d'abord la collection User (administrateurs)
    result = await db.collection('User').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount > 0) {
      return NextResponse.json({ success: true, message: 'Administrateur supprimé avec succès' });
    }
    
    // Essayer ensuite la collection Agent
    result = await db.collection('Agent').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount > 0) {
      return NextResponse.json({ success: true, message: 'Agent supprimé avec succès' });
    }
    
    // Essayer enfin la collection Citizen
    result = await db.collection('Citizen').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount > 0) {
      return NextResponse.json({ success: true, message: 'Citoyen supprimé avec succès' });
    }
    
    // Si aucune suppression n'a eu lieu, l'utilisateur n'existe pas
    return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
  } catch (error) {
    console.error('[USER_DELETE]', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
