# HR Portal Employee Login Credentials

## Default Login Information

All employees have been set up with individual accounts. Use your HENRI email address and the default password below:

**Default Password for ALL employees:** `Welcome123`

### Employee Accounts

1. **John Doe** - Sales Manager
   - Email: `john.doe@henri.dk`
   - Password: `Welcome123`

2. **Sarah Jensen** - Marketing Specialist
   - Email: `sarah.jensen@henri.dk`
   - Password: `Welcome123`

3. **Lars Nielsen** - Product Designer
   - Email: `lars.nielsen@henri.dk`
   - Password: `Welcome123`

4. **Emma Christensen** - Support Lead
   - Email: `emma.christensen@henri.dk`
   - Password: `Welcome123`

5. **Mikkel Hansen** - Senior Developer
   - Email: `mikkel.hansen@henri.dk`
   - Password: `Welcome123`

## Security Features

✅ **Individual passwords** - Each employee has their own login credentials
✅ **Bcrypt hashing** - Passwords are securely hashed with bcrypt (10 rounds)
✅ **Session tokens** - 8-hour expiring session tokens after login
✅ **Email domain validation** - Only @henri.dk addresses can access
✅ **Server-side validation** - Password verification happens on the backend

## Changing Passwords

To change an employee's password:

1. Use the password hashing utility:
   ```bash
   node scripts/hash-password.js "NewPassword123"
   ```

2. Copy the generated hash

3. Update the employee's `password` field in `server/data/employees.json`

## Adding New Employees

1. Generate a password hash:
   ```bash
   node scripts/hash-password.js "EmployeePassword"
   ```

2. Add the employee to `server/data/employees.json` with all required fields including the `password` hash

3. The employee can then log in with their email and password

## Important Notes

⚠️ **NEVER** store plain-text passwords in the employees.json file
⚠️ All passwords are currently set to `Welcome123` - employees should change these in production
⚠️ The password hash will be different each time you generate it (even for the same password) due to bcrypt salting

## Production Recommendations

Before deploying to production:

1. Have each employee set a unique, strong password
2. Consider implementing a "Change Password" feature in the portal
3. Consider implementing a "Forgot Password" flow
4. Enable HTTPS on your server to encrypt login credentials in transit
5. Consider implementing password complexity requirements
6. Consider implementing account lockout after failed login attempts
