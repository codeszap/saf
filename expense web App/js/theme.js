const themeKey = 'app-theme';

// Function to set theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(themeKey, theme);
    updateToggleIcon(theme);
}

// Function to toggle theme
function toggleTheme() {
    const currentTheme = localStorage.getItem(themeKey) || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Function to update icon
function updateToggleIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = theme === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
    }
}

// Initial Load
// Initial Load - Run immediately to prevent flash and handle late injection
const savedTheme = localStorage.getItem(themeKey) || 'light';
setTheme(savedTheme);

// Also try to update icon when DOM is definitely ready (in case script runs before body)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTheme(localStorage.getItem(themeKey)));
}
