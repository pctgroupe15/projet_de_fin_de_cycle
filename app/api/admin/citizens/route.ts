import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import bcrypt from "bcryptjs";
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    if (session.user.role !== "admin") {
      return new NextResponse("Accès refusé", { status: 403 });
    }

    const db = await getDb();
    const citizens = await db.collection('Citizen')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(citizens);
  } catch (error) {
    console.error("[CITIZENS_GET]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    if (session.user.role !== "admin") {
      return new NextResponse("Accès refusé", { status: 403 });
    }

    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return new NextResponse("Email et mot de passe requis", { status: 400 });
    }

    const db = await getDb();
    const existingCitizen = await db.collection('Citizen').findOne({ email });

    if (existingCitizen) {
      return new NextResponse("Cet email est déjà utilisé", { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await db.collection('Citizen').insertOne({
      name,
      email,
      hashedPassword,
      role: "citizen",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const citizen = await db.collection('Citizen').findOne({ _id: result.insertedId });

    return NextResponse.json(citizen);
  } catch (error) {
    console.error("[CITIZENS_POST]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}