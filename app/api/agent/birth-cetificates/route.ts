import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const db = await getDb();
    const birthCertificates = await db.collection('BirthCertificate').aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: {
          from: 'Citizen',
          localField: 'citizenId',
          foreignField: '_id',
          as: 'citizenArr'
        }
      },
      { $addFields: {
          citizen: { $arrayElemAt: ['$citizenArr', 0] }
        }
      },
    ]).toArray();

    return NextResponse.json(birthCertificates);
  } catch (error) {
    console.error("[BIRTH_CERTIFICATES_GET]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const body = await request.json();
    const { documentId, status } = body;

    if (!documentId || !status) {
      return new NextResponse("Données manquantes", { status: 400 });
    }

    const db = await getDb();
    // Récupérer le certificat de naissance avec les informations du citoyen
    const birthCertificate = await db.collection('BirthCertificate').findOne({ _id: new ObjectId(documentId) });
    if (!birthCertificate) {
      return new NextResponse("Certificat non trouvé", { status: 404 });
    }

    // Mettre à jour le statut du certificat
    const updatedCertificate = await db.collection('BirthCertificate').findOneAndUpdate(
      { _id: new ObjectId(documentId) },
      {
        $set: {
          status: status === "approuvé" ? "COMPLETED" : 
                  status === "rejeté" ? "REJECTED" : "IN_PROGRESS",
          agentId: session.user.id,
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedCertificate || !updatedCertificate.value) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du certificat" },
        { status: 500 }
      );
    }

    // Créer une notification pour le citoyen
    const statusLabel = status === "approuvé" ? "validée" : status === "rejeté" ? "rejetée" : "en attente";
    await db.collection('Notification').insertOne({
      citizenId: birthCertificate.citizenId,
      title: "Mise à jour de votre demande d'acte de naissance",
      message: `Votre demande d'acte de naissance (${birthCertificate.trackingNumber}) a été ${statusLabel}.`,
      type: "BIRTH_CERTIFICATE",
      referenceId: documentId,
      createdAt: new Date(),
    });

    return NextResponse.json(updatedCertificate.value);
  } catch (error) {
    console.error("[BIRTH_CERTIFICATES_PUT]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID de la demande manquant' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, comment } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: 'Statut manquant' },
        { status: 400 }
      );
    }

    const db = await getDb();
    // Vérifier si l'admin a déjà validé la demande
    const existingCertificate = await db.collection('BirthCertificate').findOne({ _id: new ObjectId(id) });
    if (!existingCertificate) {
      return NextResponse.json(
        { success: false, message: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Si l'admin a déjà validé ou rejeté la demande, empêcher la modification
    if (["COMPLETED", "REJECTED"].includes(existingCertificate.status)) {
      return NextResponse.json(
        { success: false, message: 'Cette demande a déjà été traitée par l\'administrateur' },
        { status: 403 }
      );
    }

    // Convertir le statut au format correct
    const normalizedStatus = status === "approuvé" ? "approuvé" :
                             status === "rejeté" ? "rejeté" :
                             status === "en_attente" ? "en_attente" : status;

    const updatedCertificate = await db.collection('BirthCertificate').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: normalizedStatus,
          comment: comment,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedCertificate || !updatedCertificate.value) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du certificat" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: updatedCertificate.value
    });

  } catch (error) {
    console.error('Error updating birth certificate request:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
}