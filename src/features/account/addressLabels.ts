import { Briefcase, Home, MapPin } from "lucide-react-native";

export const ADDRESS_LABELS = { home: "Home", work: "Work", other: "Other" } as const;
export const ADDRESS_ICONS = { home: Home, work: Briefcase, other: MapPin } as const;
export type AddressLabel = keyof typeof ADDRESS_LABELS;
