/**
 * STREAMFLIX - Profiles Management
 * Supports multiple viewing profiles (Profile 1, Profile 2, Kids) and Kids Mode filtering.
 */

const DEFAULT_PROFILES = [
  {
    id: 'p1',
    name: 'Profile 1',
    avatar: 'assets/images/avatar1.svg',
    avatarColor: '#E50914',
    isKids: false
  },
  {
    id: 'p2',
    name: 'Profile 2',
    avatar: 'assets/images/avatar2.svg',
    avatarColor: '#2b78e4',
    isKids: false
  },
  {
    id: 'pkids',
    name: 'Kids',
    avatar: 'assets/images/avatar-kids.svg',
    avatarColor: '#f5c518',
    isKids: true
  }
];

const ProfilesService = {
  /**
   * Get all registered profiles
   */
  getProfiles() {
    let profiles = StorageManager.getItem('streamflix_all_profiles', null);
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      profiles = DEFAULT_PROFILES;
      StorageManager.setItem('streamflix_all_profiles', profiles);
    }
    return profiles;
  },

  /**
   * Get current active profile
   */
  getActiveProfile() {
    const activeId = StorageManager.getItem(StorageManager.KEYS.PROFILE, null);
    const profiles = this.getProfiles();
    const found = profiles.find(p => p.id === activeId);
    return found || profiles[0];
  },

  /**
   * Set active profile by ID
   */
  setActiveProfile(profileId) {
    const profiles = this.getProfiles();
    const exists = profiles.some(p => p.id === profileId);
    if (exists) {
      StorageManager.setItem(StorageManager.KEYS.PROFILE, profileId);
      return true;
    }
    return false;
  },

  /**
   * Check if active profile is in Kids mode
   */
  isKidsMode() {
    const profile = this.getActiveProfile();
    return profile ? !!profile.isKids : false;
  },

  /**
   * Filter an array of movie objects if Kids mode is active
   */
  filterContentForProfile(movies) {
    if (!this.isKidsMode()) {
      return movies;
    }
    return (movies || []).filter(movie => Utils.isKidsSafe(movie));
  }
};

window.ProfilesService = ProfilesService;
