import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "agent") {
      return new NextResponse("Non autorisé", { status: 401 });
    }

    const db = await getDb();
    const birthDeclarations = await db.collection('BirthDeclaration').aggregate([
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
          foreignField: 'birthDeclarationId',
          as: 'documents'
        }
      },
      { $lookup: {
          from: 'Payment',
          localField: '_id',
          foreignField: 'birthDeclarationId',
          as: 'paymentArr'
        }
      },
      { $addFields: {
          payment: { $arrayElemAt: ['$paymentArr', 0] }
        }
      },
      { $project: { citizenArr: 0, paymentArr: 0 } }
    ]).toArray();

    // Enrichir chaque déclaration avec citizen.name
    const declarationsWithCitizenName = birthDeclarations.map(decl => ({
      ...decl,
      citizen: decl.citizen ? {
        ...decl.citizen,
        name: (decl.citizen.prenom && decl.citizen.nom)
          ? `${decl.citizen.prenom} ${decl.citizen.nom}`
          : decl.citizen.name || 'N/A',
      } : { name: 'N/A', email: decl.citizen?.email || '' }
    }));

    return NextResponse.json({
      success: true,
      data: declarationsWithCitizenName
    });
  } catch (error) {
    console.error("[BIRTH_DECLARATIONS_GET]", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}