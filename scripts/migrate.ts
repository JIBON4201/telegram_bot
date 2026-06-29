import { db } from '../src/db/index.ts';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const argUrl = process.argv[2];
    if (argUrl) {
      process.env.DATABASE_URL = argUrl;
      console.log('📝 Using DB URL from command line argument');
    }
    console.log('🚀 Starting full manual migration script...');
    
    // Create Enums
    const enums = [
      { name: 'task_type', values: ['tg_channel', 'tg_group', 'website', 'twitter', 'youtube', 'discord', 'facebook', 'custom'] },
      { name: 'withdraw_status', values: ['pending', 'processing', 'completed', 'rejected'] },
      { name: 'deposit_status', values: ['pending', 'approved'] },
      { name: 'tx_type', values: ['referral', 'task', 'bonus', 'withdraw', 'deposit', 'swap'] },
      { name: 'admin_role', values: ['owner', 'admin', 'moderator'] }
    ];

    for (const en of enums) {
      const check = await db.execute(sql`SELECT 1 FROM pg_type WHERE typname = ${en.name}`);
      if (check.rows.length === 0) {
        console.log(`📦 Creating enum ${en.name}...`);
        const valuesStr = en.values.map(v => `'${v}'`).join(', ');
        await db.execute(sql.raw(`CREATE TYPE ${en.name} AS ENUM (${valuesStr})`));
      }
    }

    console.log('📦 Ensuring all tables exist...');
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        tg_id BIGINT UNIQUE NOT NULL,
        username TEXT,
        full_name TEXT,
        join_date TIMESTAMP DEFAULT NOW() NOT NULL,
        referrer_id INTEGER,
        referral_count INTEGER DEFAULT 0 NOT NULL,
        balance_reward DOUBLE PRECISION DEFAULT 0 NOT NULL,
        balance_withdrawable DOUBLE PRECISION DEFAULT 0 NOT NULL,
        balance_referral DOUBLE PRECISION DEFAULT 0 NOT NULL,
        balance_task DOUBLE PRECISION DEFAULT 0 NOT NULL,
        balance_bonus DOUBLE PRECISION DEFAULT 0 NOT NULL,
        last_claim_date TIMESTAMP,
        is_banned BOOLEAN DEFAULT FALSE NOT NULL,
        web_uid TEXT UNIQUE,
        channel_verified BOOLEAN DEFAULT FALSE NOT NULL,
        referral_rewarded BOOLEAN DEFAULT FALSE NOT NULL,
        last_verify_time TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        reward DOUBLE PRECISION NOT NULL,
        required BOOLEAN DEFAULT FALSE NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        button_url TEXT,
        type task_type NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER REFERENCES users(id) NOT NULL,
        referred_id INTEGER REFERENCES users(id) NOT NULL,
        rewarded BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS user_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        task_id INTEGER REFERENCES tasks(id) NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        CONSTRAINT user_task_unq_idx UNIQUE (user_id, task_id)
      )`,
      `CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
        network TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        wallet_id INTEGER REFERENCES wallets(id) NOT NULL,
        network TEXT NOT NULL,
        status withdraw_status DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        status deposit_status DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        type tx_type NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        goal_type TEXT NOT NULL,
        goal_value INTEGER NOT NULL,
        reward DOUBLE PRECISION NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        achievement_id INTEGER REFERENCES achievements(id) NOT NULL,
        rewarded_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS bonus_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        tg_id BIGINT UNIQUE,
        username TEXT,
        web_uid TEXT UNIQUE,
        role admin_role DEFAULT 'admin' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id) NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS channels (
        id SERIAL PRIMARY KEY,
        channel_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`
    ];

    for (const query of tables) {
      const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`📦 Checking table ${tableName}...`);
      await db.execute(sql.raw(query));
    }

    console.log('📦 Ensuring default admin exists...');
    const adminEmail = 'mdj285647@gmail.com';
    const adminUid = 'epRyfxITgYQ2iRLo6dpBdSdkDj03';
    
    await db.execute(sql`
      INSERT INTO admins (username, web_uid, role)
      VALUES (${adminEmail}, ${adminUid}, 'owner')
      ON CONFLICT (web_uid) DO NOTHING
    `);

    console.log('✅ Manual migration completed successfully.');
  } catch (e: any) {
    console.error('❌ Manual migration failed:', e.message);
  } finally {
    process.exit();
  }
}

run();
