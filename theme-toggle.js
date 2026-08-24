export function initThemeToggle() {
  const darkIcon = document.getElementById('theme-toggle-dark-icon');
  const lightIcon = document.getElementById('theme-toggle-light-icon');
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const isDark = localStorage.getItem('color-theme') === 'dark' ||
    (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.documentElement.classList.toggle('dark', isDark);
  darkIcon.classList.toggle('hidden', isDark);
  lightIcon.classList.toggle('hidden', !isDark);

  btn.addEventListener('click', () => {
    const nowDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nowDark);
    darkIcon.classList.toggle('hidden', nowDark);
    lightIcon.classList.toggle('hidden', !nowDark);
    localStorage.setItem('color-theme', nowDark ? 'dark' : 'light');
  });
}