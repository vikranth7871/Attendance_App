import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { LayoutDashboard, Users, BookOpen, Calendar, UserCircle } from 'lucide-react-native';
import { colors, spacing } from '../styles/theme';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserManageScreen from '../screens/admin/UserManageScreen';
import AcademicManageScreen from '../screens/admin/AcademicManageScreen';
import SubjectManageScreen from '../screens/admin/SubjectManageScreen';
import AdminQuizManageScreen from '../screens/admin/AdminQuizManageScreen';
import SystemActivityScreen from '../screens/admin/SystemActivityScreen';
import PermissionsScreen from '../screens/admin/PermissionsScreen';
import TeacherAttendanceScreen from '../screens/admin/TeacherAttendanceScreen';
import TeacherLeavesScreen from '../screens/admin/TeacherLeavesScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabBarStyle = {
  backgroundColor: colors.bgCard,
  borderTopColor: colors.border,
  borderTopWidth: 1,
  paddingBottom: 6,
  paddingTop: 6,
  height: 62,
};

const tabBarLabelStyle = {
  fontSize: 11,
  fontWeight: '600',
  marginTop: -2,
};

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle,
      tabBarLabelStyle,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={AdminDashboardScreen}
      options={{ tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Users"
      component={UserManageScreen}
      options={{ tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Academic"
      component={AcademicManageScreen}
      options={{ tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Leaves"
      component={TeacherLeavesScreen}
      options={{ tabBarLabel: 'Staff Leaves', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={AdminProfileScreen}
      options={{ tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} /> }}
    />
  </Tab.Navigator>
);

const AdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
    <Stack.Screen name="SubjectManage" component={SubjectManageScreen} />
    <Stack.Screen name="AdminQuizManage" component={AdminQuizManageScreen} />
    <Stack.Screen name="SystemActivity" component={SystemActivityScreen} />
    <Stack.Screen name="Permissions" component={PermissionsScreen} />
    <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
  </Stack.Navigator>
);

export default AdminNavigator;

