const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function migratePasswords() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mairie_db';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connecté à MongoDB');

    const db = client.db();
    
    // Migrer les agents
    console.log('Migration des agents...');
    const agents = await db.collection('Agent').find({ password: { $exists: true } }).toArray();
    
    for (const agent of agents) {
      if (agent.password && !agent.hashedPassword) {
        console.log(`Migration de l'agent: ${agent.email}`);
        
        // Copier le mot de passe hashé existant
        await db.collection('Agent').updateOne(
          { _id: agent._id },
          { 
            $set: { hashedPassword: agent.password },
            $unset: { password: "" }
          }
        );
        console.log(`Agent ${agent.email} migré avec succès`);
      }
    }

    // Migrer les citoyens
    console.log('Migration des citoyens...');
    const citizens = await db.collection('Citizen').find({ password: { $exists: true } }).toArray();
    
    for (const citizen of citizens) {
      if (citizen.password && !citizen.hashedPassword) {
        console.log(`Migration du citoyen: ${citizen.email}`);
        
        // Copier le mot de passe hashé existant
        await db.collection('Citizen').updateOne(
          { _id: citizen._id },
          { 
            $set: { hashedPassword: citizen.password },
            $unset: { password: "" }
          }
        );
        console.log(`Citoyen ${citizen.email} migré avec succès`);
      }
    }

    // Migrer les administrateurs
    console.log('Migration des administrateurs...');
    const admins = await db.collection('User').find({ password: { $exists: true } }).toArray();
    
    for (const admin of admins) {
      if (admin.password && !admin.hashedPassword) {
        console.log(`Migration de l'administrateur: ${admin.email}`);
        
        // Copier le mot de passe hashé existant
        await db.collection('User').updateOne(
          { _id: admin._id },
          { 
            $set: { hashedPassword: admin.password },
            $unset: { password: "" }
          }
        );
        console.log(`Administrateur ${admin.email} migré avec succès`);
      }
    }

    console.log('Migration terminée avec succès !');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    await client.close();
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  migratePasswords();
}

module.exports = { migratePasswords }; 