import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, BarChart2, DollarSign, MessageSquare, UserCircle, ClipboardList } from 'lucide-react-native';
import { colors } from '../styles/theme';

import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import ParentAttendanceScreen from '../screens/parent/ParentAttendanceScreen';
import ParentFeesScreen from '../screens/parent/ParentFeesScreen';
import ParentMessagesScreen from '../screens/parent/ParentMessagesScreen';
import ParentProfileScreen from '../screens/parent/ParentProfileScreen';
import ParentLeaveScreen from '../screens/parent/ParentLeaveScreen';
import ParentResultsScreen from '../screens/parent/ParentResultsScreen';
import ParentAssignmentsScreen from '../screens/parent/ParentAssignmentsScreen';
import ParentTimetableScreen from '../screens/parent/ParentTimetableScreen';

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

const ParentTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle,
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
      tabBarActiveTintColor: colors.parent,
      tabBarInactiveTintColor: colors.textMuted,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={ParentDashboardScreen}
      options={{ tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Attendance"
      component={ParentAttendanceScreen}
      options={{ tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Fees"
      component={ParentFeesScreen}
      options={{ tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Messages"
      component={ParentMessagesScreen}
      options={{ tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ParentProfileScreen}
      options={{ tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} /> }}
    />
  </Tab.Navigator>
);

const ParentNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ParentTabs" component={ParentTabs} />
    <Stack.Screen name="ParentLeave" component={ParentLeaveScreen} />
    <Stack.Screen name="ParentResults" component={ParentResultsScreen} />
    <Stack.Screen name="ParentAssignments" component={ParentAssignmentsScreen} />
    <Stack.Screen name="ParentTimetable" component={ParentTimetableScreen} />
  </Stack.Navigator>
);

export default ParentNavigator;
