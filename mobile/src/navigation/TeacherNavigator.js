import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import ClassRosterScreen from '../screens/teacher/ClassRosterScreen';
import ManualAttendanceScreen from '../screens/teacher/ManualAttendanceScreen';
import TeacherAssignmentsScreen from '../screens/teacher/TeacherAssignmentsScreen';
import TeacherExamsScreen from '../screens/teacher/TeacherExamsScreen';
import TeacherApplyLeaveScreen from '../screens/teacher/TeacherApplyLeaveScreen';
import TeacherMessagesScreen from '../screens/teacher/TeacherMessagesScreen';
import TeacherQuizManageScreen from '../screens/teacher/TeacherQuizManageScreen';
import TeacherProfileScreen from '../screens/teacher/TeacherProfileScreen';
import TeacherTimetableScreen from '../screens/teacher/TeacherTimetableScreen';
import TeacherCoordinatorLeavesScreen from '../screens/teacher/TeacherCoordinatorLeavesScreen';

const Stack = createNativeStackNavigator();

const TeacherNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Dashboard">
    <Stack.Screen name="Dashboard" component={TeacherDashboardScreen} />
    <Stack.Screen name="TeacherTimetable" component={TeacherTimetableScreen} />
    <Stack.Screen name="Timetable" component={TeacherTimetableScreen} />
    <Stack.Screen name="TeacherCoordinatorLeaves" component={TeacherCoordinatorLeavesScreen} />
    <Stack.Screen name="Leaves" component={TeacherCoordinatorLeavesScreen} />
    <Stack.Screen name="Roster" component={ClassRosterScreen} />
    <Stack.Screen name="Attendance" component={ManualAttendanceScreen} />
    <Stack.Screen name="Assignments" component={TeacherAssignmentsScreen} />
    <Stack.Screen name="TeacherExams" component={TeacherExamsScreen} />
    <Stack.Screen name="TeacherApplyLeave" component={TeacherApplyLeaveScreen} />
    <Stack.Screen name="TeacherMessages" component={TeacherMessagesScreen} />
    <Stack.Screen name="TeacherQuizManage" component={TeacherQuizManageScreen} />
    <Stack.Screen name="Profile" component={TeacherProfileScreen} />
  </Stack.Navigator>
);

export default TeacherNavigator;
