/**
 * Seed 001 — Test Users
 *
 * Creates 5 test users with different roles.
 * Password: 'TestPass123!' (hashed with bcrypt)
 * Emails: trainee@test.com, trainer@test.com, gym@test.com, store@test.com, admin@test.com
 */

import { Knex } from 'knex';
import bcrypt from 'bcrypt';

const TEST_PASSWORD = 'TestPass123!';

export async function seed(knex: Knex): Promise<void> {
    // Deletes ALL existing entries
    await knex('trainer_profiles').del();
    await knex('trainee_profiles').del();
    await knex('users').del();

    // Hash password once
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

    // Create users
    const users = [
        {
            id: knex.raw('uuid_generate_v4()'),
            email: 'trainee@test.com',
            phone: '+20100000001',
            password_hash: passwordHash,
            role: 'trainee',
            status: 'active',
            full_name: 'Test Trainee',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=trainee',
            gender: 'male',
            date_of_birth: '1998-06-15',
            country: 'Egypt',
            city: 'Cairo',
            fitness_level: 'intermediate',
            email_verified_at: knex.raw('NOW()'),
        },
        {
            id: knex.raw('uuid_generate_v4()'),
            email: 'trainer@test.com',
            phone: '+20100000002',
            password_hash: passwordHash,
            role: 'trainer',
            status: 'active',
            full_name: 'Test Trainer',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=trainer',
            gender: 'male',
            date_of_birth: '1990-03-20',
            country: 'Egypt',
            city: 'Cairo',
            email_verified_at: knex.raw('NOW()'),
        },
        {
            id: knex.raw('uuid_generate_v4()'),
            email: 'gym@test.com',
            phone: '+20100000003',
            password_hash: passwordHash,
            role: 'gym_admin',
            status: 'active',
            full_name: 'Test Gym Admin',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gym',
            gender: 'male',
            date_of_birth: '1985-01-10',
            country: 'Egypt',
            city: 'Giza',
            email_verified_at: knex.raw('NOW()'),
        },
        {
            id: knex.raw('uuid_generate_v4()'),
            email: 'store@test.com',
            phone: '+20100000004',
            password_hash: passwordHash,
            role: 'store_admin',
            status: 'active',
            full_name: 'Test Store Admin',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=store',
            gender: 'female',
            date_of_birth: '1992-08-25',
            country: 'Egypt',
            city: 'Alexandria',
            email_verified_at: knex.raw('NOW()'),
        },
        {
            id: knex.raw('uuid_generate_v4()'),
            email: 'admin@test.com',
            phone: '+20100000005',
            password_hash: passwordHash,
            role: 'super_admin',
            status: 'active',
            full_name: 'Super Admin',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            gender: 'male',
            date_of_birth: '1988-12-01',
            country: 'Egypt',
            city: 'Cairo',
            email_verified_at: knex.raw('NOW()'),
        },
    ];

    // Insert users and collect their IDs
    const insertedIds: string[] = [];
    for (const user of users) {
        const [{ id }] = await knex('users')
            .insert(user)
            .returning('id');
        insertedIds.push(id);
        console.log(`✅ Created ${user.role} => Email: ${user.email} | Pass: ${TEST_PASSWORD}`);
    }

    // Create trainee profile
    await knex('trainee_profiles').insert({
        user_id: insertedIds[0],
        height_cm: 175.5,
        weight_kg: 78.0,
        body_fat_pct: 18.5,
        fitness_goal: 'muscle_gain',
        activity_level: 'moderately_active',
        streak_days: 5,
        total_points: 1200,
        gems_coins: 350,
    });
    console.log('✅ Created trainee profile');

    // Create trainer profile
    await knex('trainer_profiles').insert({
        user_id: insertedIds[1],
        bio: 'Certified personal trainer with 8+ years of experience in strength training and nutrition coaching.',
        specializations: JSON.stringify(['powerlifting', 'nutrition', 'bodybuilding']),
        certifications: JSON.stringify(['NSCA-CPT', 'Precision Nutrition L1']),
        years_experience: 8,
        hourly_rate_egp: 500.00,
        rating: 4.85,
        total_reviews: 42,
        is_verified: true,
        commission_pct: 80.00,
    });
    console.log('✅ Created trainer profile');

    console.log('\n🎉 Seed 001 complete — 5 users created successfully');
}
