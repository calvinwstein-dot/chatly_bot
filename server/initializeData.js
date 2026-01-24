import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('server/data');
const CONTRACTS_DIR = path.resolve('server/data/contracts');

// Files to initialize from templates
const dataFiles = [
  {
    file: 'employees.json',
    template: 'employees.template.json',
    description: 'Employee database'
  },
  {
    file: 'hrSessions.json',
    template: null,
    default: {},
    description: 'HR Portal sessions'
  },
  {
    file: 'ptoRequests.json',
    template: null,
    default: { requests: [] },
    description: 'PTO requests'
  }
];

console.log('🔧 Initializing data files...');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('✅ Created data directory');
}

// Create contracts directory if it doesn't exist
if (!fs.existsSync(CONTRACTS_DIR)) {
  fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
  console.log('✅ Created contracts directory');
}

// Initialize each data file
dataFiles.forEach(({ file, template, default: defaultData, description }) => {
  const filePath = path.join(DATA_DIR, file);
  
  if (!fs.existsSync(filePath)) {
    if (template) {
      // Copy from template
      const templatePath = path.join(DATA_DIR, template);
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, filePath);
        console.log(`✅ Initialized ${description} from template`);
      } else {
        console.warn(`⚠️  Template not found: ${template}`);
      }
    } else if (defaultData) {
      // Create with default data
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      console.log(`✅ Created ${description} with default data`);
    }
  } else {
    console.log(`✓ ${description} already exists`);
  }
});

console.log('✅ Data initialization complete!\n');
