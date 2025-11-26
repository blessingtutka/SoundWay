import * as fs from 'fs';
import { importAllData, ImportData } from './buildingService';

async function executeImport(): Promise<void> {
  const importFilePath = './data.json';

  console.log(`Starting data import from: ${importFilePath}`);

  try {
    const rawData = fs.readFileSync(importFilePath, 'utf-8');
    const data: ImportData = JSON.parse(rawData);
    await importAllData(data);
    console.log('\n✅ Data import completed successfully!');
  } catch (error) {
    console.error('\n❌ Fatal error during import process:');
    if (error instanceof SyntaxError) {
      console.error('JSON Parsing Error: The file content is not valid JSON.');
    } else if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(`File Not Found: Ensure the file "data.json" exists in the same directory.`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

executeImport();
