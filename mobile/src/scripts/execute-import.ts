import { config } from 'dotenv';
import path from 'path';
import { importAllData, ImportData } from '../services/buildingService';

const envPath = path.resolve(process.cwd(), '.env');
config({ path: envPath });

console.log(envPath);

async function executeImport(): Promise<void> {
  const importFilePath = path.resolve(__dirname, 'data.json');

  console.log(`Starting data import from: ${importFilePath}`);

  try {
    const data = require(importFilePath) as ImportData;

    await importAllData(data);

    console.log('\n✅ Data import completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Fatal error during import process:');

    if (error instanceof SyntaxError) {
      console.error('JSON Parsing Error: The file content is not valid JSON.');
    } else if (error.code === 'MODULE_NOT_FOUND') {
      console.error(`File Not Found: Ensure "data.json" exists in /scripts.`);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

executeImport();
