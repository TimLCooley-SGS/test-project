/**
 * Script to run database schema
 * Usage: node database/run-schema.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSchema() {
  console.log('Connecting to database...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // Disable SSL for initial connection
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('Connected successfully!');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema...');
    await client.query(schema);
    console.log('Schema created successfully!');

    // Optionally run seed data
    const args = process.argv.slice(2);
    if (args.includes('--seed')) {
      const seedPath = path.join(__dirname, 'seed.sql');
      const seed = fs.readFileSync(seedPath, 'utf8');
      console.log('Running seed data...');
      await client.query(seed);
      console.log('Seed data inserted successfully!');
    }

    client.release();
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('ENOTFOUND')) {
      console.error('\nCould not connect to database. Check your DATABASE_URL in .env');
    }
    if (error.message.includes('password authentication failed')) {
      console.error('\nInvalid credentials. Check your username/password in DATABASE_URL');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSchema();
