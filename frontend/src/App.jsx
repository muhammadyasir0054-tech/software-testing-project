import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ems_token') || '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard Telemetry Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, averageSalary: 0 });

  // Employee Directory Lists
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  // Employee Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); // null means "Add Mode"
  const [formData, setFormData] = useState({ name: '', email: '', department: 'Engineering', salary: '', status: 'Active' });
  const [formError, setFormError] = useState('');

  // Delete Confirm Modal
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchEmployees();
    }
  }, [token, deptFilter, searchQuery]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const url = new URL(`${API_BASE_URL}/employees`);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      if (deptFilter) url.searchParams.append('department', deptFilter);

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('ems_token', data.token);
        setToken(data.token);
        setLoginEmail('');
        setLoginPassword('');
      } else {
        setLoginError(data.error || 'Login failed.');
      }
    } catch (err) {
      setLoginError('Unable to connect to the authentication server.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ems_token');
    setToken('');
    setEmployees([]);
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({ name: '', email: '', department: 'Engineering', salary: '', status: 'Active' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      department: emp.department,
      salary: emp.salary.toString(),
      status: emp.status
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const url = editingEmployee 
      ? `${API_BASE_URL}/employees/${editingEmployee._id}` 
      : `${API_BASE_URL}/employees`;
    
    const method = editingEmployee ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        fetchStats();
        fetchEmployees();
      } else {
        setFormError(data.error || 'Failed to save employee.');
      }
    } catch (err) {
      setFormError('Network communication error saving record.');
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/employees/${deletingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setDeletingId(null);
        fetchStats();
        fetchEmployees();
      }
    } catch (err) {
      console.error('Failed deleting employee:', err);
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel animate">
          <div className="login-header">
            <div className="logo-icon"><i className="fa-solid fa-users-gear"></i></div>
            <h2>EMS Login Gate</h2>
            <p>Admin Portal Authentication</p>
          </div>
          
          <form onSubmit={handleLogin} id="login-form">
            {loginError && <div className="error-alert" id="login-error">{loginError}</div>}
            
            <div className="form-group">
              <label htmlFor="login-email">Admin Email</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-envelope"></i>
                <input
                  type="email"
                  id="login-email"
                  placeholder="admin@ems.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-lock"></i>
                <input
                  type="password"
                  id="login-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" id="btn-login">
              Authenticate <i className="fa-solid fa-arrow-right-to-bracket"></i>
            </button>
          </form>
          
          <div className="login-footer">
            <p>Demo Admin: <code>admin@ems.com</code> / <code>admin123</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Topbar / Navigation */}
      <header className="navbar">
        <div className="nav-brand">
          <div className="logo-icon-sm"><i className="fa-solid fa-users-gear"></i></div>
          <span>EMS Dashboard</span>
        </div>
        <div className="nav-actions">
          <span className="user-badge"><i className="fa-solid fa-circle-user"></i> HR Admin</span>
          <button onClick={handleLogout} className="btn btn-sm btn-logout" id="btn-logout">
            Logout <i className="fa-solid fa-power-off"></i>
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Statistics Cards */}
        <section className="stats-row">
          <div className="stat-card glass-panel" id="stat-total">
            <div className="stat-icon bg-blue"><i className="fa-solid fa-users"></i></div>
            <div className="stat-info">
              <span className="stat-label">Total Roster</span>
              <span className="stat-val">{stats.total}</span>
            </div>
          </div>

          <div className="stat-card glass-panel" id="stat-active">
            <div className="stat-icon bg-green"><i className="fa-solid fa-user-check"></i></div>
            <div className="stat-info">
              <span className="stat-label">Active Employees</span>
              <span className="stat-val">{stats.active}</span>
            </div>
          </div>

          <div className="stat-card glass-panel" id="stat-average">
            <div className="stat-icon bg-purple"><i className="fa-solid fa-sack-dollar"></i></div>
            <div className="stat-info">
              <span className="stat-label">Average Annual Salary</span>
              <span className="stat-val">${stats.averageSalary.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Directory Controls and Table */}
        <section className="directory-card glass-panel">
          <div className="directory-header">
            <h3>Staff Directory</h3>
            <button onClick={openAddModal} className="btn btn-primary" id="btn-add-employee">
              <i className="fa-solid fa-user-plus"></i> Add Employee
            </button>
          </div>

          <div className="directory-filters">
            <div className="search-box-wrapper">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                id="search-box"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-dropdown-wrapper">
              <label htmlFor="filter-dept">Department:</label>
              <select
                id="filter-dept"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Department</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="employee-table-body">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-table-state">
                      No employees match your search parameters.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} className="employee-row" data-id={emp._id}>
                      <td className="emp-name-cell"><strong>{emp.name}</strong></td>
                      <td>{emp.email}</td>
                      <td><span className="dept-badge">{emp.department}</span></td>
                      <td className="emp-salary-cell">${emp.salary.toLocaleString()}</td>
                      <td>
                        <span className={`status-pill ${emp.status.toLowerCase()}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="btn-action btn-edit"
                          title="Edit Profile"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(emp._id)}
                          className="btn-action btn-delete"
                          title="Remove Employee"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* CREATE/UPDATE MODAL FORM */}
      {isModalOpen && (
        <div className="modal-overlay" id="employee-modal">
          <div className="modal-content glass-panel animate">
            <div className="modal-header">
              <h3>{editingEmployee ? 'Edit Employee Details' : 'Add New Employee'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} id="employee-form">
              {formError && <div className="error-alert" id="form-error">{formError}</div>}

              <div className="form-group">
                <label htmlFor="input-name">Full Name</label>
                <input
                  type="text"
                  id="input-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="input-email">Email Address</label>
                <input
                  type="email"
                  id="input-email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. john.doe@corp.com"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-fill">
                  <label htmlFor="select-dept">Department</label>
                  <select
                    id="select-dept"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div className="form-group flex-fill">
                  <label htmlFor="select-status">Status</label>
                  <select
                    id="select-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="input-salary">Annual Salary ($)</label>
                <input
                  type="number"
                  id="input-salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="e.g. 75000"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline"
                  id="btn-cancel-employee"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-save-employee"
                >
                  {editingEmployee ? 'Apply Changes' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="modal-overlay" id="delete-modal">
          <div className="modal-content glass-panel animate" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button onClick={() => setDeletingId(null)} className="btn-close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0' }}>
              <p>Are you sure you want to remove this employee from the directory roster? This action is irreversible.</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setDeletingId(null)}
                className="btn btn-outline"
                id="btn-cancel-delete"
              >
                No, Keep Record
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-danger"
                id="btn-confirm-delete"
              >
                Yes, Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
