// F-48 Problem report, farm side (from /farm-dispute/<id> notifications).
// The layout is DisputeView.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Flag } from "@/components/icons";
import { Button, ScreenHeader, Skeleton, StatusScreen } from "@/components/ui";
import { DisputeView } from "@/features/farm/DisputeView";
import { useNow } from "@/lib/useNow";
import { showToast } from "@/store/toast";
import { colors, radii, spacing } from "@/theme/tokens";

// Convex ids are lowercase letters and digits; anything else can't be a case
const looksLikeId = (s: string | undefined) => s !== undefined && /^[0-9a-z]{20,40}$/.test(s);

function Missing() {
  return (
    <StatusScreen
      icon={Flag}
      tone="pending"
      header={<ScreenHeader title="Problem report" />}
      title="We couldn't open this case"
      message="It may be about another farm's order."
      actions={<Button label="See your orders" variant="dark" size="large" pill fullWidth onPress={() => router.replace("/sales")} />}
    />
  );
}

// A link to another kind of record fails the query's id check; show the same screen
export function ErrorBoundary() {
  return <Missing />;
}

export default function FarmDispute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const valid = looksLikeId(id);
  const found = useQuery(api.disputes.get, valid ? { disputeId: id as Id<"disputes"> } : "skip");
  const d = valid ? found : null;
  const respond = useMutation(api.disputes.respond);
  const send = useMutation(api.disputes.sendMessage);
  const markRead = useMutation(api.disputes.markRead);
  const generateUploadUrl = useMutation(api.disputes.generateUploadUrl);
  const now = useNow();

  const mine = d && d.as === "farmer" ? d : null;
  const unread = mine?.unread === true;
  useEffect(() => {
    if (mine && unread) void markRead({ as: "farmer", disputeId: mine._id }).catch(() => undefined);
  }, [mine, unread, markRead]);

  if (d === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <ScreenHeader title="Problem report" />
        <View style={{ paddingHorizontal: spacing.screen, gap: spacing.md }}>
          <Skeleton height={150} radius={radii.lg + 10} />
          <Skeleton height={220} radius={radii.lg + 4} />
        </View>
      </SafeAreaView>
    );
  }
  if (mine === null) return <Missing />;

  return (
    <DisputeView
      d={mine}
      now={now}
      generateUploadUrl={() => generateUploadUrl({})}
      onRespond={async (stance, note, photoIds) => {
        await respond({ disputeId: mine._id, stance, note, photoIds: photoIds as Id<"_storage">[] });
        showToast({ message: "Reply sent to Farmkeke" });
      }}
      onSend={(body, photoIds) => send({ as: "farmer", disputeId: mine._id, body, photoIds: photoIds as Id<"_storage">[] })}
    />
  );
}
