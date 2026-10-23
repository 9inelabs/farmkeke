// The selling row in Account (M-80): Sell on Farmkeke, where an application
// stands (F-09a, F-09b, F-09d, F-09e), or Switch to farmer mode once approved
// (F-13). One row, so it sits in the "Account Management" group.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { Clock, CloseCircle, DocumentAlert, Shop, Sprout } from "@/components/icons";
import { Avatar, ListRow, Skeleton } from "@/components/ui";
import { nextStepPath } from "./constants";
import { SwitchModeSheet } from "./SwitchModeSheet";

const SECTIONS = 2;

export function SellingEntry() {
  const application = useQuery(api.farmerApplications.mine);
  const farm = useQuery(api.farms.mine);
  const [switching, setSwitching] = useState(false);

  if (application === undefined || farm === undefined) return <Skeleton height={56} radius={0} />;

  if (farm !== null) {
    return (
      <>
        <ListRow
          icon={Shop}
          title="Switch to farmer mode"
          subtitle={farm.name}
          trailing={farm.photoUrl ? <Image source={{ uri: farm.photoUrl }} style={styles.avatar} contentFit="cover" /> : <Avatar name={farm.name} size={28} />}
          onPress={() => setSwitching(true)}
        />
        <SwitchModeSheet visible={switching} onClose={() => setSwitching(false)} />
      </>
    );
  }
  if (application === null) {
    return <ListRow icon={Sprout} title="Sell on Farmkeke" subtitle="Apply as a farmer" onPress={() => router.push("/sell")} />;
  }
  const done = SECTIONS - Object.keys(application.problems).length;
  const rows = {
    draft: { icon: Sprout, title: "Continue your application", subtitle: `${done} of ${SECTIONS} parts done`, path: nextStepPath(application.problems) },
    submitted: { icon: Clock, title: "Application under review", subtitle: application.reference ? `Reference ${application.reference}` : "Usually 2 working days", path: "/sell/status" },
    more_info: { icon: DocumentAlert, title: "Farmkeke needs more information", subtitle: "Update and resubmit", path: "/sell/status" },
    rejected: { icon: CloseCircle, title: "Application not approved", subtitle: "See why", path: "/sell/status" },
    approved: { icon: Shop, title: "You're approved", subtitle: "Open farmer mode", path: "/sell/status" },
  } as const;
  const row = rows[application.status];
  return <ListRow icon={row.icon} title={row.title} subtitle={row.subtitle} onPress={() => router.push(row.path)} />;
}

const styles = StyleSheet.create({
  avatar: { width: 28, height: 28, borderRadius: 14 },
});
