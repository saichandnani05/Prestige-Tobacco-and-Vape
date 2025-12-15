/**
 * Date utility functions with automatic timezone detection
 */

/**
 * Get the user's timezone - set to CST (Central Standard Time)
 * @returns {string} IANA timezone identifier
 */
export const getUserTimezone = () => {
  // Use CST (Central Standard Time) - America/Chicago covers both CST and CDT
  return 'America/Chicago';
};

/**
 * Get timezone offset in minutes
 * @returns {number} Timezone offset in minutes
 */
export const getTimezoneOffset = () => {
  return new Date().getTimezoneOffset();
};

/**
 * Format date with automatic timezone detection
 * @param {string|Date} dateString - Date string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateWithTimezone = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const timezone = getUserTimezone();
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      ...options
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date for display (short format)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDateShort = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const timezone = getUserTimezone();
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: timezone
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date and time for display in CST
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date and time string in CST
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    let date;
    
    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'string') {
      // SQLite returns dates in format: 'YYYY-MM-DD HH:MM:SS' (no timezone)
      // We need to treat these as UTC and convert to CST
      
      // Check if it's SQLite format (YYYY-MM-DD HH:MM:SS)
      const sqliteFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      
      if (sqliteFormat.test(dateString)) {
        // SQLite format - replace space with 'T' and append 'Z' to indicate UTC
        date = new Date(dateString.replace(' ', 'T') + 'Z');
      } else if (dateString.includes('T')) {
        // ISO format - check if it has timezone
        if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
          date = new Date(dateString);
        } else {
          // ISO without timezone - treat as UTC
          date = new Date(dateString + 'Z');
        }
      } else {
        // Try parsing as-is
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'Invalid Date';
    }
    
    // Use CST timezone (America/Chicago)
    const timezone = getUserTimezone(); // Returns 'America/Chicago'
    
    // Format with CST timezone - show date and time without seconds
    const formatted = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    }).format(date);
    
    return formatted;
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateString);
    return 'Invalid Date';
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older dates, show formatted date with timezone
    return formatDateTime(dateString);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid Date';
  }
};

/**
 * Get current timezone info for display
 * @returns {object} Timezone information
 */
export const getTimezoneInfo = () => {
  try {
    const timezone = getUserTimezone(); // CST (America/Chicago)
    
    // Get current offset for CST/CDT (America/Chicago)
    // CST is UTC-6, CDT is UTC-5 (during daylight saving)
    const now = new Date();
    const cstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offset = (cstDate.getTime() - utcDate.getTime()) / (1000 * 60); // offset in minutes
    
    const offsetHours = Math.abs(Math.floor(offset / 60));
    const offsetMinutes = Math.abs(offset % 60);
    const offsetSign = offset <= 0 ? '+' : '-';
    
    return {
      timezone: 'CST (Central Standard Time)',
      timezoneId: timezone,
      offset,
      offsetString: `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`,
      offsetHours: offsetSign + offsetHours
    };
  } catch (error) {
    console.error('Error getting timezone info:', error);
    return {
      timezone: 'CST (Central Standard Time)',
      timezoneId: 'America/Chicago',
      offset: -360, // CST is UTC-6 (360 minutes)
      offsetString: 'UTC-06:00',
      offsetHours: '-6'
    };
  }
};




