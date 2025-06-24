import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const admin = await db.collection('User').findOne(
      { email: session.user.email, role: 'admin' },
      { projection: { password: 0 } }
    );

    if (!admin) {
      return NextResponse.json(
        { error: 'Administrateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { name, email, currentPassword, newPassword } = await request.json();
    const db = await getDb();

    // Vérifier si l'administrateur existe
    const admin = await db.collection('User').findOne({ email: session.user.email, role: 'admin' });
    if (!admin) {
      return NextResponse.json(
        { error: 'Administrateur non trouvé' },
        { status: 404 }
      );
    }

    // Si un nouveau mot de passe est fourni, vérifier l'ancien
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Le mot de passe actuel est requis' },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Mot de passe actuel incorrect' },
          { status: 400 }
        );
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.collection('User').updateOne(
        { email: session.user.email, role: 'admin' },
        { $set: { password: hashedPassword } }
      );
    }

    // Mettre à jour les autres informations
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email && email !== session.user.email) {
      // Vérifier si l'email est déjà utilisé
      const existingUser = await db.collection('User').findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }
      updateData.email = email;
    }

    if (Object.keys(updateData).length > 0) {
      await db.collection('User').updateOne(
        { email: session.user.email, role: 'admin' },
        { $set: updateData }
      );
    }

    // Récupérer les données mises à jour
    const updatedAdmin = await db.collection('User').findOne(
      { email: email || session.user.email, role: 'admin' },
      { projection: { password: 0 } }
    );

    return NextResponse.json(updatedAdmin);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}