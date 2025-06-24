import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return new NextResponse("Statut manquant", { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection('User').findOneAndUpdate(
      { _id: new ObjectId(params.userId) },
      { $set: { status } },
      { returnDocument: 'after' }
    );

    if (!user.value) {
      return new NextResponse("Utilisateur non trouvé", { status: 404 });
    }

    return NextResponse.json({
      id: user.value._id,
      name: user.value.name,
      email: user.value.email,
      role: user.value.role,
      status: user.value.status,
      createdAt: user.value.createdAt,
    });
  } catch (error) {
    console.error("Erreur lors de la modification du statut:", error);
    return new NextResponse("Erreur interne du serveur", { status: 500 });
  }
}