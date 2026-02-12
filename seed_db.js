// Script to seed initial data into PocketBase
import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('http://127.0.0.1:8090');

async function seed() {
  console.log('🐻 Starting Database Seeding...');
  
  try {
    // 1. Authenticate (Need to create admin first manually)
    // For simplicity, we assume the user has imported the schema and wants to add data.
    // If they run this script, they should provide admin credentials or we use a guest-allowed rule.
    
    const projects = JSON.parse(fs.readFileSync('./seed_projects.json', 'utf8'));
    const vendors = JSON.parse(fs.readFileSync('./seed_vendors.json', 'utf8'));

    console.log('📦 Seeding Projects...');
    for (const p of projects) {
      try {
        await pb.collection('projects').create(p);
        console.log(`✅ Project created: ${p.name}`);
      } catch (e) {
        console.log(`⚠️ Project skip (might exist): ${p.name}`);
      }
    }

    console.log('📦 Seeding Vendors...');
    for (const v of vendors) {
      try {
        await pb.collection('vendors').create(v);
        console.log(`✅ Vendor created: ${v.name}`);
      } catch (e) {
        console.log(`⚠️ Vendor skip (might exist): ${v.name}`);
      }
    }

    console.log('🎉 Seeding Completed!');
  } catch (err) {
    console.error('❌ Seeding failed. Make sure PocketBase is running and schema is imported.');
    console.error(err);
  }
}

seed();
