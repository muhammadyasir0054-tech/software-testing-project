class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('#login-email');
    this.passwordInput = page.locator('#login-password');
    this.loginButton = page.locator('#btn-login');
    this.errorAlert = page.locator('#login-error');
  }

  async navigate() {
    await this.page.goto('/');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorMessage() {
    await this.errorAlert.waitFor({ state: 'visible' });
    return await this.errorAlert.textContent();
  }
}

module.exports = LoginPage;
