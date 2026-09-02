import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, Users, ClipboardList, BookOpen, UserCircle, CalendarDays } from 'lucide-react-native';
import { colors } from '../styles/theme';

import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import ClassRosterScreen from '../screens/teacher/ClassRosterScreen';
import ManualAttendanceScreen from '../screens/teacher/ManualAttendanceScreen';
import TeacherAssignmentsScreen from '../screens/teacher/TeacherAssignmentsScreen';
import TeacherExamsScreen from '../screens/teacher/TeacherExamsScreen';
import TeacherApplyLeaveScreen from '../screens/teacher/TeacherApplyLeaveScreen';
import TeacherMessagesScreen from '../screens/teacher/TeacherMessagesScreen';
import TeacherQuizManageScreen from '../screens/teacher/TeacherQuizManageScreen';
import TeacherProfileScreen from '../screens/teacher/TeacherProfileScreen';

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

const TeacherTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
      tabBarActiveTintColor: colors.teacher,
      tabBarInactiveTintColor: colors.textMuted,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={TeacherDashboardScreen}
      options={{ tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Roster"
      component={ClassRosterScreen}
      options={{ tabBarLabel: 'Students', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Attendance"
      component={ManualAttendanceScreen}
      options={{ tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Assignments"
      component={TeacherAssignmentsScreen}
      options={{ tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={TeacherProfileScreen}
      options={{ tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} /> }}
    />
  </Tab.Navigator>
);

const TeacherNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TeacherTabs" component={TeacherTabs} />
    <Stack.Screen name="TeacherExams" component={TeacherExamsScreen} />
    <Stack.Screen name="TeacherApplyLeave" component={TeacherApplyLeaveScreen} />
    <Stack.Screen name="TeacherMessages" component={TeacherMessagesScreen} />
    <Stack.Screen name="TeacherQuizManage" component={TeacherQuizManageScreen} />
  </Stack.Navigator>
);

export default TeacherNavigator;
