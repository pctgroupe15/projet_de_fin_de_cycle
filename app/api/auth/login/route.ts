import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UserRole } from '@/types/user';

const prisma = new PrismaClient();

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

    // Sélection de la collection appropriée selon le rôle
    switch (role) {
      case 'citizen':
        collection = 'citizens';
        user = await prisma.citizen.findUnique({
          where: { email }
        });
        break;
      case 'agent':
        collection = 'agents';
        user = await prisma.agent.findUnique({
          where: { email }
        });
        break;
      case 'admin':
        collection = 'users';
        user = await prisma.user.findUnique({
          where: { email }
        });
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

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

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
