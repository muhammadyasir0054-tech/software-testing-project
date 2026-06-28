class DashboardPage {
  constructor(page) {
    this.page = page;
    
    // Header
    this.logoutButton = page.locator('#btn-logout');
    
    // Stats Cards
    this.statTotal = page.locator('#stat-total .stat-val');
    this.statActive = page.locator('#stat-active .stat-val');
    this.statAverage = page.locator('#stat-average .stat-val');
    
    // Controls
    this.searchBox = page.locator('#search-box');
    this.deptFilterDropdown = page.locator('#filter-dept');
    this.addEmployeeButton = page.locator('#btn-add-employee');
    
    // Table
    this.employeeRows = page.locator('.employee-row');
    this.emptyState = page.locator('.empty-table-state');
    
    // Form Modal
    this.modal = page.locator('#employee-modal');
    this.modalTitle = page.locator('#employee-modal h3');
    this.nameInput = page.locator('#input-name');
    this.emailInput = page.locator('#input-email');
    this.deptSelect = page.locator('#select-dept');
    this.statusSelect = page.locator('#select-status');
    this.salaryInput = page.locator('#input-salary');
    this.saveButton = page.locator('#btn-save-employee');
    this.cancelButton = page.locator('#btn-cancel-employee');
    this.formError = page.locator('#form-error');
    
    // Delete Modal
    this.deleteModal = page.locator('#delete-modal');
    this.confirmDeleteButton = page.locator('#btn-confirm-delete');
    this.cancelDeleteButton = page.locator('#btn-cancel-delete');
  }

  async getTotalEmployees() {
    await this.statTotal.waitFor({ state: 'visible' });
    return await this.statTotal.textContent();
  }

  async getActiveEmployees() {
    return await this.statActive.textContent();
  }

  async getAverageSalary() {
    return await this.statAverage.textContent();
  }

  async search(query) {
    await this.searchBox.fill(query);
    // Give it a tiny bit of time for state updates to apply
    await this.page.waitForTimeout(500);
  }

  async filterByDepartment(dept) {
    await this.deptFilterDropdown.selectOption(dept);
    await this.page.waitForTimeout(500);
  }

  async openAddEmployeeModal() {
    await this.addEmployeeButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async fillEmployeeForm({ name, email, department, status, salary }) {
    if (name !== undefined) await this.nameInput.fill(name);
    if (email !== undefined) await this.emailInput.fill(email);
    if (department !== undefined) await this.deptSelect.selectOption(department);
    if (status !== undefined) await this.statusSelect.selectOption(status);
    if (salary !== undefined) await this.salaryInput.fill(salary.toString());
  }

  async submitEmployeeForm() {
    await this.saveButton.click();
  }

  async getFormErrorMessage() {
    await this.formError.waitFor({ state: 'visible' });
    return await this.formError.textContent();
  }

  async closeEmployeeModal() {
    await this.cancelButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async getEmployeeRow(email) {
    // Find row that contains the email address
    return this.employeeRows.filter({ hasText: email });
  }

  async clickEditEmployee(email) {
    const row = await this.getEmployeeRow(email);
    await row.locator('.btn-edit').click();
    await this.modal.waitFor({ state: 'visible' });
  }

  async clickDeleteEmployee(email) {
    const row = await this.getEmployeeRow(email);
    await row.locator('.btn-delete').click();
    await this.deleteModal.waitFor({ state: 'visible' });
  }

  async confirmDeletion() {
    await this.confirmDeleteButton.click();
    await this.deleteModal.waitFor({ state: 'hidden' });
  }

  async cancelDeletion() {
    await this.cancelDeleteButton.click();
    await this.deleteModal.waitFor({ state: 'hidden' });
  }

  async logout() {
    await this.logoutButton.click();
  }
}

module.exports = DashboardPage;
