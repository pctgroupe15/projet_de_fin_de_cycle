import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';

// GET - Récupérer toutes les communes
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour accéder à cette ressource' },
        { status: 401 }
      );
    }

    const db = await getDb();
    // Vérifier si l'utilisateur est un admin
    const user = await db.collection('User').findOne({ email: session.user.email, role: 'admin' });
    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être administrateur pour accéder à cette ressource' },
        { status: 403 }
      );
    }

    // Récupérer toutes les communes
    const communes = await db.collection('Commune')
      .find({})
      .sort({ name: 1 }) // Trier par nom alphabétiquement
      .toArray();

    return NextResponse.json(communes);
  } catch (error) {
    console.error('Erreur lors de la récupération des communes:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la récupération des communes' },
      { status: 500 }
    );
  }
} 