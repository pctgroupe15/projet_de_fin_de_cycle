import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { UserRole } from "@/types/user";

export async function PATCH(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const db = await getDb();
    // Vérifier si l'utilisateur est un admin
    const admin = await db.collection('User').findOne({
        email: session.user.email,
        role: UserRole.ADMIN,
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const { status, rejectReason } = await request.json();
    const { documentId } = params;

    // Vérifier d'abord dans les déclarations de naissance
    const birthDeclaration = await db.collection('BirthDeclaration').findOne({ _id: new ObjectId(documentId) });

    if (birthDeclaration) {
      // Mettre à jour le statut de la déclaration de naissance
      const updatedDeclaration = await db.collection('BirthDeclaration').findOneAndUpdate(
        { _id: new ObjectId(documentId) },
        { $set: { status } },
        { returnDocument: 'after' }
      );
      if (!updatedDeclaration || !updatedDeclaration.value) {
        return NextResponse.json(
          { error: "Erreur lors de la mise à jour de la déclaration de naissance" },
          { status: 500 }
        );
      }

      // Créer une notification pour le citoyen
      const statusLabel = status === 'COMPLETED' ? 'approuvée' : status === 'REJECTED' ? 'rejetée' : 'mise à jour';
      const notificationMessage = status === 'COMPLETED' 
        ? `Votre déclaration de naissance pour ${birthDeclaration.childFirstName} ${birthDeclaration.childLastName} a été approuvée.`
        : status === 'REJECTED'
        ? `Votre déclaration de naissance pour ${birthDeclaration.childFirstName} ${birthDeclaration.childLastName} a été rejetée. ${rejectReason ? `Raison : ${rejectReason}` : ''}`
        : `Votre déclaration de naissance pour ${birthDeclaration.childFirstName} ${birthDeclaration.childLastName} a été mise à jour.`;

      await db.collection('Notification').insertOne({
        citizenId: birthDeclaration.citizenId,
        title: "Mise à jour de votre déclaration de naissance",
        message: notificationMessage,
        type: "BIRTH_DECLARATION",
        referenceId: new ObjectId(documentId),
        status: "UNREAD",
        createdAt: new Date(),
      });

      const citizen = await db.collection('Citizen').findOne({ _id: birthDeclaration.citizenId });
      return NextResponse.json({
        id: updatedDeclaration.value._id,
        type: "BirthDeclaration",
        status: updatedDeclaration.value.status,
        createdAt: updatedDeclaration.value.createdAt,
        updatedAt: updatedDeclaration.value.updatedAt,
        citizenId: updatedDeclaration.value.citizenId,
        citizenName: citizen?.name || ''
      });
    }

    // Vérifier dans les actes de naissance
    const birthCertificate = await db.collection('BirthCertificate').findOne({ _id: new ObjectId(documentId) });

    if (birthCertificate) {
      // Mettre à jour le statut de l'acte de naissance
      const updatedCertificate = await db.collection('BirthCertificate').findOneAndUpdate(
        { _id: new ObjectId(documentId) },
        { $set: { status, comment: status === "rejeté" ? rejectReason : null } },
        { returnDocument: 'after' }
      );
      if (!updatedCertificate || !updatedCertificate.value) {
        return NextResponse.json(
          { error: "Erreur lors de la mise à jour de l'acte de naissance" },
          { status: 500 }
        );
      }

      // Créer une notification pour le citoyen
      const statusLabel = status === 'COMPLETED' ? 'approuvée' : status === 'REJECTED' ? 'rejetée' : 'mise à jour';
      const notificationMessage = status === 'COMPLETED' 
        ? `Votre demande d'acte de naissance (${birthCertificate.trackingNumber}) a été approuvée. Votre document est prêt.`
        : status === 'REJECTED'
        ? `Votre demande d'acte de naissance (${birthCertificate.trackingNumber}) a été rejetée. ${rejectReason ? `Raison : ${rejectReason}` : ''}`
        : `Votre demande d'acte de naissance (${birthCertificate.trackingNumber}) a été mise à jour.`;

      await db.collection('Notification').insertOne({
        citizenId: birthCertificate.citizenId,
        title: "Mise à jour de votre demande d'acte de naissance",
        message: notificationMessage,
        type: "BIRTH_CERTIFICATE",
        referenceId: new ObjectId(documentId),
        status: "UNREAD",
        createdAt: new Date(),
      });

      const citizen = await db.collection('Citizen').findOne({ _id: birthCertificate.citizenId });
      return NextResponse.json({
        id: updatedCertificate.value._id,
        type: "BirthCertificate",
        status: updatedCertificate.value.status,
        createdAt: updatedCertificate.value.createdAt,
        updatedAt: updatedCertificate.value.updatedAt,
        citizenId: updatedCertificate.value.citizenId,
        citizenName: citizen?.name || '',
        comment: updatedCertificate.value.comment
      });
    }

    return NextResponse.json(
      { error: "Document non trouvé" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du statut" },
      { status: 500 }
    );
  }
}