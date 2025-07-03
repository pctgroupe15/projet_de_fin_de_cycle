import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

    const db = await getDb();
    // Récupérer les citoyens
    const citizens = await db.collection('Citizen').find(whereClause).project({
      name: 1, prenom: 1, nom: 1, email: 1, role: 1, status: 1, createdAt: 1, dateInscription: 1
    }).toArray();

    // Récupérer les agents
    const agents = await db.collection('Agent').find(whereClause).project({
      firstName: 1, lastName: 1, email: 1, role: 1, status: 1, createdAt: 1
    }).toArray();

    // Récupérer les administrateurs
    const admins = await db.collection('User').find(whereClause).project({
      name: 1, email: 1, role: 1, status: 1, createdAt: 1
    }).toArray();

    // Combiner tous les utilisateurs avec un format cohérent
    const users = [
      ...citizens.map((user: any) => ({
        ...user,
        id: user._id,
        displayName: (user.prenom && user.nom && user.prenom.trim().length > 0 && user.nom.trim().length > 0)
  ? `${user.prenom.trim()} ${user.nom.trim()}`
  : user.name || "Sans nom",
        createdAt: user.createdAt || user.dateInscription || null,
      })),
      ...agents.map((user: any) => ({
        ...user,
        id: user._id,
        displayName: `${user.firstName} ${user.lastName}`,
        createdAt: user.createdAt || null,
      })),
      ...admins.map((user: any) => ({
        ...user,
        id: user._id,
        displayName: user.name || "Sans nom",
        createdAt: user.createdAt || null,
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
    const { name, email, password, role, commune } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // Validation spécifique pour les agents
    if (role === "agent" && !commune) {
      return NextResponse.json(
        { success: false, message: "La commune est requise pour un agent" },
        { status: 400 }
      );
    }

    const db = await getDb();
    // Vérifier si l'email existe déjà (dans Citizen, Agent ou User)
    const existingUser = await db.collection('Citizen').findOne({ email })
      || await db.collection('Agent').findOne({ email })
      || await db.collection('User').findOne({ email });

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
        user = await db.collection('Citizen').insertOne({
          name,
          email,
          hashedPassword,
          role: "citizen",
          status: "active",
          createdAt: new Date(),
        });
        user = await db.collection('Citizen').findOne({ _id: user.insertedId });
        break;
      case "agent":
        const [firstName, ...lastNameParts] = name.split(" ");
        
        // Trouver l'ID de la commune si elle est fournie
        let communeId = undefined;
        if (commune) {
          const communeDoc = await db.collection('Commune').findOne({ name: commune });
          if (communeDoc) {
            communeId = communeDoc._id;
          }
        }
        
        user = await db.collection('Agent').insertOne({
          firstName,
          lastName: lastNameParts.join(" "),
          email,
          hashedPassword,
          role: "agent",
          commune: commune || '',
          communeId,
          status: "active",
          createdAt: new Date(),
        });
        user = await db.collection('Agent').findOne({ _id: user.insertedId });
        break;
      case "admin":
        user = await db.collection('User').insertOne({
          name,
          email,
          hashedPassword,
          role: "admin",
          status: "active",
          createdAt: new Date(),
        });
        user = await db.collection('User').findOne({ _id: user.insertedId });
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Rôle invalide" },
          { status: 400 }
        );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Erreur lors de la création de l'utilisateur (user null)" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
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