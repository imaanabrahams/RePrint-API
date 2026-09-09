import 'dotenv/config';
import { seed } from './seed.js';
import { seedStaff } from './seed-staff.js';

// Single entry point for provisioning the database on deploy (Railway preDeploy).
// seed() is idempotent, so it is safe to run on every deploy.
const bootstrap = async () => {
  await seed();
  await seedStaff();
  console.log('Bootstrap complete');
};

bootstrap()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Bootstrap failed:', err.message || err);
    process.exit(1);
  });