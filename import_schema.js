// Import PocketBase schema from JSON file
const fs = require('fs');
const { execSync } = require('child_process');

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123456';
const SCHEMA_FILE = './pb_schema_latest.json';

async function importSchema() {
  try {
    // Read schema
    const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
    console.log(`Found ${schema.length} collections to import`);
    
    // Use curl to import via PocketBase API
    // First, try to login as admin
    console.log('Please manually import the schema via PocketBase Admin UI:');
    console.log(`1. Open: ${PB_URL}/_/`);
    console.log('2. Login as admin (create one if needed)');
    console.log(`3. Go to Settings > Import Collections`);
    console.log(`4. Upload: ${SCHEMA_FILE}`);
    console.log('');
    console.log('Or use pb_schema.json from the project folder');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

importSchema();
