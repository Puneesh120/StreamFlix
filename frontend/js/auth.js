/**
 * STREAMFLIX - Authentication Service (Demo)
 * IMPORTANT DISCLAIMER:
 * This frontend authentication is for demonstration purposes and is not secure production authentication.
 * Do NOT store real passwords in production.
 */

const AuthService = {
  /**
   * Get current demo user
   */
  getUser() {
    return StorageManager.getItem(StorageManager.KEYS.USER, null);
  },

  /**
   * Check if user is logged in
   */
  isAuthenticated() {
    return this.getUser() !== null;
  },

  /**
   * Demo sign in
   */
  login(email, password) {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    // Demo account creation / mock authentication
    const user = {
      email: email.trim(),
      name: email.split('@')[0] || 'Member',
      joinedAt: new Date().toISOString()
    };

    StorageManager.setItem(StorageManager.KEYS.USER, user);

    // Initialize default profile if not present
    if (!ProfilesService.getActiveProfile()) {
      ProfilesService.setActiveProfile(ProfilesService.getProfiles()[0].id);
    }

    return user;
  },

  /**
   * Demo log out
   */
  logout() {
    StorageManager.removeItem(StorageManager.KEYS.USER);
    StorageManager.removeItem(StorageManager.KEYS.PROFILE);
    window.location.href = 'login.html';
  },

  /**
   * Ensure user is authenticated, otherwise redirect to login
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  }
};

window.AuthService = AuthService;
