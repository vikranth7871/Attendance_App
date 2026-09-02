import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/theme';

import LoginScreen from '../screens/auth/LoginScreen';
import AdminNavigator from './AdminNavigator';
import TeacherNavigator from './TeacherNavigator';
import StudentNavigator from './StudentNavigator';
import ParentNavigator from './ParentNavigator';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const getRoleNavigator = () => {
    if (!user) return null;
    switch (user.role) {
      case 'admin': return <Stack.Screen name="Admin" component={AdminNavigator} />;
      case 'teacher': return <Stack.Screen name="Teacher" component={TeacherNavigator} />;
      case 'student': return <Stack.Screen name="Student" component={StudentNavigator} />;
      case 'parent': return <Stack.Screen name="Parent" component={ParentNavigator} />;
      default: return null;
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          getRoleNavigator()
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
