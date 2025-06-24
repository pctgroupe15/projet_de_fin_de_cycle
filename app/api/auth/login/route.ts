import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserRole } from '@/types/user';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password || !role) {
      return new NextResponse(
        JSON.stringify({ message: 'Email, mot de passe et rôle requis' }),
        { status: 400 }
      );
    }

    let user = null;
    let collection = '';
    const db = await getDb();

    // Sélection de la collection appropriée selon le rôle
    switch (role) {
      case 'citizen':
        collection = 'Citizen';
        user = await db.collection(collection).findOne({ email });
        break;
      case 'agent':
        collection = 'Agent';
        user = await db.collection(collection).findOne({ email });
        break;
      case 'admin':
        collection = 'User';
        user = await db.collection(collection).findOne({ email });
        break;
      default:
        return new NextResponse(
          JSON.stringify({ message: 'Rôle non valide' }),
          { status: 400 }
        );
    }

    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: 'Email ou mot de passe incorrect' }),
        { status: 401 }
      );
    }

    console.log('[Login] Utilisateur trouvé:', {
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      hasHashedPassword: !!user.hashedPassword,
      passwordLength: user.password?.length,
      hashedPasswordLength: user.hashedPassword?.length
    });

    // Vérifier le mot de passe en tenant compte des deux formats possibles
    let isPasswordValid = false;
    
    // Essayer d'abord avec hashedPassword (nouveau format)
    if (user.hashedPassword) {
      console.log('[Login] Tentative avec hashedPassword');
      isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
      console.log('[Login] Résultat avec hashedPassword:', isPasswordValid);
    }
    
    // Si ça ne marche pas, essayer avec password (ancien format)
    if (!isPasswordValid && user.password) {
      console.log('[Login] Tentative avec password (ancien format)');
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('[Login] Résultat avec password:', isPasswordValid);
    }

    console.log('[Login] Résultat final de la vérification:', isPasswordValid);

    if (!isPasswordValid) {
      return new NextResponse(
        JSON.stringify({ message: 'Email ou mot de passe incorrect' }),
        { status: 401 }
      );
    }

    // Retourner les informations de l'utilisateur sans le mot de passe
    const { hashedPassword, ...userWithoutPassword } = user;

    return new NextResponse(
      JSON.stringify({
        user: userWithoutPassword,
        message: 'Connexion réussie'
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Erreur lors de la connexion' }),
      { status: 500 }
    );
  }
}
