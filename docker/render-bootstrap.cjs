// Render Free has no pre-deploy jobs or persistent filesystem.
const { spawnSync, spawn } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Initialization failed: ${command} (exit ${result.status})`);
}

async function initialize() {
  run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema=packages/database/prisma/schema.prisma']);
  if (process.env.XDOC_LOAD_DEMO !== 'true') return;
  const db = new PrismaClient();
  try {
    // Never rerun the base seed over existing users: it resets the admin password.
    if (await db.internalUser.count() === 0) {
      if (!process.env.SEED_SUPER_ADMIN_EMAIL || !process.env.SEED_SUPER_ADMIN_PASSWORD) {
        throw new Error('Fresh demo requires SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD.');
      }
      run(process.execPath, ['packages/database/prisma/seed.mjs']);
    }
    if (await db.catalogItem.count({ where: { catalog: { code: 'DEPARTAMENTO' } } }) < 22) {
      run(process.execPath, ['packages/database/prisma/load-guatemala-geography.mjs']);
    }
    // Restores bundled catalogue images after a free instance restarts; preserves stock.
    run(process.execPath, ['packages/database/prisma/demo/seed-catalog.cjs']);
    if (await db.storeOrder.count({ where: { orderNumber: { startsWith: 'XDOC-DASH-202610' } } }) === 0) {
      run(process.execPath, ['packages/database/prisma/demo/seed-dashboard.cjs']);
    }
    const customer = await db.customer.findUniqueOrThrow({ where: { email: 'xdoc.dashboard.1@example.com' } });
    if (!customer.passwordHash && process.env.DEMO_CUSTOMER_PASSWORD) {
      await db.customer.update({ where: { id: customer.id }, data: {
        passwordHash: await argon2.hash(process.env.DEMO_CUSTOMER_PASSWORD), mustChangePassword: false,
      } });
    }
    const driver = await db.storeDriver.findUniqueOrThrow({ where: { email: 'xdoc.driver.2@example.com' } });
    if (!driver.passwordHash && process.env.DEMO_DRIVER_PASSWORD) {
      await db.storeDriver.update({ where: { id: driver.id }, data: {
        passwordHash: await argon2.hash(process.env.DEMO_DRIVER_PASSWORD), mustChangePassword: false, accessStatus: 'ACTIVO',
      } });
    }
    console.log('Render demo initialized. Existing credentials and business data preserved.');
  } finally {
    await db.$disconnect();
  }
}

initialize().then(() => {
  process.env.API_PORT = process.env.PORT || process.env.API_PORT || '10000';
  const child = spawn(process.execPath, ['apps/api/dist/main.js'], { stdio: 'inherit', env: process.env });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
  child.on('error', error => { console.error(error); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 0; });
}).catch(error => { console.error(error); process.exitCode = 1; });
