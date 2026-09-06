/**
 * STREAMFLIX - Secure Authentication Service
 * Features:
 * - Spring Boot 3 REST Backend Authentication with salted PBKDF2 password hashing
 * - Brute-force lockout & rate limiting protection
 * - Web Crypto API client-side salted hashing fallback for static deployments (GitHub Pages)
 * - Real-time password strength validation
 * - Secure session management with token expiry
 * - XSS input sanitization
 */

const AuthService = {
  /**
   * Get current authenticated user
   */
  getUser() {
    const session = this.getSession();
    if (!session || this.isSessionExpired(session)) {
      if (session) this.logout(false);
      return null;
    }
    return session.user;
  },

  /**
   * Get current session object
   */
  getSession() {
    return StorageManager.getItem(StorageManager.KEYS.USER, null);
  },

  /**
   * Get active session token
   */
  getToken() {
    const session = this.getSession();
    return session ? session.token : null;
  },

  /**
   * Check if user has an active, valid session
   */
  isAuthenticated() {
    return this.getUser() !== null;
  },

  /**
   * Check if session has expired (24h default)
   */
  isSessionExpired(session) {
    if (!session || !session.expiresAt) return true;
    return Date.now() > session.expiresAt;
  },

  /**
   * Sign In user with email and password
   */
  async login(email, password, rememberMe = true) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = password || '';

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please provide both your email address and password.');
    }

    if (!this.isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    // 1. Try secure Spring Boot backend authentication
    try {
      if (window.STREAMFLIX_CONFIG && window.STREAMFLIX_CONFIG.API_BASE_URL) {
        const url = `${window.STREAMFLIX_CONFIG.API_BASE_URL}/auth/login`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
        });

        if (res.ok) {
          const data = await res.json();
          return this.saveSession({
            id: data.userId,
            email: data.email,
            name: data.name,
            role: data.role
          }, data.token, data.expiresIn ? data.expiresIn * 1000 : 86400000, rememberMe);
        } else if (res.status === 401 || res.status === 400 || res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Invalid email address or password.');
        }
      }
    } catch (err) {
      // If it's a credentials error or lockout from backend, rethrow immediately
      if (err.message && (err.message.includes('Invalid') || err.message.includes('locked') || err.message.includes('attempts'))) {
        throw err;
      }
      // Otherwise backend is offline/unreachable (e.g. GitHub Pages) -> use secure client fallback
    }

    // 2. Client-side cryptographic fallback (for static GitHub Pages hosting)
    return this.loginClientFallback(cleanEmail, cleanPassword, rememberMe);
  },

  /**
   * Register a new user account
   */
  async register(name, email, password, rememberMe = true) {
    const cleanName = this.sanitize(name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = password || '';

    if (!cleanName || cleanName.length < 2) {
      throw new Error('Please enter your full name (minimum 2 characters).');
    }

    if (!cleanEmail || !this.isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const strength = this.checkPasswordStrength(cleanPassword);
    if (!strength.isValid) {
      throw new Error(strength.message);
    }

    // 1. Try secure Spring Boot backend registration
    try {
      if (window.STREAMFLIX_CONFIG && window.STREAMFLIX_CONFIG.API_BASE_URL) {
        const url = `${window.STREAMFLIX_CONFIG.API_BASE_URL}/auth/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ name: cleanName, email: cleanEmail, password: cleanPassword })
        });

        if (res.ok) {
          const data = await res.json();
          return this.saveSession({
            id: data.userId,
            email: data.email,
            name: data.name,
            role: data.role
          }, data.token, data.expiresIn ? data.expiresIn * 1000 : 86400000, rememberMe);
        } else if (res.status === 400 || res.status === 409) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'An account with this email already exists.');
        }
      }
    } catch (err) {
      if (err.message && (err.message.includes('exists') || err.message.includes('Password') || err.message.includes('Email'))) {
        throw err;
      }
      // Backend offline -> client-side fallback
    }

    // 2. Client-side cryptographic fallback (for static GitHub Pages hosting)
    return this.registerClientFallback(cleanName, cleanEmail, cleanPassword, rememberMe);
  },

  /**
   * Save session to storage
   */
  saveSession(user, token, durationMs = 86400000, rememberMe = true) {
    const session = {
      user: {
        id: user.id || 'usr_' + Date.now(),
        name: user.name || 'Member',
        email: user.email,
        role: user.role || 'USER',
        joinedAt: user.joinedAt || new Date().toISOString()
      },
      token: token || ('tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36)),
      expiresAt: Date.now() + durationMs,
      rememberMe: !!rememberMe
    };

    StorageManager.setItem(StorageManager.KEYS.USER, session);

    // Ensure at least one profile is set
    if (window.ProfilesService && !ProfilesService.getActiveProfile()) {
      const profiles = ProfilesService.getProfiles();
      if (profiles && profiles.length > 0) {
        ProfilesService.setActiveProfile(profiles[0].id);
      }
    }

    return session.user;
  },

  /**
   * Log out current session
   */
  async logout(redirect = true) {
    const token = this.getToken();
    if (token && window.STREAMFLIX_CONFIG && window.STREAMFLIX_CONFIG.API_BASE_URL) {
      try {
        fetch(`${window.STREAMFLIX_CONFIG.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
      } catch (_) {}
    }

    StorageManager.removeItem(StorageManager.KEYS.USER);
    StorageManager.removeItem(StorageManager.KEYS.PROFILE);

    if (redirect) {
      window.location.href = 'login.html';
    }
  },

  /**
   * Enforce authentication gate
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      const current = window.location.pathname.split('/').pop() || 'index.html';
      window.location.href = `login.html?redirect=${encodeURIComponent(current)}`;
    }
  },

  /**
   * Password strength calculator & validator
   */
  checkPasswordStrength(password) {
    const pwd = password || '';
    const hasLength = pwd.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);

    let score = 0;
    if (hasLength) score++;
    if (hasLetter) score++;
    if (hasNumber) score++;
    if (hasSymbol) score++;

    let label = 'Weak';
    let color = '#E50914';

    if (score <= 1) {
      label = 'Too Weak';
      color = '#e50914';
    } else if (score === 2) {
      label = 'Fair';
      color = '#ff9800';
    } else if (score === 3) {
      label = 'Good';
      color = '#ffc107';
    } else if (score >= 4) {
      label = 'Strong';
      color = '#4caf50';
    }

    const isValid = hasLength && hasLetter && hasNumber;
    let message = '';
    if (!hasLength) {
      message = 'Password must be at least 8 characters.';
    } else if (!hasLetter || !hasNumber) {
      message = 'Password must contain both letters and numbers.';
    }

    return {
      score,
      label,
      color,
      isValid,
      message,
      rules: {
        hasLength,
        hasLetter,
        hasNumber,
        hasSymbol
      }
    };
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  sanitize(str) {
    return (str || '').replace(/[<>]/g, '');
  },

  // ==========================================
  // Client-Side Cryptographic Fallback Engine
  // ==========================================
  async getStaticUsers() {
    return StorageManager.getItem('streamflix_accounts_vault', {
      'demo@streamflix.com': {
        name: 'Demo User',
        email: 'demo@streamflix.com',
        salt: 'demo_salt_2026',
        passwordHash: await this.hashPasswordClient('Password123!', 'demo_salt_2026')
      }
    });
  },

  async registerClientFallback(name, email, password, rememberMe) {
    const vault = await this.getStaticUsers();
    if (vault[email]) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = 'salt_' + Math.random().toString(36).substring(2);
    const hash = await this.hashPasswordClient(password, salt);

    vault[email] = {
      name,
      email,
      salt,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };
    StorageManager.setItem('streamflix_accounts_vault', vault);

    return this.saveSession({
      id: 'usr_' + Date.now(),
      name,
      email,
      role: 'USER'
    }, null, 86400000, rememberMe);
  },

  async loginClientFallback(email, password, rememberMe) {
    const vault = await this.getStaticUsers();
    const account = vault[email];

    // Fallback support for demo credentials
    if (!account && email === 'demo@streamflix.com' && (password === 'password123' || password === 'Password123!')) {
      return this.saveSession({
        id: 'usr_demo',
        name: 'Demo Member',
        email: 'demo@streamflix.com',
        role: 'USER'
      }, null, 86400000, rememberMe);
    }

    if (!account) {
      throw new Error('Invalid email address or password.');
    }

    const inputHash = await this.hashPasswordClient(password, account.salt);
    if (inputHash !== account.passwordHash) {
      throw new Error('Invalid email address or password.');
    }

    return this.saveSession({
      id: account.id || 'usr_' + Date.now(),
      name: account.name,
      email: account.email,
      role: 'USER'
    }, null, 86400000, rememberMe);
  },

  async hashPasswordClient(password, salt) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
          "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
        );
        const key = await window.crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: enc.encode(salt || "streamflix_default_salt"),
            iterations: 10000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"]
        );
        const exported = await window.crypto.subtle.exportKey("raw", key);
        return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) {}

    // Lightweight fallback
    let hash = 0;
    const str = `${salt || ''}:${password}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }
};

window.AuthService = AuthService;