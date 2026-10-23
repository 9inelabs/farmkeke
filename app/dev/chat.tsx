// A sample conversation drawn with the real chat thread, to check it in the
// browser preview. Messages you send stay on this screen; nothing reaches the
// backend.
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader, Text } from "@/components/ui";
import { ChatThread, type ChatMessage } from "@/features/chat/ChatThread";
import { colors, radii, spacing } from "@/theme/tokens";

const now = Date.now();
const M = 60_000;
const START: ChatMessage[] = [
  { _id: "6", mine: false, body: "Yes! We'll pack them separately so they don't get crushed. The rider leaves at 2pm.", photos: [], at: now - 3 * M, authorName: "Okafor Family Farms" },
  { _id: "5", mine: true, body: "Great. Can you pack the tomatoes away from the yams?", photos: [], at: now - 6 * M, read: true },
  { _id: "4", mine: false, body: "Good morning Ada, your order is packed and ready.", photos: [], at: now - 40 * M, authorName: "Okafor Family Farms" },
  { _id: "3", mine: false, body: "Hi Ada, I'm looking into this for you. The farm has until 6pm to reply.", photos: [], at: now - 26 * 60 * M, authorName: "Farmkeke support", staff: true },
  { _id: "2", mine: true, body: "Two of the tomatoes were crushed when the basket arrived.", photos: [], at: now - 27 * 60 * M, read: true },
];

export default function ChatSample() {
  const [messages, setMessages] = useState(START);
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Okafor Family Farms" />
      <ChatThread
        messages={messages}
        loading={false}
        header={
          <View style={styles.card}>
            <Text variant="label">FK-10234 · Fresh tomatoes basket × 2 + 1 more</Text>
            <Text variant="small">Out for delivery · ₦12,900</Text>
          </View>
        }
        canSend
        placeholder="Message Okafor Family Farms"
        maxPhotos={4}
        generateUploadUrl={async () => {
          throw new Error("Sample only");
        }}
        onSend={async (body) => {
          setMessages((m) => [{ _id: String(Date.now()), mine: true, body, photos: [], at: Date.now() }, ...m]);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, gap: 2 },
});
