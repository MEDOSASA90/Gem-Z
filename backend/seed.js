const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
    try {
        const passwordHash = await bcrypt.hash('123456', 10);
        const users = [
            { name: 'Trainee Test', email: 'trainee@gemz.io', role: 'trainee' },
            { name: 'Trainer Test', email: 'trainer@gemz.io', role: 'trainer' },
            { name: 'Gym Test', email: 'gym@gemz.io', role: 'gym_admin' },
            { name: 'Store Test', email: 'store@gemz.io', role: 'store_admin' }
        ];

        console.log('Seeding test accounts...');
        for (const u of users) {
            try {
                const res = await pool.query(
                    `INSERT INTO users (full_name, email, password_hash, role) 
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [u.name, u.email, passwordHash, u.role]
                );
                console.log(`✅ Created ${u.role} => Email: ${u.email} | Pass: 123456`);
            } catch (err) {
                if(err.code === '23505') {
                    console.log(`⚠️  User ${u.email} already exists.`);
                } else {
                    console.error(`❌ Error creating ${u.email}:`, err.message);
                }
            }
        }
    } catch(err) {
        console.error('Fatal Error:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
seed();
