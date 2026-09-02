import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, Calendar, ClipboardList, BookOpen, UserCircle, Gamepad2 } from 'lucide-react-native';
import { colors } from '../styles/theme';

import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentTimetableScreen from '../screens/student/StudentTimetableScreen';
import StudentLeaveScreen from '../screens/student/StudentLeaveScreen';
import StudentAssignmentsScreen from '../screens/student/StudentAssignmentsScreen';
import StudentResultsScreen from '../screens/student/StudentResultsScreen';
import StudentAttendanceHistoryScreen from '../screens/student/StudentAttendanceHistoryScreen';
import StudentProfileScreen from '../screens/student/StudentProfileScreen';
import QuizHubScreen from '../screens/quiz/QuizHubScreen';
import QuizAttemptScreen from '../screens/quiz/QuizAttemptScreen';
import QuizResultsScreen from '../screens/quiz/QuizResultsScreen';

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

const StudentTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
      tabBarActiveTintColor: colors.student,
      tabBarInactiveTintColor: colors.textMuted,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={StudentDashboardScreen}
      options={{ tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Timetable"
      component={StudentTimetableScreen}
      options={{ tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Leave"
      component={StudentLeaveScreen}
      options={{ tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Assignments"
      component={StudentAssignmentsScreen}
      options={{ tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={StudentProfileScreen}
      options={{ tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} /> }}
    />
  </Tab.Navigator>
);

const StudentNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StudentTabs" component={StudentTabs} />
    <Stack.Screen name="StudentResults" component={StudentResultsScreen} />
    <Stack.Screen name="StudentAttendanceHistory" component={StudentAttendanceHistoryScreen} />
    <Stack.Screen name="QuizHub" component={QuizHubScreen} />
    <Stack.Screen name="QuizAttempt" component={QuizAttemptScreen} />
    <Stack.Screen name="QuizResults" component={QuizResultsScreen} />
  </Stack.Navigator>
);

export default StudentNavigator;
