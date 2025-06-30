import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const db = await getDb();
    const notifications = await db.collection('AgentNotification').find({
      agentId: new ObjectId(session.user.id)
    }).sort({ createdAt: -1 }).toArray();

    // Transformer les notifications pour inclure l'id au bon format
    const transformedNotifications = notifications.map(notification => ({
      ...notification,
      id: notification._id.toString(),
    }));

    return NextResponse.json(transformedNotifications);
  } catch (error) {
    console.error("[AGENT_NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: "ID de notification manquant" }, { status: 400 });
    }

    const db = await getDb();
    const notification = await db.collection('AgentNotification').findOneAndUpdate(
      {
        _id: new ObjectId(notificationId),
        agentId: new ObjectId(session.user.id)
      },
      {
        $set: { status: "READ" }
      },
      { returnDocument: 'after' }
    );

    if (!notification || !notification.value) {
      return NextResponse.json({ error: "Notification non trouvée" }, { status: 404 });
    }

    // Transformer la notification pour inclure l'id au bon format
    const transformedNotification = {
      ...notification.value,
      id: notification.value._id.toString(),
    };

    return NextResponse.json(transformedNotification);
  } catch (error) {
    console.error("[AGENT_NOTIFICATIONS_PATCH]", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
} 