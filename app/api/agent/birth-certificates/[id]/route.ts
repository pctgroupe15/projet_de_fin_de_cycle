import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function isValidObjectId(id: string) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    if (!isValidObjectId(params.id)) {
      return NextResponse.json(
        { success: false, message: "ID invalide" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const birthCertificateArr = await db.collection('BirthCertificate').aggregate([
      { $match: { _id: new ObjectId(params.id) } },
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
    const birthCertificate = birthCertificateArr[0];

    if (!birthCertificate) {
      return NextResponse.json(
        { success: false, message: "Acte de naissance non trouvé" },
        { status: 404 }
      );
    }

    // Transformer les données pour inclure l'ID dans le bon format
    const transformedData = {
      id: birthCertificate._id.toString(),
      ...birthCertificate
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error("[BIRTH_CERTIFICATE_GET]", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne" },
      { status: 500 }
    );
  }
} 