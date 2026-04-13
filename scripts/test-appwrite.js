#!/usr/bin/env node

/**
 * Appwrite Database Test & Setup Script
 * 
 * This script:
 * 1. Tests the Appwrite connection
 * 2. Checks if collection exists and has correct schema
 * 3. Creates a test document
 * 4. Lists all documents
 * 5. Cleans up test data
 * 
 * Usage: 
 *   APPWRITE_API_KEY=xxx node scripts/test-appwrite.js
 */

const { Client, Databases, ID, Query } = require('node-appwrite');

// Configuration
const CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '69e123f4001bccfc61ef',
  apiKey: process.env.APPWRITE_API_KEY || '',
  databaseId: '69e12a90002821b7a144',
  collectionId: 'user_stats',
};

// Initialize client
const client = new Client()
  .setEndpoint(CONFIG.endpoint)
  .setProject(CONFIG.projectId)
  .setKey(CONFIG.apiKey);

const databases = new Databases(client);

async function testAppwrite() {
  console.log('🔍 Testing Appwrite Connection...\n');
  console.log('Configuration:');
  console.log(`  Endpoint: ${CONFIG.endpoint}`);
  console.log(`  Project ID: ${CONFIG.projectId}`);
  console.log(`  API Key: ${CONFIG.apiKey.substring(0, 20)}...`);
  console.log(`  Database ID: ${CONFIG.databaseId}`);
  console.log(`  Collection ID: ${CONFIG.collectionId}\n`);

  try {
    // Step 1: Test database access
    console.log('📊 Step 1: Testing database access...');
    const database = await databases.get(CONFIG.databaseId);
    console.log(`✅ Database found: ${database.name}`);

    // Step 2: Test collection access
    console.log('\n📦 Step 2: Testing collection access...');
    const collection = await databases.getCollection(CONFIG.databaseId, CONFIG.collectionId);
    console.log(`✅ Collection found: ${collection.name}`);
    console.log(`   Total documents: ${collection.total || 0}`);

    // Step 3: List collection attributes
    console.log('\n📋 Step 3: Checking collection schema...');
    const attributes = collection.attributes || [];
    console.log(`   Attributes found: ${attributes.length}`);
    attributes.forEach(attr => {
      console.log(`   - ${attr.key} (${attr.type}, ${attr.required ? 'required' : 'optional'})`);
    });

    // Check required attributes
    const requiredAttrs = ['githubHandle', 'statsJson', 'heatmapJson', 'lastSync'];
    const optionalAttrs = ['claimedBadges'];  // Optional attributes the app uses
    
    const missingRequired = requiredAttrs.filter(
      req => !attributes.find(attr => attr.key === req)
    );
    
    const missingOptional = optionalAttrs.filter(
      opt => !attributes.find(attr => attr.key === opt)
    );
    
    if (missingRequired.length > 0) {
      console.log(`\n❌ Missing REQUIRED attributes: ${missingRequired.join(', ')}`);
      console.log('   You MUST create these attributes in Appwrite Console');
      return { success: false };
    } else {
      console.log('✅ All required attributes present');
    }
    
    if (missingOptional.length > 0) {
      console.log(`⚠️  Missing optional attributes: ${missingOptional.join(', ')}`);
      console.log('   App will work but some features may not persist correctly');
    }

    // Step 4: List existing documents
    console.log('\n📄 Step 4: Listing existing documents...');
    const documents = await databases.listDocuments(
      CONFIG.databaseId,
      CONFIG.collectionId,
      [Query.limit(10)]
    );
    console.log(`   Found ${documents.total} document(s)`);
    if (documents.documents.length > 0) {
      documents.documents.forEach(doc => {
        console.log(`   - ID: ${doc.$id}, Handle: ${doc.githubHandle || 'N/A'}`);  // Fixed: was 'handle'
      });
    } else {
      console.log('   No documents found (empty collection)');
    }

    // Step 5: Create a test document
    console.log('\n✍️  Step 5: Creating test document...');
    const testDocId = 'test-' + Date.now();
    const testDoc = await databases.createDocument(
      CONFIG.databaseId,
      CONFIG.collectionId,
      testDocId,
      {
        githubHandle: 'test-user-' + Date.now(),  // Fixed: was 'handle'
        statsJson: JSON.stringify({
          level: 1,
          totalXP: 100,
          currentStreak: 0,
          test: true
        }),
        heatmapJson: JSON.stringify({}),
        lastSync: Date.now(),
        // claimedBadges removed - attribute doesn't exist in Appwrite yet
      }
    );
    console.log(`✅ Test document created: ${testDoc.$id}`);

    // Step 6: Read the test document
    console.log('\n📖 Step 6: Reading test document...');
    const readDoc = await databases.getDocument(
      CONFIG.databaseId,
      CONFIG.collectionId,
      testDocId
    );
    console.log(`✅ Test document read: ${readDoc.githubHandle}`);

    // Step 7: Update the test document
    console.log('\n🔄 Step 7: Updating test document...');
    const updatedDoc = await databases.updateDocument(
      CONFIG.databaseId,
      CONFIG.collectionId,
      testDocId,
      {
        statsJson: JSON.stringify({
          level: 2,
          totalXP: 250,
          currentStreak: 1,
          test: true,
          updated: true
        })
      }
    );
    console.log(`✅ Test document updated`);

    // Step 8: Delete the test document
    console.log('\n🗑️  Step 8: Cleaning up test document...');
    await databases.deleteDocument(
      CONFIG.databaseId,
      CONFIG.collectionId,
      testDocId
    );
    console.log(`✅ Test document deleted`);

    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(50));
    console.log('\nAppwrite is correctly configured and working!');
    console.log(`\n📊 Current database status:`);
    console.log(`   - Database: ${database.name}`);
    console.log(`   - Collection: ${collection.name}`);
    console.log(`   - Documents: ${documents.total}`);
    console.log(`   - Attributes: ${attributes.length}`);

    return { success: true };

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    
    if (error.code === 401) {
      console.error('\n💡 Fix: Your API key is invalid or missing permissions.');
      console.error('   Check APPWRITE_API_KEY in .env file');
    } else if (error.code === 404) {
      console.error('\n💡 Fix: Database or collection not found.');
      console.error('   Verify DATABASE_ID and COLLECTION_ID are correct');
    } else if (error.code === 400) {
      console.error('\n💡 Fix: Missing required attributes or schema mismatch.');
      console.error('   Check collection schema in Appwrite Console');
    }
    
    return { success: false, error: error.message };
  }
}

// Run the test
testAppwrite()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
