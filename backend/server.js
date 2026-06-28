const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ems-database';
const JWT_SECRET = process.env.JWT_SECRET || 'ems_super_secret_jwt_key';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[+] Connected to MongoDB successfully.');
    seedDatabase();
  })
  .catch(err => console.error('[-] MongoDB connection error:', err));

// Employee Mongoose Schema
const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  salary: { type: Number, required: true },
  status: { type: String, default: 'Active' }
});

const Employee = mongoose.model('Employee', employeeSchema);

// Initial database seeding helper
async function seedDatabase() {
  try {
    const count = await Employee.countDocuments();
    if (count === 0) {
      const initialEmployees = [
        { name: 'John Doe', email: 'john.doe@ems.com', department: 'Engineering', salary: 85000, status: 'Active' },
        { name: 'Jane Smith', email: 'jane.smith@ems.com', department: 'HR', salary: 62000, status: 'Active' },
        { name: 'Mike Johnson', email: 'mike.johnson@ems.com', department: 'Sales', salary: 75000, status: 'Inactive' },
        { name: 'Alice Williams', email: 'alice.williams@ems.com', department: 'Engineering', salary: 92000, status: 'Active' },
        { name: 'Bob Brown', email: 'bob.brown@ems.com', department: 'Marketing', salary: 58000, status: 'Active' }
      ];
      await Employee.insertMany(initialEmployees);
      console.log('[+] Database successfully seeded with default employees.');
    }
  } catch (error) {
    console.error('[-] Error seeding database:', error);
  }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// --- ROUTES ---

// 1. POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Lightweight hardcoded administrator accounts for testing purposes
  if (email === 'admin@ems.com' && password === 'admin123') {
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ token, user: { email, role: 'admin' } });
  }

  return res.status(400).json({ error: 'Invalid username or password.' });
});

// 2. GET /api/employees (Search, filter, list)
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const { search, department } = req.query;
    let query = {};

    if (department && department !== 'All') {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(query);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving employee list.' });
  }
});

// 3. GET /api/employees/stats (Dashboard numbers)
app.get('/api/employees/stats', authenticateToken, async (req, res) => {
  try {
    const total = await Employee.countDocuments();
    const active = await Employee.countDocuments({ status: 'Active' });
    const inactive = total - active;

    const departmentStats = await Employee.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    const averageSalaryResult = await Employee.aggregate([
      { $group: { _id: null, avgSalary: { $avg: '$salary' } } }
    ]);

    const averageSalary = averageSalaryResult.length > 0 ? Math.round(averageSalaryResult[0].avgSalary) : 0;

    res.json({
      total,
      active,
      inactive,
      averageSalary,
      departments: departmentStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error compiling system stats.' });
  }
});

// 4. POST /api/employees (Create)
app.post('/api/employees', authenticateToken, async (req, res) => {
  try {
    const { name, email, department, salary, status } = req.body;

    if (!name || !email || !department || !salary) {
      return res.status(400).json({ error: 'Name, email, department, and salary are required.' });
    }

    // Email unique check
    const existing = await Employee.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    // Salary validation
    const parsedSalary = parseFloat(salary);
    if (isNaN(parsedSalary) || parsedSalary <= 0) {
      return res.status(400).json({ error: 'Salary must be a positive number.' });
    }

    const newEmployee = new Employee({
      name,
      email,
      department,
      salary: parsedSalary,
      status: status || 'Active'
    });

    await newEmployee.save();
    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(500).json({ error: 'Server error saving employee record.' });
  }
});

// 5. PUT /api/employees/:id (Update)
app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, salary, status } = req.body;

    if (!name || !email || !department || !salary) {
      return res.status(400).json({ error: 'Name, email, department, and salary are required.' });
    }

    // Check email clash
    const existing = await Employee.findOne({ email, _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const parsedSalary = parseFloat(salary);
    if (isNaN(parsedSalary) || parsedSalary <= 0) {
      return res.status(400).json({ error: 'Salary must be a positive number.' });
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { name, email, department, salary: parsedSalary, status },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating employee record.' });
  }
});

// 6. DELETE /api/employees/:id (Delete)
app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Employee.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Employee record not found.' });
    }

    res.json({ message: 'Employee successfully removed from roster.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error removing employee record.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Serve frontend build if index is built, otherwise api fallback
app.get('/', (req, res) => {
  res.send('Employee Management System REST Backend is Live.');
});

app.listen(PORT, () => {
  console.log(`[+] EMS Express Backend running on port ${PORT}`);
});
