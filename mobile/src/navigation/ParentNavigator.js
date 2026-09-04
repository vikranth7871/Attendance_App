import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import ParentAttendanceScreen from '../screens/parent/ParentAttendanceScreen';
import ParentFeesScreen from '../screens/parent/ParentFeesScreen';
import ParentMessagesScreen from '../screens/parent/ParentMessagesScreen';
import ParentProfileScreen from '../screens/parent/ParentProfileScreen';
import ParentLeaveScreen from '../screens/parent/ParentLeaveScreen';
import ParentResultsScreen from '../screens/parent/ParentResultsScreen';
import ParentAssignmentsScreen from '../screens/parent/ParentAssignmentsScreen';
import ParentTimetableScreen from '../screens/parent/ParentTimetableScreen';

const Stack = createNativeStackNavigator();

const ParentNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Dashboard">
    <Stack.Screen name="Dashboard" component={ParentDashboardScreen} />
    <Stack.Screen name="Attendance" component={ParentAttendanceScreen} />
    <Stack.Screen name="ParentLeave" component={ParentLeaveScreen} />
    <Stack.Screen name="Fees" component={ParentFeesScreen} />
    <Stack.Screen name="ParentAssignments" component={ParentAssignmentsScreen} />
    <Stack.Screen name="ParentTimetable" component={ParentTimetableScreen} />
    <Stack.Screen name="ParentResults" component={ParentResultsScreen} />
    <Stack.Screen name="Messages" component={ParentMessagesScreen} />
    <Stack.Screen name="Profile" component={ParentProfileScreen} />
  </Stack.Navigator>
);

export default ParentNavigator;
