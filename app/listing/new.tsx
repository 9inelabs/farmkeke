// F-20 "Add listing": creates a draft and opens its first step.
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Info } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button, StatusScreen } from "@/components/ui";
import { errorCode, errorMessage } from "@/lib/errors";
import { colors } from "@/theme/tokens";

export default function NewListing() {
  const createDraft = useMutation(api.listings.createDraft);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createDraft({})
      .then((id) => router.replace(`/listing/${id}/photos`))
      .catch((e: unknown) =>
        setError(errorCode(e) === "FARM_SUSPENDED" ? "Selling is paused on your farm, so you can't add listings right now." : errorMessage(e)),
      );
  }, [createDraft]);

  if (error !== null) {
    return (
      <StatusScreen
        icon={Info}
        tone="error"
        title="Couldn't start a listing"
        message={error}
        actions={<Button label="Back to listings" fullWidth onPress={() => router.back()} />}
      />
    );
  }
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
      <ActivityIndicator color={colors.lime} />
    </View>
  );
}
