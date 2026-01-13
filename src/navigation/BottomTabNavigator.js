import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Platform } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ShortsScreen from '../screens/ShortsScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import YouScreen from '../screens/YouScreen';
import { TetColors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'HomeTab') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Shorts') {
                        iconName = focused ? 'flash' : 'flash-outline';
                    } else if (route.name === 'Subscriptions') {
                        iconName = focused ? 'albums' : 'albums-outline';
                    } else if (route.name === 'You') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={24} color={color} />;
                },
                tabBarActiveTintColor: TetColors.textPrimary,
                tabBarInactiveTintColor: TetColors.textTertiary,
                tabBarStyle: {
                    backgroundColor: TetColors.background,
                    borderTopWidth: 1,
                    borderTopColor: TetColors.border,
                    height: Platform.OS === 'ios' ? 88 : 60,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                },
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Tab.Screen name="Shorts" component={ShortsScreen} />
            <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ title: 'Subscriptions' }} />
            <Tab.Screen name="You" component={YouScreen} options={{ title: 'You' }} />
        </Tab.Navigator>
    );
};

export default BottomTabNavigator;
