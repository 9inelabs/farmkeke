// F-26 Listing submitted: live now (trusted farm) or under review.
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, Clock } from "@/components/icons";
import { Button, StatusScreen } from "@/components/ui";

export default function ListingSubmitted() {
  const { id, status } = useLocalSearchParams<{ id: string; status?: string }>();
  const live = status === "live";
  return (
    <StatusScreen
      icon={live ? CheckCircle : Clock}
      tone={live ? "success" : "pending"}
      title={live ? "Your listing is live" : "Sent for review"}
      message={
        live
          ? "Buyers can see it on the app and farmkeke.com now."
          : "Farmkeke checks new listings within a day. You'll see it under Live once it's approved."
      }
      actions={
        <>
          <Button label="Back to listings" fullWidth onPress={() => router.dismissTo("/listings")} />
          <Button label="View listing" variant="ghost" fullWidth onPress={() => router.replace(`/listing/${id}`)} />
        </>
      }
    />
  );
}
