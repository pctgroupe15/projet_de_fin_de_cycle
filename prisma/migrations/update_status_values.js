const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateStatusValues() {
  const client = new MongoClient(process.env.DATABASE_URL);
  
  try {
    await client.connect();
    console.log('Connecté à MongoDB');

    const db = client.db();
    
    // Mise à jour des actes de naissance
    const birthCertificatesResult = await db.collection('BirthCertificate').updateMany(
      { status: 'en_attente' },
      { $set: { status: 'PENDING' } }
    );
    console.log(`Actes de naissance 'en_attente' mis à jour: ${birthCertificatesResult.modifiedCount}`);

    const birthCertificatesResult2 = await db.collection('BirthCertificate').updateMany(
      { status: 'approuvé' },
      { $set: { status: 'COMPLETED' } }
    );
    console.log(`Actes de naissance 'approuvé' mis à jour: ${birthCertificatesResult2.modifiedCount}`);

    const birthCertificatesResult3 = await db.collection('BirthCertificate').updateMany(
      { status: 'rejeté' },
      { $set: { status: 'REJECTED' } }
    );
    console.log(`Actes de naissance 'rejeté' mis à jour: ${birthCertificatesResult3.modifiedCount}`);

    // Mise à jour des déclarations de naissance
    const birthDeclarationsResult = await db.collection('BirthDeclaration').updateMany(
      { status: 'en_attente' },
      { $set: { status: 'PENDING' } }
    );
    console.log(`Déclarations de naissance 'en_attente' mises à jour: ${birthDeclarationsResult.modifiedCount}`);

    const birthDeclarationsResult2 = await db.collection('BirthDeclaration').updateMany(
      { status: 'approuvé' },
      { $set: { status: 'COMPLETED' } }
    );
    console.log(`Déclarations de naissance 'approuvé' mises à jour: ${birthDeclarationsResult2.modifiedCount}`);

    const birthDeclarationsResult3 = await db.collection('BirthDeclaration').updateMany(
      { status: 'rejeté' },
      { $set: { status: 'REJECTED' } }
    );
    console.log(`Déclarations de naissance 'rejeté' mises à jour: ${birthDeclarationsResult3.modifiedCount}`);

    console.log('Mise à jour des statuts terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des statuts:', error);
  } finally {
    await client.close();
    console.log('Déconnecté de MongoDB');
  }
}

updateStatusValues(); 