import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
import AssignmentsScreen from '../screens/admin/AssignmentsScreen';

const Stack = createNativeStackNavigator();

const AdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Dashboard">
    <Stack.Screen name="Dashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="Users" component={UserManageScreen} />
    <Stack.Screen name="Academic" component={AcademicManageScreen} />
    <Stack.Screen name="SubjectManage" component={SubjectManageScreen} />
    <Stack.Screen name="Assignments" component={AssignmentsScreen} />
    <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
    <Stack.Screen name="Leaves" component={TeacherLeavesScreen} />
    <Stack.Screen name="TeacherLeaves" component={TeacherLeavesScreen} />
    <Stack.Screen name="SystemActivity" component={SystemActivityScreen} />
    <Stack.Screen name="Permissions" component={PermissionsScreen} />
    <Stack.Screen name="AdminQuizManage" component={AdminQuizManageScreen} />
    <Stack.Screen name="Profile" component={AdminProfileScreen} />
  </Stack.Navigator>
);

export default AdminNavigator;
