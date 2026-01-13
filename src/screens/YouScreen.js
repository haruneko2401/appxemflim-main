import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { TetColors } from '../theme/colors';

const YouScreen = () => {
    return (
        <View style={styles.container}>
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>G</Text>
            </View>
            <Text style={styles.text}>Của bạn</Text>
            <Text style={styles.subText}>Đăng nhập để xem video đã lưu</Text>
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
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: TetColors.gold,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: TetColors.background,
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

export default YouScreen;
