import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS } from '../theme/tokens';

type RatingStarsProps = {
  value: number | null;
  onSelect?: (next: number) => void;
  size?: number;
};

const RatingStars = ({ value, onSelect, size = 16 }: RatingStarsProps) => {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((score) => {
        const active = value !== null && score <= value;
        return (
          <TouchableOpacity
            key={score}
            onPress={onSelect ? () => onSelect(score) : undefined}
            disabled={!onSelect}
            style={styles.starButton}
          >
            <Text
              style={[
                styles.star,
                { fontSize: size, color: active ? COLORS.accent : COLORS.textSecondary },
              ]}
            >
              ★
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  starButton: {
    padding: 2,
  },
  star: {
    fontFamily: FONTS.body,
  },
});

export default RatingStars;
