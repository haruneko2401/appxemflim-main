import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TetColors } from '../theme/colors';

const SubscriptionsScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Kênh đăng ký</Text>
            <Text style={styles.subText}>Tính năng đang phát triển</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: TetColors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: TetColors.textPrimary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    subText: {
        color: TetColors.textSecondary,
        marginTop: 10,
    }
});

export default SubscriptionsScreen;
