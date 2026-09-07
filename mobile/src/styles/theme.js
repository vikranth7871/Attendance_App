// iAttend Mobile - Design System / Theme
import { StyleSheet, Platform } from 'react-native';

export const darkColors = {
  // Brand
  primary: '#6366f1',
  primaryDark: '#4338ca',
  primaryLight: '#818cf8',
  secondary: '#8b5cf6',

  // Roles
  admin: '#6366f1',
  teacher: '#10b981',
  student: '#3b82f6',
  parent: '#f59e0b',

  // Status
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Backgrounds (dark default)
  bgPrimary: '#0f0f13',
  bgSecondary: '#1a1a2e',
  bgCard: '#1e1e2e',
  bgElevated: '#252535',
  bgInput: '#252535',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Borders
  border: '#2a2a3a',
  borderLight: '#334155',

  // Gradients (for linearGradient)
  gradientPrimary: ['#4338ca', '#6366f1', '#8b5cf6'],
  gradientAdmin: ['#4338ca', '#6366f1'],
  gradientTeacher: ['#059669', '#10b981'],
  gradientStudent: ['#2563eb', '#3b82f6'],
  gradientParent: ['#d97706', '#f59e0b'],
  gradientCard: ['#1e1e2e', '#252535'],
};

export const lightColors = {
  // Brand
  primary: '#5b50e6',
  primaryDark: '#4338ca',
  primaryLight: '#818cf8',
  secondary: '#8b5cf6',

  // Roles
  admin: '#5b50e6',
  teacher: '#10b981',
  student: '#3b82f6',
  parent: '#f59e0b',

  // Status
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Backgrounds (clean light slate dashboard, matching web application)
  bgPrimary: '#f4f7fe',
  bgSecondary: '#ffffff',
  bgCard: '#ffffff',
  bgElevated: '#f1f5f9',
  bgInput: '#f8fafc',

  // Text
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',

  // Borders
  border: '#e2e8f0',
  borderLight: '#cbd5e1',

  // Gradients
  gradientPrimary: ['#4338ca', '#5b50e6', '#8b5cf6'],
  gradientAdmin: ['#4338ca', '#5b50e6'],
  gradientTeacher: ['#059669', '#10b981'],
  gradientStudent: ['#2563eb', '#3b82f6'],
  gradientParent: ['#d97706', '#f59e0b'],
  gradientCard: ['#ffffff', '#f8fafc'],
};

// Mutable colors object that updates in-place so all direct imports stay updated
export const colors = { ...darkColors };

let currentTheme = 'dark';

// Build dark -> light color mapping table including 2-digit hex opacity variants
const darkToLightColorMap = {};
for (const k in darkColors) {
  const d = String(darkColors[k]).toLowerCase();
  const l = lightColors[k];
  if (typeof d === 'string' && typeof l === 'string') {
    darkToLightColorMap[d] = l;
    ['10', '12', '14', '18', '20', '22', '30', '33', '40', '44', '50', '60', '70', '80'].forEach(alpha => {
      darkToLightColorMap[d + alpha] = l + alpha;
    });
  }
}

function transformRuleToTheme(rule) {
  if (!rule || typeof rule !== 'object') return rule;
  const res = {};
  for (const k in rule) {
    const val = rule[k];
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (darkToLightColorMap[lower]) {
        res[k] = darkToLightColorMap[lower];
      } else {
        res[k] = val;
      }
    } else if (Array.isArray(val)) {
      res[k] = val.map(transformRuleToTheme);
    } else if (val && typeof val === 'object') {
      res[k] = transformRuleToTheme(val);
    } else {
      res[k] = val;
    }
  }
  return res;
}

// Enhance StyleSheet.create with high-performance theme proxying
const originalCreate = StyleSheet.create;
StyleSheet.create = function (styles) {
  if (!styles || typeof styles !== 'object') {
    return originalCreate.call(this, styles);
  }
  const original = JSON.parse(JSON.stringify(styles));
  const created = originalCreate.call(this, styles);
  const lightCache = {};

  return new Proxy(created, {
    get(target, prop) {
      if (typeof prop === 'symbol') return target[prop];
      if (currentTheme === 'dark') {
        return target[prop];
      }
      if (lightCache[prop]) {
        return lightCache[prop];
      }
      const o = original[prop];
      if (!o) return target[prop];
      lightCache[prop] = transformRuleToTheme(o);
      return lightCache[prop];
    },
  });
};

export const setGlobalTheme = (theme) => {
  currentTheme = theme;
  if (theme === 'light') {
    Object.assign(colors, lightColors);
  } else {
    Object.assign(colors, darkColors);
  }

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      if (document.body) {
        document.body.style.backgroundColor = colors.bgPrimary;
      }
      injectWebFocusResets();
    } catch {}
  }
};

// Web outline and focus resets to prevent browser focus rings on inputs while retaining caret
export const injectWebFocusResets = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const styleId = 'iattend-global-focus-resets';
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        input, textarea, select, [contenteditable], [data-focusable="true"] {
          outline: none !important;
          outline-style: none !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        input:focus, textarea:focus, select:focus, [contenteditable]:focus, [data-focusable="true"]:focus {
          outline: none !important;
          outline-style: none !important;
          box-shadow: none !important;
        }
        *:focus {
          outline: none !important;
        }
      `;
    } catch {}
  }
};

injectWebFocusResets();

export const getGlobalTheme = () => currentTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  xs: { fontSize: 11, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },
  md: { fontSize: 17, lineHeight: 24 },
  lg: { fontSize: 20, lineHeight: 28 },
  xl: { fontSize: 24, lineHeight: 32 },
  xxl: { fontSize: 30, lineHeight: 38 },
  bold: { fontWeight: '700' },
  semibold: { fontWeight: '600' },
  medium: { fontWeight: '500' },
};

export const shadows = {
  sm: Platform.select({
    web: { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.30)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 3,
    },
  }),
  md: Platform.select({
    web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.40)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: '0px 8px 16px rgba(99, 102, 241, 0.30)' },
    default: {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 10,
    },
  }),
};

export const getRoleColor = (role) => {
  const map = {
    admin: colors.admin,
    teacher: colors.teacher,
    student: colors.student,
    parent: colors.parent,
  };
  return map[role] || colors.primary;
};

export const getRoleGradient = (role) => {
  const map = {
    admin: colors.gradientAdmin,
    teacher: colors.gradientTeacher,
    student: colors.gradientStudent,
    parent: colors.gradientParent,
  };
  return map[role] || colors.gradientPrimary;
};
