import { config } from 'dotenv';
import path from 'path';
import { resetAll } from '../services/collections';

const envPath = path.resolve(process.cwd(), '.env');
config({ path: envPath });

console.log(envPath);

async function executeImport(): Promise<void> {
  console.log(`Starting data reset`);

  try {
    await resetAll(['buildings']);
    console.log('\n✅ Data reset completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Fatal error during reset process:');
    console.error(error);
    process.exit(1);
  }
}

executeImport();
