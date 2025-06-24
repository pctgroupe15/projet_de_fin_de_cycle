const { MongoClient } = require('mongodb');

const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/mairie_db';
const communes = [
  'Abobo',
  'Adjamé',
  'Anyama',
  'Attécoubé',
  'Bingerville',
  'Cocody',
  'Koumassi',
  'Marcory',
  'Plateau',
  'Port-Bouët',
  'Treichville',
  'Songon',
  'Yopougon'
];

async function insertCommunes() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('Commune');
    const docs = communes.map(name => ({ name }));
    await collection.deleteMany({}); // Nettoie avant insertion
    const result = await collection.insertMany(docs);
    console.log(`${result.insertedCount} communes insérées.`);
  } catch (err) {
    console.error('Erreur lors de l\'insertion des communes:', err);
  } finally {
    await client.close();
  }
}

insertCommunes(); 