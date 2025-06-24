import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      );
    }

    const db = await getDb();
    // Récupérer tous les actes de naissance du citoyen
    const birthCertificates = await db.collection('BirthCertificate').aggregate([
      { $match: { citizenId: new ObjectId(session.user.id) } },
      { $sort: { createdAt: -1 } },
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthCertificateId',
          as: 'files'
        }
      }
    ]).toArray();

    // Récupérer toutes les déclarations de naissance du citoyen
    const birthDeclarations = await db.collection('BirthDeclaration').aggregate([
      { $match: { citizenId: new ObjectId(session.user.id) } },
      { $sort: { createdAt: -1 } },
      { $lookup: {
          from: 'Document',
          localField: '_id',
          foreignField: 'birthDeclarationId',
          as: 'documents'
        }
      }
    ]).toArray();

    // Combiner et formater les documents
    const documents = [
      ...birthCertificates.map(cert => ({
        id: cert._id.toString(),
        documentType: 'birth_certificate',
        fullName: cert.fullName,
        birthDate: cert.birthDate,
        birthPlace: cert.birthPlace,
        fatherFullName: cert.fatherFullName,
        motherFullName: cert.motherFullName,
        status: cert.status,
        trackingNumber: cert.trackingNumber,
        createdAt: cert.createdAt,
        updatedAt: cert.updatedAt,
        files: cert.files
      })),
      ...birthDeclarations.map(decl => ({
        id: decl._id.toString(),
        documentType: 'birth_declaration',
        fullName: `${decl.childFirstName} ${decl.childLastName}`,
        birthDate: decl.birthDate,
        birthPlace: decl.birthPlace,
        fatherFullName: `${decl.fatherFirstName} ${decl.fatherLastName}`,
        motherFullName: `${decl.motherFirstName} ${decl.motherLastName}`,
        status: decl.status,
        trackingNumber: decl._id.toString(),
        createdAt: decl.createdAt,
        updatedAt: decl.updatedAt,
        files: decl.documents.map((doc: any) => ({
          type: doc.type,
          url: doc.url
        }))
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}