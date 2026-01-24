import bcrypt from 'bcrypt';

// Script to generate password hashes for employees
// Usage: node scripts/hash-password.js <password>

const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/hash-password.js <password>');
  console.log('Example: node scripts/hash-password.js MySecurePass123');
  process.exit(1);
}

const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }
  
  console.log('\nPassword Hash:');
  console.log(hash);
  console.log('\nAdd this hash to the employee\'s "password" field in employees.json');
});
