// The message list and composer shared by order chat (M-74), the problem
// case (M-69) and support (M-91). Newest messages sit at the bottom; older
// ones load as you scroll up. Photos open full screen.
import { Image } from "expo-image";
import { useRef, useState, type ReactElement } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ImageAdd, Send } from "@/components/icons";
import { Text } from "@/components/ui";
import { PhotoViewer } from "@/features/shop/PhotoViewer";
import { dayLabel, hm, lagosDay } from "@/features/orders/format";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { AttachmentStrip } from "./AttachmentStrip";
import { useAttachments } from "./useAttachments";

export type ChatMessage = {
  _id: string;
  mine: boolean;
  body: string;
  photos: string[];
  at: number;
  /** "Farmkeke support", "Okafor Farms": shown above messages that aren't mine */
  authorName?: string | null;
  /** Read by the other side (my messages only) */
  read?: boolean;
  /** Staff messages are tinted */
  staff?: boolean;
};

type Props = {
  /** Newest first */
  messages: ChatMessage[];
  loading: boolean;
  onLoadMore?: () => void;
  /** Shown above the first message (an order summary, the case details) */
  header?: ReactElement | null;
  empty?: string;
  /** Open on the header (case details) instead of the newest message */
  startAtTop?: boolean;
  canSend: boolean;
  closedNote?: string;
  placeholder?: string;
  maxPhotos: number;
  generateUploadUrl: () => Promise<string>;
  /** Throws to keep the draft (the error is shown) */
  onSend: (body: string, photoIds: string[]) => Promise<void>;
};

export function ChatThread(props: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ photos: string[]; start: number } | null>(null);
  const attachments = useAttachments(props.generateUploadUrl, props.maxPhotos);
  const list = useRef<FlatList<ChatMessage>>(null);
  const opened = useRef(false);
  const ready = (text.trim().length > 0 || attachments.ids.length > 0) && !attachments.uploading && !attachments.failed;

  const send = async () => {
    if (!ready || sending) return;
    setSending(true);
    setError(null);
    try {
      await props.onSend(text.trim(), attachments.ids);
      setText("");
      attachments.clear();
    } catch (e) {
      setError(e instanceof Error && /RATE_LIMITED/.test(String((e as { data?: unknown }).data ?? e.message)) ? "You're sending a lot. Wait a moment, then try again." : "That didn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  // Inverted list: index 0 is the newest. A day label goes above the first message of each day.
  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const older = props.messages[index + 1];
    const newDay = !older || lagosDay(older.at) !== lagosDay(item.at);
    const showAuthor = !item.mine && item.authorName && (!older || older.mine || older.authorName !== item.authorName || newDay);
    return (
      <View>
        {newDay ? (
          <Text variant="small" align="center" style={styles.day}>
            {lagosDay(item.at) === lagosDay(Date.now()) ? "Today" : dayLabel(item.at)}
          </Text>
        ) : null}
        <View style={[styles.bubbleRow, item.mine ? styles.mineRow : styles.theirsRow]}>
          {showAuthor ? (
            <Text variant="small" color={item.staff ? colors.forest : colors.inkMuted} style={styles.author}>
              {item.authorName}
            </Text>
          ) : null}
          <View style={[styles.bubble, item.mine ? styles.mine : item.staff ? styles.staff : styles.theirs]}>
            {item.photos.length > 0 ? (
              <View style={styles.photos}>
                {item.photos.map((uri, i) => (
                  <Pressable key={uri} accessibilityRole="imagebutton" accessibilityLabel="Open photo" onPress={() => setViewer({ photos: item.photos, start: i })}>
                    <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {item.body ? (
              <Text variant="body" color={item.mine ? colors.white : colors.ink} selectable>
                {item.body}
              </Text>
            ) : null}
            <View style={styles.meta}>
              <Text variant="small" color={item.mine ? "rgba(255,255,255,0.7)" : colors.inkMuted} style={styles.time}>
                {hm(item.at)}
              </Text>
              {item.mine && item.read ? <Check size={12} color={colors.lime} strokeWidth={2.5} /> : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        ref={list}
        inverted
        data={props.messages}
        // Inverted: the end of the list is the top of the screen
        onContentSizeChange={() => {
          if (!props.startAtTop || opened.current) return;
          opened.current = true;
          list.current?.scrollToEnd({ animated: false });
        }}
        keyExtractor={(m) => m._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onEndReached={props.onLoadMore}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        // Inverted: the "footer" is drawn at the top
        ListFooterComponent={
          <View style={styles.headerWrap}>
            {props.header}
            {props.loading ? <ActivityIndicator color={colors.forest} style={styles.loading} /> : null}
            {!props.loading && props.messages.length === 0 && props.empty ? (
              <Text variant="caption" align="center" style={styles.empty}>
                {props.empty}
              </Text>
            ) : null}
          </View>
        }
      />
      {props.canSend ? (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          {attachments.items.length > 0 ? (
            <AttachmentStrip items={attachments.items} onRemove={attachments.remove} onRetry={attachments.retry} full size={56} />
          ) : null}
          {error ? (
            <Text variant="small" color={colors.error}>
              {error}
            </Text>
          ) : null}
          <View style={styles.inputRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach a photo"
              disabled={attachments.full}
              onPress={() => void attachments.add()}
              style={[styles.attach, attachments.full && styles.disabled]}
            >
              <ImageAdd size={22} color={colors.forest} />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={props.placeholder ?? "Write a message"}
              placeholderTextColor={colors.inkMuted}
              multiline
              maxLength={2000}
              style={styles.input}
              accessibilityLabel="Message"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={!ready || sending} onPress={() => void send()} style={[styles.send, (!ready || sending) && styles.disabled]}>
              {sending ? <ActivityIndicator color={colors.forest} size="small" /> : <Send size={20} color={colors.forest} variant="solid" />}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.closed, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Text variant="caption" align="center">
            {props.closedNote ?? "This conversation is closed."}
          </Text>
        </View>
      )}
      <PhotoViewer photos={viewer?.photos ?? []} start={viewer?.start ?? null} name="Photo" onClose={() => setViewer(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: spacing.screen, paddingVertical: spacing.md, gap: spacing.xs },
  headerWrap: { gap: spacing.md, paddingBottom: spacing.md },
  loading: { marginVertical: spacing.md },
  empty: { paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  day: { marginVertical: spacing.md },
  bubbleRow: { maxWidth: "82%", marginVertical: 2 },
  mineRow: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirsRow: { alignSelf: "flex-start", alignItems: "flex-start" },
  author: { marginBottom: 2, marginLeft: spacing.xs, fontFamily: fonts.medium },
  bubble: { borderRadius: radii.lg + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  mine: { backgroundColor: colors.forest, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.white, borderBottomLeftRadius: 6 },
  staff: { backgroundColor: colors.tint, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.lime },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  photo: { width: 120, height: 120, borderRadius: radii.md },
  meta: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 3 },
  time: { fontSize: 11 },
  composer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  attach: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  closed: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
});
