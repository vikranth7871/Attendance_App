// iAttend Mobile - Design System / Theme
export const colors = {
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
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
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
