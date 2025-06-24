import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from "mongodb";
import bcrypt from 'bcryptjs';

// PUT - Modifier un agent
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const { email, firstName, lastName, role, commune, status, password } = body;

    // Validation des champs requis
    if (!email || !firstName || !lastName || !commune) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis (email, prénom, nom, commune)' },
        { status: 400 }
      );
    }

    // Vérifier si l'agent existe
    const existingAgent = await db.collection('Agent').findOne({ _id: new ObjectId(params.id) });
    if (!existingAgent) {
      return NextResponse.json(
        { error: 'Agent non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si l'email existe déjà pour un autre agent
    if (email !== existingAgent.email) {
      const agentWithEmail = await db.collection('Agent').findOne({ email, _id: { $ne: new ObjectId(params.id) } });
      if (agentWithEmail) {
        return NextResponse.json(
          { error: 'Un agent avec cet email existe déjà' },
          { status: 400 }
        );
      }
    }

    // Trouver l'ID de la commune si elle est fournie
    let communeId = undefined;
    if (commune) {
      const communeDoc = await db.collection('Commune').findOne({ name: commune });
      if (communeDoc) {
        communeId = communeDoc._id;
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      email,
      firstName,
      lastName,
      role,
      commune: commune || '',
      communeId,
      status,
      updatedAt: new Date()
    };

    // Ajouter le mot de passe seulement s'il est fourni
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Mettre à jour l'agent
    const result = await db.collection('Agent').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Agent non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer l'agent mis à jour
    const updatedAgent = await db.collection('Agent').findOne(
      { _id: new ObjectId(params.id) },
      { projection: { password: 0 } }
    );

    if (!updatedAgent) {
      return NextResponse.json(
        { error: 'Agent non trouvé' },
        { status: 404 }
      );
    }

    // Formater l'agent pour correspondre à l'interface
    const formattedAgent = {
      id: updatedAgent._id.toString(),
      firstName: updatedAgent.firstName || updatedAgent.prenom || '',
      lastName: updatedAgent.lastName || updatedAgent.nom || '',
      email: updatedAgent.email,
      role: updatedAgent.role,
      commune: updatedAgent.commune || '',
      status: updatedAgent.status || 'active'
    };

    return NextResponse.json(formattedAgent);
  } catch (error) {
    console.error('Erreur lors de la modification de l\'agent:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'agent' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un agent
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const result = await db.collection('Agent').deleteOne({ _id: new ObjectId(params.id) });

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