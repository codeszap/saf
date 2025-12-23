const themeKey = 'app-theme';

// Function to set theme
window.setTheme = function (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(themeKey, theme);
    window.updateToggleIcon(theme);
}

// Function to toggle theme
window.toggleTheme = function () {
    const currentTheme = localStorage.getItem(themeKey) || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    window.setTheme(newTheme);
}

// Function to update icon
window.updateToggleIcon = function (theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = theme === 'dark' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
    }
}

// Initial Load - Run immediately to prevent flash and handle late injection
const savedTheme = localStorage.getItem(themeKey) || 'light';
window.setTheme(savedTheme);

// Also try to update icon when DOM is definitely ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.updateToggleIcon(localStorage.getItem(themeKey)));
} else {
    window.updateToggleIcon(savedTheme);
}
