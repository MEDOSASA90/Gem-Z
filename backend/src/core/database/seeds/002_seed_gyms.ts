/**
 * Seed 002 — Gyms with Branches
 *
 * Creates 3 gyms with 2-3 branches each, plus subscription plans.
 */

import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
    // Clean up
    await knex('gym_pricing_rules').del();
    await knex('gym_subscription_plans').del();
    await knex('gym_branches').del();
    await knex('gyms').del();

    // Get the gym admin user
    const gymAdmin = await knex('users').where('email', 'gym@test.com').first();
    if (!gymAdmin) {
        console.warn('⚠️  gym@test.com not found. Run seed 001 first.');
        return;
    }

    // ─── Gym 1: Cairo Fitness Hub ────────────────────────────────

    const [gym1] = await knex('gyms')
        .insert({
            id: knex.raw('uuid_generate_v4()'),
            owner_user_id: gymAdmin.id,
            name: 'Cairo Fitness Hub',
            logo_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200',
            cover_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200',
            description: 'Premium fitness center in the heart of Cairo offering state-of-the-art equipment, group classes, and personal training.',
            status: 'active',
            platform_fee_pct: 15.00,
            rating: 4.7,
            total_reviews: 156,
        })
        .returning('id');

    // Branches for Gym 1
    const [branch1_1, branch1_2] = await knex('gym_branches')
        .insert([
            {
                id: knex.raw('uuid_generate_v4()'),
                gym_id: gym1.id,
                name: 'Nasr City Main Branch',
                address: '123 Makram Ebeid St, Nasr City, Cairo',
                city: 'Cairo',
                latitude: 30.0561,
                longitude: 31.3304,
                phone: '+20224012345',
                capacity: 200,
                opens_at: '06:00',
                closes_at: '23:00',
                amenities: JSON.stringify(['pool', 'sauna', 'parking', 'wifi', 'lockers']),
                is_active: true,
            },
            {
                id: knex.raw('uuid_generate_v4()'),
                gym_id: gym1.id,
                name: 'Maadi Branch',
                address: '45 Road 9, Maadi, Cairo',
                city: 'Cairo',
                latitude: 29.9602,
                longitude: 31.2569,
                phone: '+20225167890',
                capacity: 150,
                opens_at: '05:30',
                closes_at: '23:30',
                amenities: JSON.stringify(['crossfit_zone', 'yoga_studio', 'cafe', 'parking']),
                is_active: true,
            },
        ])
        .returning('id');

    // Pricing rules for Gym 1
    await knex('gym_pricing_rules').insert([
        {
            id: knex.raw('uuid_generate_v4()'),
            branch_id: branch1_1.id,
            name: 'Morning Flash Sale',
            discount_pct: 30.00,
            valid_days: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
            start_time: '06:00',
            end_time: '10:00',
            is_active: true,
        },
        {
            id: knex.raw('uuid_generate_v4()'),
            branch_id: branch1_2.id,
            name: 'Weekend Special',
            discount_pct: 20.00,
            valid_days: JSON.stringify([5, 6]),
            start_time: '06:00',
            end_time: '12:00',
            is_active: true,
        },
    ]);

    // Subscription plans for Gym 1
    await knex('gym_subscription_plans').insert([
        {
            id: knex.raw('uuid_generate_v4()'),
            gym_id: gym1.id,
            branch_id: branch1_1.id,
            name: 'Monthly Unlimited',
            duration_days: 30,
            base_price_egp: 1200.00,
            features: JSON.stringify(['Full gym access', 'Group classes', 'Locker room', 'Free WiFi']),
            max_freezes: 2,
            is_active: true,
        },
        {
            id: knex.raw('uuid_generate_v4()'),
            gym_id: gym1.id,
            branch_id: null, // All branches
            name: 'Quarterly Premium',
            duration_days: 90,
            base_price_egp: 3000.00,
            features: JSON.stringify(['Full gym access', 'All branches', '4 PT sessions', 'Sauna & Pool', 'Nutrition plan']),
            max_freezes: 5,
            is_active: true,
        },
    ]);

    console.log('✅ Created Cairo Fitness Hub with 2 branches, 2 pricing rules, and 2 plans');

    // ─── Gym 2: Alexandria Strength Academy ──────────────────────

    const [gym2] = await knex('gyms')
        .insert({
            id: knex.raw('uuid_generate_v4()'),
            owner_user_id: gymAdmin.id,
            name: 'Alexandria Strength Academy',
            logo_url: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=200',
            cover_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1200',
            description: 'Specialized strength and conditioning gym in Alexandria. Focus on powerlifting, CrossFit, and athletic performance.',
            status: 'active',
            platform_fee_pct: 12.50,
            rating: 4.9,
            total_reviews: 89,
        })
        .returning('id');

    const [branch2_1] = await knex('gym_branches')
        .insert([
            {
                id: knex.raw('uuid_generate_v4()'),
                gym_id: gym2.id,
                name: 'Sidi Gaber Branch',
                address: '78 El-Horreya Road, Sidi Gaber, Alexandria',
                city: 'Alexandria',
                latitude: 31.2240,
                longitude: 29.9430,
                phone: '+2035467890',
                capacity: 120,
                opens_at: '05:00',
                closes_at: '00:00',
                amenities: JSON.stringify(['powerlifting_platforms', 'strongman_equipment', 'recovery_room', 'protein_bar']),
                is_active: true,
            },
        ])
        .returning('id');

    await knex('gym_subscription_plans').insert([
        {
            id: knex.raw('uuid_generate_v4()'),
            gym_id: gym2.id,
            name: 'Strength Builder',
            duration_days: 30,
            base_price_egp: 800.00,
            features: JSON.stringify(['Strength equipment access', 'Powerlifting platform booking', 'Open gym']),
            max_freezes: 1,
            is_active: true,
        },
        {
            id: knex.raw('uuid_generate_v4()'),
            gym_id: gym2.id,
            name: 'Athlete Pro',
            duration_days: 90,
            base_price_egp: 2100.00,
            features: JSON.stringify(['All equipment', 'Monthly assessment', 'Programming', 'Recovery suite', 'Competition prep']),
            max_freezes: 3,
            is_active: true,
        },
    ]);

    console.log('✅ Created Alexandria Strength Academy with 1 branch and 2 plans');

    // ─── Gym 3: Giza Yoga & Wellness Center ──────────────────────

    const [gym3] = await knex('gyms')
        .insert({
            id: knex.raw('uuid_generate_v4()'),
            owner_user_id: gymAdmin.id,
            name: 'Giza Yoga & Wellness Center',
            logo_url: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=200',
            cover_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200',
            description: 'Holistic wellness center offering yoga, Pilates, meditation, and spa services. A sanctuary for mind and body.',
            status: 'active',
            platform_fee_pct: 18.00,
            rating: 4.8,
            total_reviews: 203,
        })
        .returning('id');

    const [branch3_1, branch3_2, branch3_3] = await knex('gym_branches')
        .insert([
            {
                id: knex.raw('uuid_generate_v4()'),
                gym_id: gym3.id,
                name: 'Dokki Main Studio',
                address: '15 Mossadak St, Dokki, Giza',
                city: 'Giza',
                latitude: 30.0395,
                longitude: 31.2110,
                phone: '+20233345678',
                capacity: 80,
                opens_at: '06:00',
                closes_at: '21:00',
                amenities: JSON.stringify(['yoga_studio', 'meditation_room', 'spa', 'tea_lounge']),
                is_active: true,
            },
            {
                id: knex.raw('uuid_generate_v4()'),
                gym_id: gym3.id,
                name: 'Sheikh Zayed Branch',
                address: 'Building 42, District 11, Sheikh Zayed',
                city: 'Giza',
                latitude: 30.0499,
                longitude: 30.9763,
                phone: '+20238567901',
                capacity: 100,
                opens_at: '05:30',
                closes_at: '22:00',
                amenities: JSON.stringify(['hot_yoga', 'Pilates_reformers', 'swimming_pool', 'jacuzzi', 'parking']),
                is_active: true,
            },
            {
                id: knex.raw('uuid_generate_v4()'),
                gym_id: gym3.id,
                name: '6th of October Pop-Up',
                address: 'Mall of Arabia, 6th of October, Giza',
                city: 'Giza',
                latitude: 29.9765,
                longitude: 30.9482,
                phone: '+20238512345',
                capacity: 50,
                opens_at: '08:00',
                closes_at: '22:00',
                amenities: JSON.stringify(['yoga', 'meditation', 'retail_shop']),
                is_active: true,
            },
        ])
        .returning('id');

    await knex('gym_subscription_plans').insert([
        {
            id: knex.raw('uuid_generate_v4()'),
            gym_id: gym3.id,
            branch_id: branch3_1.id,
            name: 'Yoga Beginner',
            duration_days: 30,
            base_price_egp: 600.00,
            features: JSON.stringify(['8 yoga classes/month', 'Meditation sessions', 'Mat provided']),
            max_freezes: 2,
            is_active: true,
        },
        {
            id: knex.raw('uuid_generate_v4()'),
            gym_id: gym3.id,
            name: 'Wellness Unlimited',
            duration_days: 90,
            base_price_egp: 4500.00,
            features: JSON.stringify(['Unlimited classes', 'All locations', 'Spa access', 'Private sessions', 'Retreat discounts']),
            max_freezes: 7,
            is_active: true,
        },
    ]);

    console.log('✅ Created Giza Yoga & Wellness Center with 3 branches and 2 plans');

    console.log('\n🎉 Seed 002 complete — 3 gyms with 6 branches and 6 plans created');
}
