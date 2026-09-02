function renderLoginForm() {
  return `<div class="auth-shell">
    <div class="auth-card">
      <div class="auth-brand"><img src="images/t_m_logo.png" alt="Team Portal Logo" class="logo-img"/><h1>Team Portal</h1></div>
      <p class="auth-sub">Sign in to access your attendance dashboard.</p>
      <div class="form-error" id="form-error"></div>
      
      <button class="btn btn-microsoft" type="button" id="microsoft-login-btn">
        <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 11H0V0H11V11Z" fill="#F25022"/>
          <path d="M23 11H12V0H23V11Z" fill="#7FBA00"/>
          <path d="M11 23H0V12H11V23Z" fill="#00A4EF"/>
          <path d="M23 23H12V12H23V23Z" fill="#FFB900"/>
        </svg>
        Sign in with Microsoft
      </button>
      
      <div class="auth-divider">
        <span>or</span>
      </div>
      
      <form id="login-form" novalidate>
        <div class="field"><label for="username">Username</label><input id="username" name="username" type="text" autocomplete="username" required placeholder="Enter your username" /></div>
        <div class="field"><label for="password">Password</label>
          <div class="password-field">
            <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="Enter your password" />
            <button class="password-toggle" id="toggle-password" type="button" aria-pressed="false" aria-label="Show password">
              <span class="material-symbols-outlined eye-icon" aria-hidden="true">visibility</span>
              <span class="material-symbols-outlined eye-off-icon" aria-hidden="true" style="display: none;">visibility_off</span>
            </button>
          </div>
        </div>
        <button class="btn btn-primary" type="submit" id="submit-btn">Sign in</button>
      </form>
      <div class="auth-switch">Need access? <strong>Contact your admin.</strong></div>
    </div>
  </div>`;
}
