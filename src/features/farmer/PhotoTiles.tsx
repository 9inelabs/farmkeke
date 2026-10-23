// Thumbnails for uploaded and uploading photos, plus the camera primer (F-06a).
import { Image } from "expo-image";
import { Camera, Close, ImageAdd, Undo } from "@/components/icons";
import { Pressable, StyleSheet, View } from "react-native";
import { BottomSheet, Button, Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import type { PendingUpload } from "./usePhotoUploads";

const SIZE = 96;

export function UploadedTile({
  url,
  label,
  onRemove,
  flagged,
}: {
  url: string | null;
  label: string;
  onRemove?: () => void;
  flagged?: boolean;
}) {
  return (
    <View style={[styles.tile, flagged && styles.flagged]}>
      {url ? <Image source={{ uri: url }} style={styles.image} contentFit="cover" accessibilityLabel={label} /> : null}
      {onRemove !== undefined && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={8} onPress={onRemove} style={styles.remove}>
          <Close size={14} color={colors.white} strokeWidth={3} />
        </Pressable>
      )}
    </View>
  );
}

export function PendingTile({ item, onRetry, onDiscard }: { item: PendingUpload; onRetry: () => void; onDiscard: () => void }) {
  return (
    <View style={styles.tile} accessibilityLabel={item.failed ? "Upload failed" : `Uploading, ${Math.round(item.progress * 100)} percent`}>
      <Image source={{ uri: item.uri }} style={[styles.image, styles.dim]} contentFit="cover" />
      {item.failed ? (
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Try the upload again" onPress={onRetry} style={styles.retry}>
            <Undo size={16} color={colors.forest} />
            <Text variant="small" color={colors.forest}>
              Retry
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Discard this photo" hitSlop={8} onPress={onDiscard} style={styles.remove}>
            <Close size={14} color={colors.white} strokeWidth={3} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(8, item.progress * 100)}%` }]} />
        </View>
      )}
    </View>
  );
}

/** Take photo / Choose from gallery buttons. */
export function AddPhotoButtons({ onCamera, onLibrary, compact }: { onCamera: () => void; onLibrary: () => void; compact?: boolean }) {
  return (
    <View style={styles.buttons}>
      <Button label="Take photo" icon={Camera} variant="secondary" size={compact ? "small" : "default"} onPress={onCamera} />
      <Button label="Choose from gallery" icon={ImageAdd} variant="ghost" size={compact ? "small" : "default"} onPress={onLibrary} />
    </View>
  );
}

/** F-06a: explain before the phone's camera prompt. */
export function CameraPrimer({
  visible,
  onAllow,
  onGallery,
  onClose,
}: {
  visible: boolean;
  onAllow: () => void;
  onGallery: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.primer}>
        <View style={styles.primerIcon}>
          <Camera size={26} color={colors.forest} />
        </View>
        <Text variant="heading" align="center">
          Let Farmkeke use your camera
        </Text>
        <Text variant="caption" align="center">
          So you can photograph your documents and your farm right here. We only use the camera when you tap Take photo.
        </Text>
      </View>
      <Button label="Allow camera" fullWidth onPress={onAllow} />
      <Button label="Choose from gallery instead" variant="ghost" fullWidth onPress={onGallery} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  tile: { width: SIZE, height: SIZE, borderRadius: radii.md, backgroundColor: colors.placeholder, overflow: "hidden" },
  flagged: { borderWidth: 2, borderColor: colors.error },
  image: { width: "100%", height: "100%" },
  dim: { opacity: 0.6 },
  remove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(26,26,26,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  progressTrack: { position: "absolute", left: 8, right: 8, bottom: 8, height: 4, borderRadius: 2, backgroundColor: colors.white },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.lime },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  primer: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  primerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
});
