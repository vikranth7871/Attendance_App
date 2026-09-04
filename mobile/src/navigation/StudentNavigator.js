import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentTimetableScreen from '../screens/student/StudentTimetableScreen';
import StudentLeaveScreen from '../screens/student/StudentLeaveScreen';
import StudentAssignmentsScreen from '../screens/student/StudentAssignmentsScreen';
import StudentResultsScreen from '../screens/student/StudentResultsScreen';
import StudentAttendanceHistoryScreen from '../screens/student/StudentAttendanceHistoryScreen';
import StudentProfileScreen from '../screens/student/StudentProfileScreen';
import StudentSubjectsScreen from '../screens/student/StudentSubjectsScreen';
import QuizHubScreen from '../screens/quiz/QuizHubScreen';
import QuizAttemptScreen from '../screens/quiz/QuizAttemptScreen';
import QuizResultsScreen from '../screens/quiz/QuizResultsScreen';

const Stack = createNativeStackNavigator();

const StudentNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Dashboard">
    <Stack.Screen name="Dashboard" component={StudentDashboardScreen} />
    <Stack.Screen name="Timetable" component={StudentTimetableScreen} />
    <Stack.Screen name="Leave" component={StudentLeaveScreen} />
    <Stack.Screen name="Assignments" component={StudentAssignmentsScreen} />
    <Stack.Screen name="StudentSubjects" component={StudentSubjectsScreen} />
    <Stack.Screen name="StudentResults" component={StudentResultsScreen} />
    <Stack.Screen name="StudentAttendanceHistory" component={StudentAttendanceHistoryScreen} />
    <Stack.Screen name="QuizHub" component={QuizHubScreen} />
    <Stack.Screen name="QuizAttempt" component={QuizAttemptScreen} />
    <Stack.Screen name="QuizResults" component={QuizResultsScreen} />
    <Stack.Screen name="Profile" component={StudentProfileScreen} />
  </Stack.Navigator>
);

export default StudentNavigator;
