import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Validation de l'ID
    if (!params.id || params.id === 'undefined') {
      return NextResponse.json(
        { success: false, message: 'ID de document invalide' },
        { status: 400 }
      );
    }

    // Validation du format ObjectId
    if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Format d\'ID invalide' },
        { status: 400 }
      );
    }

    const db = await getDb();
    // Essayer d'abord de trouver un acte de naissance
    const birthCertificate = await db.collection('BirthCertificate').aggregate([
      { $match: { _id: new ObjectId(params.id), citizenId: new ObjectId(session.user.id) } },
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthCertificateId',
          as: 'files'
        }
      },
      { $lookup: {
          from: 'Payment',
          localField: '_id',
          foreignField: 'birthCertificateId',
          as: 'paymentArr'
        }
      },
      { $addFields: {
          payment: { $arrayElemAt: ['$paymentArr', 0] }
        }
      }
    ]).next();

    if (birthCertificate) {
      const response = {
        id: birthCertificate._id,
        documentType: 'birth_certificate',
        fullName: birthCertificate.fullName,
        birthDate: birthCertificate.birthDate,
        birthPlace: birthCertificate.birthPlace,
        fatherFullName: birthCertificate.fatherFullName || undefined,
        motherFullName: birthCertificate.motherFullName || undefined,
        status: birthCertificate.status,
        trackingNumber: birthCertificate.trackingNumber,
        rejectReason: birthCertificate.rejectReason,
        comment: birthCertificate.comment,
        createdAt: birthCertificate.createdAt,
        updatedAt: birthCertificate.updatedAt,
        files: (birthCertificate.files || []).map((file: any) => ({
          id: file._id,
          type: file.type,
          url: file.url,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt
        })),
        payment: birthCertificate.payment ? {
          id: birthCertificate.payment._id,
          status: birthCertificate.payment.status,
          amount: birthCertificate.payment.amount
        } : null
      };

      return NextResponse.json({
        success: true,
        data: response
      });
    }

    // Si ce n'est pas un acte de naissance, chercher une déclaration de naissance
    const birthDeclaration = await db.collection('BirthDeclaration').aggregate([
      { $match: { _id: new ObjectId(params.id), citizenId: new ObjectId(session.user.id) } },
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
      }
    ]).next();

    if (birthDeclaration) {
      const response = {
        id: birthDeclaration._id,
        documentType: 'birth_declaration',
        fullName: `${birthDeclaration.childFirstName} ${birthDeclaration.childLastName}`,
        birthDate: birthDeclaration.birthDate,
        birthPlace: birthDeclaration.birthPlace,
        fatherFullName: `${birthDeclaration.fatherFirstName} ${birthDeclaration.fatherLastName}`,
        motherFullName: `${birthDeclaration.motherFirstName} ${birthDeclaration.motherLastName}`,
        status: birthDeclaration.status,
        trackingNumber: birthDeclaration._id,
        rejectReason: birthDeclaration.rejectReason,
        createdAt: birthDeclaration.createdAt,
        updatedAt: birthDeclaration.updatedAt,
        files: (birthDeclaration.documents || []).map((doc: any) => ({
          id: doc._id,
          type: doc.type,
          url: doc.url,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        })),
        payment: birthDeclaration.payment ? {
          id: birthDeclaration.payment._id,
          status: birthDeclaration.payment.status,
          amount: birthDeclaration.payment.amount
        } : null
      };

      return NextResponse.json({
        success: true,
        data: response
      });
    }

    return NextResponse.json(
      { success: false, message: 'Document non trouvé' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching document details:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des détails du document' },
      { status: 500 }
    );
  }
}