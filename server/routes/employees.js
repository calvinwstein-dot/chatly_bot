import express from "express";
import multer from "multer";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { requireHRManager, requireHRAdmin, requireRole } from "../middleware/roleAuth.js";
import { logAuditEvent, getClientIP } from "../auditLogger.js";

const router = express.Router();
const EMPLOYEES_FILE = path.resolve("server/data/employees.json");
const CONTRACTS_DIR = path.resolve("server/data/contracts");

// Middleware to validate session and attach to request (but not enforce role)
const validateSession = requireRole('employee', 'shop_manager', 'hr_admin');

// Helper function to generate username from name
function generateUsername(name) {
  return name.toLowerCase().replace(/\s+/g, '');
}

// Helper function to generate secure password
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Configure multer for contract uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(CONTRACTS_DIR)) {
      fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
    }
    cb(null, CONTRACTS_DIR);
  },
  filename: (req, file, cb) => {
    const email = req.params.email;
    const ext = path.extname(file.originalname);
    cb(null, `${email}_contract_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
  }
});

// Get employee data by email - allow users to view their own data
router.get("/:email", validateSession, (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const sessionEmail = req.hrSession?.email?.toLowerCase();
    const sessionRole = req.hrSession?.role;
    
    // Users can view their own data, or shop managers can view any employee
    if (sessionEmail !== email && !['shop_manager', 'hr_admin'].includes(sessionRole)) {
      return res.status(403).json({ error: "Access denied: You can only view your own employee data" });
    }
    
    if (!fs.existsSync(EMPLOYEES_FILE)) {
      return res.status(404).json({ error: "Employee database not found" });
    }
    
    const data = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, "utf-8"));
    const employee = data.employees[email];
    
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Return employee data without sensitive info like salary
    const responseData = {
      name: employee.name,
      username: employee.username,
      employeeId: employee.employeeId,
      department: employee.department,
      position: employee.position,
      hireDate: employee.hireDate,
      ptoBalance: employee.ptoBalance,
      ptoUsed: employee.ptoUsed,
      ptoTotal: employee.ptoTotal,
      contractType: employee.contractType,
      benefits: employee.benefits,
      manager: employee.manager,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      contractName: employee.contractName,
      hasContract: !!employee.contractPath
    };
    
    // Only include plainPassword for HR Admins
    if (sessionRole === 'hr_admin') {
      responseData.plainPassword = employee.plainPassword;
    }
    
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching employee data:", error);
    res.status(500).json({ error: "Failed to load employee data" });
  }
});

// Get all employees (for admin purposes)
router.get("/", requireHRManager, (req, res) => {
  try {
    if (!fs.existsSync(EMPLOYEES_FILE)) {
      return res.status(404).json({ error: "Employee database not found" });
    }
    
    const data = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, "utf-8"));
    
    // Return employees object with email as key for easy lookup
    res.json({ employees: data.employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to load employees" });
  }
});

// Create new employee
router.post("/", requireHRManager, async (req, res) => {
  try {
    const { name, email, department, position, ptoBalance, hireDate } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    
    if (!fs.existsSync(EMPLOYEES_FILE)) {
      return res.status(404).json({ error: "Employee database not found" });
    }
    
    const data = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, "utf-8"));
    
    // Check if employee already exists
    if (data.employees[email.toLowerCase()]) {
      return res.status(400).json({ error: "Employee with this email already exists" });
    }
    
    // Generate username and password
    const username = generateUsername(name);
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Create new employee object
    const newEmployee = {
      name,
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      plainPassword,
      department: department || '',
      position: position || '',
      employeeId: `EMP${String(Object.keys(data.employees).length + 1).padStart(3, '0')}`,
      hireDate: hireDate || new Date().toISOString().split('T')[0],
      ptoBalance: parseFloat(ptoBalance) || 20,
      ptoUsed: 0,
      ptoTotal: parseFloat(ptoBalance) || 20,
      childSickDays: 10,
      personalSickDays: 12,
      contractType: 'Full-time',
      benefits: ['Health Insurance'],
      manager: '',
      phone: ''
    };
    
    // Add to database
    data.employees[email.toLowerCase()] = newEmployee;
    
    // Save to file
    fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(data, null, 2));
    
    // Audit log
    logAuditEvent('EMPLOYEE_CREATED', req.hrSession.email, { 
      newEmployeeEmail: email.toLowerCase(),
      name,
      department,
      position 
    }, getClientIP(req));
    
    res.json({ 
      success: true, 
      employee: newEmployee,
      credentials: {
        username,
        password: plainPassword
      }
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

// Update employee data
router.put("/:email", requireHRManager, async (req, res) => {
  try {
    const originalEmail = req.params.email.toLowerCase();
    const updates = req.body;
    const newEmail = updates.email ? updates.email.toLowerCase() : originalEmail;
    
    if (!fs.existsSync(EMPLOYEES_FILE)) {
      return res.status(404).json({ error: "Employee database not found" });
    }
    
    const data = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, "utf-8"));
    
    if (!data.employees[originalEmail]) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Check if new email already exists (and it's not the same employee)
    if (newEmail !== originalEmail && data.employees[newEmail]) {
      return res.status(400).json({ error: "Email already in use by another employee" });
    }
    
    // Update allowed fields
    const allowedFields = [
      'name', 'username', 'email', 'employeeId', 'department', 'position', 'hireDate',
      'ptoBalance', 'ptoUsed', 'ptoTotal', 'contractType',
      'manager', 'phone', 'benefits', 'childSickDays', 'personalSickDays', 'role'
    ];
        // Check if role is being updated - only hr_admin can change roles
    if (updates.role !== undefined && updates.role !== data.employees[originalEmail].role) {
      if (req.hrSession.role !== 'hr_admin') {
        return res.status(403).json({ error: "Only HR Admins can change employee roles" });
      }
    }
    
    const oldRole = data.employees[originalEmail].role;
        allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        data.employees[originalEmail][field] = updates[field];
      }
    });
    
    // Handle password update if provided
    if (updates.plainPassword) {
      console.log(`🔑 Updating password for ${originalEmail}: ${updates.plainPassword}`);
      data.employees[originalEmail].plainPassword = updates.plainPassword;
      data.employees[originalEmail].password = await bcrypt.hash(updates.plainPassword, 10);
      console.log(`✅ Password hashed and saved`);
    }
    
    // If email changed, move the employee data to new key
    if (newEmail !== originalEmail) {
      data.employees[newEmail] = data.employees[originalEmail];
      delete data.employees[originalEmail];
      
      // Update contract file references if they exist
      if (data.employees[newEmail].contractPath) {
        const oldPath = data.employees[newEmail].contractPath;
        const newPath = oldPath.replace(originalEmail, newEmail);
        const oldFullPath = path.resolve(oldPath);
        const newFullPath = path.resolve(newPath);
        
        if (fs.existsSync(oldFullPath)) {
          fs.renameSync(oldFullPath, newFullPath);
          data.employees[newEmail].contractPath = newPath;
        }
      }
    }
    
    // Save to file
    fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(data, null, 2));
    
    // Audit log with role change details if applicable
    const auditDetails = { 
      employeeEmail: newEmail,
      updatedFields: Object.keys(req.body)
    };
    if (updates.role !== undefined && oldRole !== updates.role) {
      auditDetails.roleChange = { from: oldRole, to: updates.role };
    }
    logAuditEvent('EMPLOYEE_UPDATED', req.hrSession.email, auditDetails, getClientIP(req));
    
    res.json({ 
      success: true, 
      message: "Employee updated successfully",
      employee: data.employees[newEmail]
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// Delete employee
router.delete("/:email", requireHRAdmin, (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    
    if (!fs.existsSync(EMPLOYEES_FILE)) {
      return res.status(404).json({ error: "Employee database not found" });
    }
    
    const data = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, "utf-8"));
    
    if (!data.employees[email]) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Delete contract file if exists
    if (data.employees[email].contractPath) {
      const contractPath = path.resolve(data.employees[email].contractPath);
      if (fs.existsSync(contractPath)) {
        fs.unlinkSync(contractPath);
      }
    }
    
    delete data.employees[email];
    
    // Save to file
    fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(data, null, 2));
    
    // Audit log
    logAuditEvent('EMPLOYEE_DELETED', req.hrSession.email, { 
      deletedEmployeeEmail: email
    }, getClientIP(req));
    
    res.json({ 
      success: true, 
      message: "Employee deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

// Upload contract for employee
router.post("/:email/contract", requireHRManager, upload.single("contract"), (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const data = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, "utf-8"));
    
    if (!data.employees[email]) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Delete old contract if exists
    if (data.employees[email].contractPath) {
      const oldContractPath = path.resolve(data.employees[email].contractPath);
      if (fs.existsSync(oldContractPath)) {
        fs.unlinkSync(oldContractPath);
      }
    }
    
    // Store relative path
    const relativePath = path.relative(process.cwd(), req.file.path);
    data.employees[email].contractPath = relativePath;
    data.employees[email].contractName = req.file.originalname;
    
    fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(data, null, 2));
    
    res.json({
      success: true,
      message: "Contract uploaded successfully",
      contractName: req.file.originalname
    });
  } catch (error) {
    console.error("Error uploading contract:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload contract" });
  }
});

// Download/view contract
router.get("/:email/contract", requireHRManager, (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const data = JSON.parse(fs.readFileSync(EMPLOYEES_FILE, "utf-8"));
    
    if (!data.employees[email]) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    if (!data.employees[email].contractPath) {
      return res.status(404).json({ error: "No contract found for this employee" });
    }
    
    const contractPath = path.resolve(data.employees[email].contractPath);
    
    if (!fs.existsSync(contractPath)) {
      return res.status(404).json({ error: "Contract file not found" });
    }
    
    res.download(contractPath, data.employees[email].contractName || 'contract.pdf');
  } catch (error) {
    console.error("Error downloading contract:", error);
    res.status(500).json({ error: "Failed to download contract" });
  }
});

export default router;
