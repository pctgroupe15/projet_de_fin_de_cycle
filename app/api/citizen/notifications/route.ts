import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "citizen") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const db = await getDb();
    const notifications = await db.collection('Notification').find({
      citizenId: new ObjectId(session.user.id)
    }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "citizen") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return new NextResponse("ID de notification manquant", { status: 400 });
    }

    const db = await getDb();
    const notification = await db.collection('Notification').findOneAndUpdate(
      {
        _id: new ObjectId(notificationId),
        citizenId: new ObjectId(session.user.id)
      },
      {
        $set: { status: "READ" }
      },
      { returnDocument: 'after' }
    );

    if (!notification.value) {
      return new NextResponse("Notification non trouvée", { status: 404 });
    }
    return NextResponse.json(notification.value);
  } catch (error) {
    console.error("[NOTIFICATIONS_PATCH]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}