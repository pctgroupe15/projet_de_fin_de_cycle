import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET - Récupérer toutes les communes (API publique)
export async function GET() {
  try {
    const db = await getDb();

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