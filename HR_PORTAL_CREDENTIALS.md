# HR Portal Login Credentials

## How to Access
Navigate to: `http://your-domain.com/widget/hr-portal.html`

## Employee Credentials

### Calvin Stein
- **Username**: `calvinstein`
- **Password**: `Henri2026Cal!`
- **Position**: manager
- **Department**: torvegade

### Sarah Jensen
- **Username**: `sarahjensen`
- **Password**: `Sarah#Secure24`
- **Position**: Marketing Specialist
- **Department**: Marketing

### Lars Nielsen
- **Username**: `larsnielsen`
- **Password**: `LarsPass!99`
- **Position**: Product Designer
- **Department**: Product

### Emma Christensen
- **Username**: `emmachristensen`
- **Password**: `EmmaHR@2026`
- **Position**: Support Lead
- **Department**: Customer Success

### Mikkel Hansen
- **Username**: `mikkelhansen`
- **Password**: `Mikkel$Dev88`
- **Position**: Senior Developer
- **Department**: Engineering

---

## Important Notes

⚠️ **Security Best Practices:**
- Keep these credentials secure and confidential
- Do not share credentials via unsecured channels
- Each employee should change their password upon first login (when feature is enabled)
- Passwords are case-sensitive

🔒 **Technical Details:**
- Usernames are auto-generated from employee names (lowercase, no spaces)
- Passwords are securely hashed using bcrypt (10 rounds)
- Sessions expire after 8 hours
- The `plainPassword` field in employees.json is for admin reference only

📝 **For New Employees:**
When adding a new employee through the admin panel:
1. Enter employee name, email, department, and position
2. Username and password are automatically generated
3. Credentials will be displayed once - save them immediately
4. Username format: `firstnamelastname` (all lowercase)
5. Password format: Random 12-character secure password

---

## Admin Access

For admin panel access, visit:
`http://your-domain.com/admin/index.html`

Admin credentials are managed separately through the admin authentication system.
