import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from "mongodb"
import bcrypt from 'bcryptjs';

// GET - Récupérer tous les agents
export async function GET(request: Request) {
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

    // Récupérer tous les agents
    const agents = await db.collection('Agent')
      .find()
      .project({ hashedPassword: 0 }) // Exclure le mot de passe
      .toArray();

    // Formater les agents pour correspondre à l'interface
    const formattedAgents = agents.map((agent: any) => ({
      id: agent._id.toString(),
      firstName: agent.firstName || agent.prenom || '',
      lastName: agent.lastName || agent.nom || '',
      email: agent.email,
      role: agent.role,
      commune: agent.commune || '',
      status: agent.status || 'active'
    }));

    // GET communes
    if (request.method === 'GET' && request.url?.includes('/communes')) {
      const communes = await db.collection('Commune').find({}).toArray();
      return NextResponse.json(communes);
    }

    return NextResponse.json(formattedAgents);
  } catch (error) {
    console.error('Erreur détaillée lors de la récupération des agents:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la récupération des agents' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouvel agent
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const db = await getDb();
    // Vérifier si l'utilisateur est un admin
    const admin = await db.collection('User').findOne({ email: session.user.email, role: 'admin' });
    if (!admin) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, firstName, lastName, role, commune, status } = body;

    // Validation des champs requis
    if (!email || !firstName || !lastName || !commune) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis (email, prénom, nom, commune)' },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingAgent = await db.collection('Agent').findOne({ email });
    if (existingAgent) {
      return NextResponse.json(
        { error: 'Un agent avec cet email existe déjà' },
        { status: 400 }
      );
    }

    // Trouver l'ID de la commune si elle est fournie
    let communeId = undefined;
    if (commune) {
      const communeDoc = await db.collection('Commune').findOne({ name: commune });
      if (communeDoc) {
        communeId = communeDoc._id;
      }
    }

    // Générer un mot de passe par défaut si non fourni
    const defaultPassword = password || 'password123';
    
    // Validation du mot de passe
    if (!defaultPassword || defaultPassword.trim() === '') {
      return NextResponse.json(
        { error: 'Un mot de passe valide est requis' },
        { status: 400 }
      );
    }
    
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    console.log('[Create Agent] Informations de création:', {
      email,
      passwordProvided: !!password,
      defaultPassword,
      hashedPasswordLength: hashedPassword.length,
      firstName,
      lastName,
      commune
    });

    // Créer le nouvel agent
    const newAgent = {
      email,
      hashedPassword,
      firstName,
      lastName,
      role: role || 'agent', // Par défaut, le rôle est 'agent'
      commune: commune || '',
      communeId,
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('Agent').insertOne(newAgent);

    // Récupérer l'agent créé sans le mot de passe
    const createdAgent = await db.collection('Agent').findOne(
      { _id: result.insertedId },
      { projection: { hashedPassword: 0 } }
    );

    if (!createdAgent) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'agent' },
        { status: 500 }
      );
    }

    // Formater l'agent pour correspondre à l'interface
    const formattedAgent = {
      id: createdAgent._id.toString(),
      firstName: createdAgent.firstName || createdAgent.prenom || '',
      lastName: createdAgent.lastName || createdAgent.nom || '',
      email: createdAgent.email,
      role: createdAgent.role,
      commune: createdAgent.commune || '',
      status: createdAgent.status || 'active'
    };

    return NextResponse.json(formattedAgent, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'agent:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'agent' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un agent
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const db = await getDb();
    // Vérifier si l'utilisateur est un admin
    const admin = await db.collection('User').findOne({ email: session.user.email, role: 'admin' });
    if (!admin) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const agentId = url.searchParams.get('id');

    if (!agentId) {
      return NextResponse.json(
        { error: 'ID de l\'agent requis' },
        { status: 400 }
      );
    }

    const result = await db.collection('Agent').deleteOne({ _id: new ObjectId(agentId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Agent non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Agent supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'agent:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'agent' },
      { status: 500 }
    );
  }
}

// Nouvelle route API pour la liste des communes
export async function communesGET() {
  const db = await getDb();
  const communes = await db.collection('Commune').find({}).toArray();
  return NextResponse.json(communes);
}