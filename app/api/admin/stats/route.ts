import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();

    // Obtenir le nombre total d'agents
    const totalAgents = await db.collection('Agent').countDocuments();

    // Obtenir le nombre d'agents actifs
    const activeAgents = await db.collection('Agent').countDocuments({ status: 'active' });

    // Obtenir le nombre d'agents inactifs
    const inactiveAgents = await db.collection('Agent').countDocuments({ status: 'inactive' });

    // Obtenir les agents récemment ajoutés (derniers 30 jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newAgents = await db.collection('Agent').countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    return NextResponse.json({
      totalAgents,
      activeAgents,
      inactiveAgents,
      newAgents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}