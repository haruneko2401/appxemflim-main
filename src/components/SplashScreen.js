import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { TetColors } from '../theme/colors';

const { width } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        // Wait for 2.5 seconds then finish
        const timer = setTimeout(() => {
            // Fate out animation before finishing could be added here if desired
            onFinish();
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
            >
                <Text style={styles.logoText}>Gold Turf</Text>
                <Text style={styles.subText}>Giải trí không giới hạn</Text>

                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={TetColors.gold} />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 42,
        fontWeight: '800',
        color: TetColors.gold,
        marginBottom: 10,
        letterSpacing: 1,
        textShadowColor: 'rgba(212, 175, 55, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    subText: {
        fontSize: 16,
        color: '#CCCCCC',
        letterSpacing: 2,
        marginBottom: 40,
        fontWeight: '300',
    },
    loader: {
        marginTop: 20,
    }
});

export default SplashScreen;
