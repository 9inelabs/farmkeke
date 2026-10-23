// M-18 Photo viewer: the product's photos full screen, swipe between them.
import { Image } from "expo-image";
import { Close } from "@/components/icons";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";
import { useScreenWidth } from "@/theme/useScreenSize";

type Props = { photos: string[]; start: number | null; name: string; onClose: () => void };

export function PhotoViewer({ photos, start, name, onClose }: Props) {
  const width = useScreenWidth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start ?? 0);
  if (start === null) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.page}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          keyExtractor={(u, i) => `${i}:${u}`}
          renderItem={({ item, index: i }) => (
            <Image
              source={{ uri: item }}
              style={{ width, height }}
              contentFit="contain"
              accessibilityLabel={`${name}, photo ${i + 1} of ${photos.length}`}
            />
          )}
        />
        <View style={[styles.bar, { top: insets.top + spacing.sm }]}>
          <Text variant="label" color={colors.white}>
            {index + 1} of {photos.length}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close photos" hitSlop={12} onPress={onClose} style={styles.close}>
            <Close size={22} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#000" },
  bar: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
});
