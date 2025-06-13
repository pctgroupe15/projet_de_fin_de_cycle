import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface BaseUser {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

interface Citizen extends BaseUser {
  role: string;
}

interface Agent extends BaseUser {
  firstName: string;
  lastName: string;
}

interface Admin extends BaseUser {
  name: string | null;
}

// GET - Récupérer tous les utilisateurs
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    let whereClause: any = {};

    if (role && role !== "all") {
      whereClause.role = role;
    }

    // Récupérer les citoyens
    const citizens = await prisma.citizen.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Récupérer les agents
    const agents = await prisma.agent.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Récupérer les administrateurs
    const admins = await prisma.admin.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Combiner tous les utilisateurs avec un format cohérent
    const users = [
      ...citizens.map((user: Citizen) => ({
        ...user,
        displayName: user.name || "Sans nom",
      })),
      ...agents.map((user: Agent) => ({
        ...user,
        displayName: `${user.firstName} ${user.lastName}`,
      })),
      ...admins.map((user: Admin) => ({
        ...user,
        displayName: user.name || "Sans nom",
      })),
    ];

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}

// POST - Créer un nouvel utilisateur
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.citizen.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur en fonction du rôle
    let user;
    switch (role) {
      case "citizen":
        user = await prisma.citizen.create({
          data: {
            name,
            email,
            hashedPassword,
            role: "citizen",
            status: "active",
          },
        });
        break;
      case "agent":
        const [firstName, ...lastNameParts] = name.split(" ");
        user = await prisma.agent.create({
          data: {
            firstName,
            lastName: lastNameParts.join(" "),
            email,
            hashedPassword,
            role: "agent",
            status: "active",
          },
        });
        break;
      case "admin":
        user = await prisma.admin.create({
          data: {
            name,
            email,
            hashedPassword,
            role: "admin",
            status: "active",
          },
        });
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Rôle invalide" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: "firstName" in user 
          ? `${user.firstName} ${user.lastName}`
          : user.name || "Sans nom",
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de la création de l'utilisateur" },
      { status: 500 }
    );
  }
}