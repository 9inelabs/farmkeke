// The message list and composer shared by order chat (M-74), the problem
// case (M-69) and support (M-91). Newest messages sit at the bottom; older
// ones load as you scroll up. Photos open full screen.
//
// Look (APK #4 redesign, approved 22 Nov 2026): the other side's messages in
// white bubbles on the left, yours in lime on the right, day dividers with
// thin lines, and a bottom bar with attach, a rounded field and a round send.
//
// Keyboard: the bottom bar rises above the phone's keyboard and returns to
// the bottom when it closes. Android draws edge to edge (SDK 57), so the
// window no longer shrinks for the keyboard and app.json's
// softwareKeyboardLayoutMode "resize" alone does nothing; Expo's keyboard
// guide uses KeyboardAvoidingView with behavior "padding" on both platforms,
// which works here because every chat screen fills the window and this view
// sits at its bottom. While the keyboard is up the bar drops the home
// indicator / navigation bar padding, which the keyboard already covers.
import { Image } from "expo-image";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Send } from "@/components/icons";
import { Text } from "@/components/ui";
import { PhotoViewer } from "@/features/shop/PhotoViewer";
import { dayLabel, hm, lagosDay } from "@/features/orders/format";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { AttachmentStrip } from "./AttachmentStrip";
import { chatPalette } from "./palette";
import { Paperclip } from "./Paperclip";
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

/** Whether the phone's keyboard is up (iPhone says so as it starts to move; Android once it's shown). */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () => setOpen(true));
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayDivider(at: number) {
  const day = lagosDay(at);
  if (day === lagosDay(Date.now())) return "TODAY";
  if (day === lagosDay(Date.now() - DAY_MS)) return "YESTERDAY";
  return dayLabel(at).toUpperCase();
}

export function ChatThread(props: Props) {
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
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
          <View style={styles.day}>
            <View style={styles.dayLine} />
            <Text style={styles.dayText}>{dayDivider(item.at)}</Text>
            <View style={styles.dayLine} />
          </View>
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
              <Text style={[styles.body, item.mine && styles.bodyMine]} selectable>
                {item.body}
              </Text>
            ) : null}
            <View style={styles.meta}>
              <Text style={[styles.time, item.mine && styles.timeMine]}>{hm(item.at)}</Text>
              {item.mine && item.read ? <Check size={12} color={colors.forest} strokeWidth={2.5} accessibilityLabel="Read" /> : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior="padding">
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
        <View style={[styles.composer, { paddingBottom: keyboardOpen ? spacing.sm : Math.max(insets.bottom, spacing.sm) }]}>
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
              <Paperclip size={21} color={colors.forest} />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={props.placeholder ?? "Type a message…"}
              placeholderTextColor={colors.inkMuted}
              multiline
              maxLength={2000}
              style={styles.input}
              accessibilityLabel="Message"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={!ready || sending} onPress={() => void send()} style={[styles.send, (!ready || sending) && styles.disabled]}>
              {sending ? <ActivityIndicator color={colors.lime} size="small" /> : <Send size={20} color={colors.lime} variant="solid" />}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.closed, { paddingBottom: keyboardOpen ? spacing.md : Math.max(insets.bottom, spacing.md) }]}>
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
  day: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.md, paddingHorizontal: spacing.lg },
  dayLine: { flex: 1, height: borders.hairline, backgroundColor: chatPalette.line },
  dayText: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.6, color: colors.inkMuted },
  bubbleRow: { maxWidth: "78%", marginVertical: 2 },
  mineRow: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirsRow: { alignSelf: "flex-start", alignItems: "flex-start" },
  author: { marginBottom: 2, marginLeft: spacing.xs, fontFamily: fonts.medium },
  bubble: { borderRadius: 18, paddingTop: 10, paddingHorizontal: 13, paddingBottom: 7, gap: 3 },
  mine: { backgroundColor: colors.lime, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.white, borderBottomLeftRadius: 6, borderWidth: borders.hairline, borderColor: chatPalette.line },
  staff: { backgroundColor: colors.tint, borderBottomLeftRadius: 6, borderWidth: borders.hairline, borderColor: colors.lime },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  bodyMine: { color: colors.forestDeep },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  photo: { width: 120, height: 120, borderRadius: radii.md },
  meta: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 3 },
  time: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 14, color: colors.inkMuted },
  timeMine: { color: chatPalette.timeOnLime },
  composer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm, backgroundColor: colors.white, borderTopWidth: borders.hairline, borderTopColor: chatPalette.line },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  attach: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: chatPalette.inputFill,
    borderWidth: borders.hairline,
    borderColor: chatPalette.inputBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  closed: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, backgroundColor: colors.white, borderTopWidth: borders.hairline, borderTopColor: chatPalette.line },
});
