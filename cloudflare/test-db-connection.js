// Test database connection for Cloudflare Workers
import { MongoClient } from 'mongodb';

async function testConnection() {
  const uri = "mongodb+srv://founder_db_user:hlpfl@cluster0.gannhym.mongodb.net/?retryWrites=true&w=majority";
  
  console.log('Testing MongoDB connection...');
  
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      tlsAllowInvalidCertificates: true,
      tls: true
    });
    
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const db = client.db('test');
    const result = await db.admin().ping();
    console.log('✅ Ping successful:', result);
    
    await client.close();
    console.log('✅ Connection closed properly');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();