import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  req: Request,
  { params }: { params: { citizenId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    if (session.user.role !== "admin") {
      return new NextResponse("Accès refusé", { status: 403 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return new NextResponse("Le statut est requis", { status: 400 });
    }

    const db = await getDb();
    const updatedCitizen = await db.collection('Citizen').findOneAndUpdate(
      { _id: new ObjectId(params.citizenId) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updatedCitizen || !updatedCitizen.value) {
      return new NextResponse("Citoyen non trouvé", { status: 404 });
    }

    return NextResponse.json(updatedCitizen.value);
  } catch (error) {
    console.error("[CITIZEN_STATUS_PATCH]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}