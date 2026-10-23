import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Close, ImageAdd, Refresh } from "@/components/icons";
import { Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import type { Attachment } from "./useAttachments";

/** Picked photos with upload progress, a remove button, and retry on failure; plus "Add photo" while there's room. */
export function AttachmentStrip({
  items,
  onAdd,
  onRemove,
  onRetry,
  full,
  size = 72,
}: {
  items: Attachment[];
  onAdd?: () => void;
  onRemove: (key: string) => void;
  onRetry: (a: Attachment) => void;
  full: boolean;
  size?: number;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {items.map((a) => (
        <View key={a.key} style={[styles.tile, { width: size, height: size }]}>
          <Image source={{ uri: a.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {a.storageId === null && !a.failed ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progress, { width: `${Math.max(8, a.progress * 100)}%` }]} />
            </View>
          ) : null}
          {a.failed ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Retry upload" onPress={() => onRetry(a)} style={styles.failed}>
              <Refresh size={20} color={colors.white} />
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" hitSlop={6} onPress={() => onRemove(a.key)} style={styles.remove}>
            <Close size={12} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>
      ))}
      {onAdd && !full ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" onPress={onAdd} style={[styles.tile, styles.add, { width: size, height: size }]}>
          <ImageAdd size={24} color={colors.forest} />
          <Text variant="small" color={colors.forest}>
            Add
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  tile: { borderRadius: radii.md, overflow: "hidden", backgroundColor: colors.placeholder },
  add: { backgroundColor: colors.tint, borderWidth: 1, borderColor: colors.lime, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 2 },
  progressTrack: { position: "absolute", left: 6, right: 6, bottom: 6, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.5)" },
  progress: { height: 4, borderRadius: 2, backgroundColor: colors.lime },
  failed: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(214,69,69,0.6)", alignItems: "center", justifyContent: "center" },
  remove: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
});
