import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
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
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthCertificateId',
          as: 'files'
        }
      },
      { $project: { citizenArr: 0 } }
    ]).toArray();

    // Transformer les données pour inclure l'ID dans le bon format
    const transformedData = birthCertificates.map(doc => ({
      id: doc._id.toString(),
      ...doc
    }));

    return NextResponse.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATES_GET]", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID de l'acte de naissance requis" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { status, comment } = data;

    if (!status || !['PENDING', 'COMPLETED', 'REJECTED', 'IN_PROGRESS'].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Statut invalide" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const birthCertificate = await db.collection('BirthCertificate').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          comment: comment || null,
          agentId: session.user.id,
        }
      },
      { returnDocument: 'after' }
    );

    if (!birthCertificate || !birthCertificate.value) {
      return NextResponse.json(
        { success: false, message: "Acte de naissance non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: birthCertificate.value
    });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATE_PATCH]", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne" },
      { status: 500 }
    );
  }
} 