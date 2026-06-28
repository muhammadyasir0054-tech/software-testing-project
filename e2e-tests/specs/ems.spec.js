const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const testData = require('../data/testData.json');

test.describe('Employee Management System E2E Pipeline', () => {
  let loginPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.navigate();
  });

  test('TC-1: Successful Login with Valid Credentials', async () => {
    await loginPage.login(testData.validAdmin.email, testData.validAdmin.password);
    await expect(dashboardPage.logoutButton).toBeVisible();
    await expect(dashboardPage.statTotal).not.toHaveText('0');
    
    const totalCount = await dashboardPage.getTotalEmployees();
    expect(Number(totalCount)).toBeGreaterThan(0);
  });

  test('TC-2: Rejected Login with Invalid Credentials', async () => {
    await loginPage.login(testData.invalidAdmin.email, testData.invalidAdmin.password);
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain(testData.invalidAdmin.expectedError);
  });

  test.describe('Authenticated Dashboard Workflows', () => {
    test.beforeEach(async () => {
      await loginPage.login(testData.validAdmin.email, testData.validAdmin.password);
      await expect(dashboardPage.logoutButton).toBeVisible();
      await expect(dashboardPage.statTotal).not.toHaveText('0');
    });

    test('TC-3: Create Employee - Successful Save', async () => {
      const initialTotal = Number(await dashboardPage.getTotalEmployees());
      
      await dashboardPage.openAddEmployeeModal();
      await dashboardPage.fillEmployeeForm(testData.newEmployee);
      await dashboardPage.submitEmployeeForm();

      // Verify stats updated
      await expect(dashboardPage.statTotal).toHaveText((initialTotal + 1).toString());
      
      // Verify employee shows up in table
      const row = await dashboardPage.getEmployeeRow(testData.newEmployee.email);
      await expect(row).toBeVisible();
      await expect(row.locator('.emp-name-cell')).toHaveText(testData.newEmployee.name);
    });

    test('TC-4: Create Employee - Reject Duplicate Email', async () => {
      await dashboardPage.openAddEmployeeModal();
      await dashboardPage.fillEmployeeForm(testData.duplicateEmployee);
      await dashboardPage.submitEmployeeForm();

      const errorMsg = await dashboardPage.getFormErrorMessage();
      expect(errorMsg).toContain(testData.duplicateEmployee.expectedError);
      
      await dashboardPage.closeEmployeeModal();
    });

    test('TC-5: Search and Filter Employees by Department', async () => {
      // Filter by Engineering
      await dashboardPage.filterByDepartment('Engineering');
      
      // All visible rows should show 'Engineering'
      const rowsCount = await dashboardPage.employeeRows.count();
      for (let i = 0; i < rowsCount; i++) {
        const deptText = await dashboardPage.employeeRows.nth(i).locator('.dept-badge').textContent();
        expect(deptText).toBe('Engineering');
      }

      // Search for specific employee
      await dashboardPage.search('Jane Smith');
      
      // Verify it filters matches or shows empty if not in Engineering (Jane Smith is HR, so should be empty)
      if (rowsCount > 0) {
        const bodyText = await dashboardPage.page.textContent('.employee-table');
        expect(bodyText).not.toContain('Jane Smith');
      }

      // Reset filter and search
      await dashboardPage.filterByDepartment('All');
      await dashboardPage.search('Jane Smith');
      const filteredRow = await dashboardPage.getEmployeeRow('jane.smith@ems.com');
      await expect(filteredRow).toBeVisible();
    });

    test('TC-6: Update Salary and Verify Modifications', async () => {
      const targetEmail = 'jane.smith@ems.com';
      await dashboardPage.clickEditEmployee(targetEmail);
      
      // Update salary
      await dashboardPage.fillEmployeeForm({ salary: testData.updateEmployee.newSalary });
      await dashboardPage.submitEmployeeForm();

      // Verify updated salary is reflected in the table
      const row = await dashboardPage.getEmployeeRow(targetEmail);
      await expect(row.locator('.emp-salary-cell')).toHaveText(`$${testData.updateEmployee.newSalary.toLocaleString()}`);
    });

    test('TC-7: Delete Employee - Verify Confirmation', async () => {
      // We delete the newly created test employee
      const targetEmail = testData.newEmployee.email;
      const initialTotal = Number(await dashboardPage.getTotalEmployees());

      await dashboardPage.clickDeleteEmployee(targetEmail);
      await dashboardPage.confirmDeletion();

      // Verify stats decremented
      await expect(dashboardPage.statTotal).toHaveText((initialTotal - 1).toString());

      // Verify no longer present in list
      await dashboardPage.search(targetEmail);
      await expect(dashboardPage.emptyState).toBeVisible();
    });
  });
});
