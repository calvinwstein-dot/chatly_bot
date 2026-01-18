import bcrypt from 'bcrypt';

// Utility script to generate password hash for .env file
const password = process.argv[2];

if (!password) {
  console.log('Usage: node generate-password-hash.js <password>');
  console.log('Example: node generate-password-hash.js MySecurePassword123');
  process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('\n✅ Password hash generated!\n');
console.log('Add this to your .env file:');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
console.log('Remove the old ADMIN_PASSWORD variable from .env for security.\n');
