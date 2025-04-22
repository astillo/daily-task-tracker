// Theme configuration for the application
// Based on PostHog style guidelines

export const lightTheme = {
  // Primary colors
  'text-primary': '#151515',
  'text-secondary': 'rgba(21, 21, 21, 0.9)', // Text with 90% opacity
  'bg-primary': '#EEEFE9',
  'bg-secondary': '#E5E7E0',
  'bg-accent': '#E5E7E0',
  'border-color': '#D0D1C9',
  
  // Action colors
  'primary-color': '#F54E00', // Red (Primary Action/Link)
  'primary-color-dark': '#E04600',
  'primary-color-light': 'rgba(245, 78, 0, 0.1)',
  'secondary-color': '#1D4AFF', // Blue
  'warning-color': '#DC9300', // Yellow
  'success-color': '#28a745',
  'danger-color': '#F54E00',
  
  // Calendar specific colors - enhanced for better visibility
  'calendar-cell-level-0': '#E5E7E0',
  'calendar-cell-level-1': '#FFC1AD',
  'calendar-cell-level-2': '#FF9B7D',
  'calendar-cell-level-3': '#FF7A4D',
  'calendar-cell-level-4': '#F54E00',
  
  // UI specific colors
  'bg-hover': 'rgba(245, 78, 0, 0.05)',
  'icon-color': '#151515',
};

export const darkTheme = {
  // Primary colors
  'text-primary': '#EEEFE9',
  'text-secondary': 'rgba(238, 239, 233, 0.9)', // Text with 90% opacity
  'bg-primary': '#151515',
  'bg-secondary': '#2C2C2C',
  'bg-accent': '#2C2C2C',
  'border-color': '#4B4B4B',
  
  // Action colors
  'primary-color': '#F1A82C', // Yellow is primary in dark mode
  'primary-color-dark': '#DC9300',
  'primary-color-light': 'rgba(241, 168, 44, 0.1)',
  'secondary-color': '#1D4AFF', // Blue
  'warning-color': '#F1A82C', // Yellow
  'success-color': '#28a745',
  'danger-color': '#dc3545',
  
  // Calendar specific colors - enhanced for better visibility
  'calendar-cell-level-0': '#2C2C2C',
  'calendar-cell-level-1': '#5E4A21',
  'calendar-cell-level-2': '#8E7031',
  'calendar-cell-level-3': '#BC9642',
  'calendar-cell-level-4': '#F1A82C',
  
  // UI specific colors
  'bg-hover': 'rgba(241, 168, 44, 0.1)',
  'icon-color': '#EEEFE9',
};

// Define typography 
export const typography = {
  fontFamily: `'Matter SQ', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
  titleFontWeight: 700, // Bold
  headingFontWeight: 600, // Semibold
  bodyFontWeight: 475, // Custom weight for better readability
  linkFontWeight: 600, // Semibold
  baseSize: '16px',
  titleSize: '2rem',
  headingSize: '1.5rem',
  subheadingSize: '1.25rem',
  bodySize: '1rem',
  smallSize: '0.875rem',
};

// Export combined theme
export const theme = {
  light: lightTheme,
  dark: darkTheme,
  typography,
};

export default theme; 