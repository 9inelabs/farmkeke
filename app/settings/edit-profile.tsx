// M-82 Edit profile. Premium redesign (APK #10, Nov 2026): the deep green
// header of the Account screen with a large avatar (your photo or initials)
// and Change photo (take, choose or remove), then white cards: your name
// (the only thing edited here), your email and phone with links to Login
// details, and when you joined. Photo changes save at once; Save is for the
// name and only lights up when it changed.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar, Camera, Check, Image as GalleryIcon, Mail, Phone, Trash, type IconComponent } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { ForestBackdrop, Glass } from "@/components/premium";
import { BackIcon, BottomSheet, Button, ListGroup, ListRow, Notice, Skeleton, Text, TextField } from "@/components/ui";
import { initials } from "@/components/ui/Avatar";
import { useAccount } from "@/features/account/useAccount";
import { errorCode, errorMessage } from "@/lib/errors";
import { preparePhoto, uploadFile } from "@/lib/upload";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useLightStatusBar } from "@/theme/useLightStatusBar";

const AVATAR = 104;
// A profile photo is shown small, so 640px square is plenty
const PHOTO_SIZE = 640;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PHOTO_ERRORS: Record<string, string> = {
  UPLOAD_NOT_IMAGE: "That file isn't a photo. Choose a JPEG or PNG picture.",
  UPLOAD_TOO_LARGE: "That photo is too large. Choose a smaller one.",
  UPLOAD_MISSING: "The photo didn't finish uploading. Try again.",
  RATE_LIMITED: "You've changed your photo a lot in the last hour. Try again later.",
};

/** "Member since November 2026", in Lagos time. */
function memberSince(ms: number): string {
  const lagos = new Date(ms + 60 * 60_000);
  return `${MONTHS[lagos.getUTCMonth()]} ${lagos.getUTCFullYear()}`;
}

/** A square crop from the camera or gallery, or null if cancelled. */
async function pickSquare(source: "camera" | "library"): Promise<string | null | "denied"> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], shape: "oval", quality: 0.8 };
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return "denied";
    const result = await ImagePicker.launchCameraAsync(options);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }
  const result = await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

/** Shrinks the cropped photo to at most 640px as JPEG, so it uploads quickly on mobile data. */
async function shrink(uri: string): Promise<string> {
  // The browser preview resizes on a canvas (see lib/upload)
  if (Platform.OS === "web") return await preparePhoto(uri);
  let image = await ImageManipulator.ImageManipulator.manipulate(uri).renderAsync();
  if (image.width > PHOTO_SIZE) {
    const context = ImageManipulator.ImageManipulator.manipulate(uri);
    context.resize({ width: PHOTO_SIZE });
    image = await context.renderAsync();
  }
  const saved = await image.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.75 });
  return saved.uri;
}

export default function EditProfile() {
  useLightStatusBar();
  const insets = useSafeAreaInsets();
  const viewer = useAccount();
  const updateProfile = useMutation(api.account.updateProfile);
  const generateUploadUrl = useMutation(api.profilePhoto.generateUploadUrl);
  const setPhoto = useMutation(api.profilePhoto.set);
  const removePhoto = useMutation(api.profilePhoto.remove);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  // The photo being uploaded (shown at once), its progress, and how it went
  const [pending, setPending] = useState<{ uri: string; progress: number } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [photoNote, setPhotoNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (viewer?.name) setName(viewer.name);
  }, [viewer?.name]);

  const changed = viewer !== undefined && name.trim() !== (viewer.name ?? "");

  const save = async () => {
    if (name.trim().length === 0) {
      setNameError("Enter your full name.");
      return;
    }
    setBusy(true);
    setSaveError(null);
    try {
      await updateProfile({ name: name.trim() });
      router.back();
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const choose = async (source: "camera" | "library") => {
    setSheet(false);
    setPhotoNote(null);
    let picked: string | null | "denied";
    try {
      picked = await pickSquare(source);
    } catch {
      setPhotoNote({ tone: "error", text: "Couldn't open your photos. Try again." });
      return;
    }
    if (picked === "denied") {
      setPhotoNote({ tone: "error", text: "Farmkeke can't use your camera. Allow it in your phone's settings, or choose from your gallery." });
      return;
    }
    if (picked === null) return;
    setPending({ uri: picked, progress: 0 });
    try {
      const small = await shrink(picked);
      setPending({ uri: small, progress: 0 });
      const url = await generateUploadUrl();
      const storageId = await uploadFile(url, small, (progress) => setPending({ uri: small, progress }));
      await setPhoto({ storageId: storageId as Id<"_storage"> });
      setPhotoNote({ tone: "success", text: "Profile photo updated." });
    } catch (e) {
      const code = errorCode(e);
      setPhotoNote({ tone: "error", text: (code !== null && PHOTO_ERRORS[code]) || errorMessage(e) });
    } finally {
      setPending(null);
    }
  };

  const remove = async () => {
    setSheet(false);
    setPhotoNote(null);
    setRemoving(true);
    try {
      await removePhoto({});
      setPhotoNote({ tone: "success", text: "Profile photo removed." });
    } catch (e) {
      setPhotoNote({ tone: "error", text: errorMessage(e) });
    } finally {
      setRemoving(false);
    }
  };

  const photoBusy = pending !== null || removing;
  const shownPhoto = pending?.uri ?? (removing ? null : (viewer?.photoUrl ?? null));
  const displayName = name.trim() || viewer?.name || "Your account";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <ForestBackdrop />
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/account"))}
            >
              <Glass style={styles.back}>
                <BackIcon color={colors.white} />
              </Glass>
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              Edit profile
            </Text>
          </View>

          {viewer === undefined ? (
            <View style={styles.identity}>
              <View style={[styles.avatar, styles.avatarLoading]} />
              <View style={styles.loadingBar} />
              <View style={[styles.loadingBar, styles.loadingBarShort]} />
            </View>
          ) : (
            <View style={styles.identity}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={viewer.photoUrl ? "Change profile photo" : "Add a profile photo"}
                disabled={photoBusy}
                onPress={() => setSheet(true)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.avatar}>
                  {shownPhoto ? (
                    <Image source={{ uri: shownPhoto }} style={styles.avatarPhoto} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />
                  ) : (
                    <Text style={styles.avatarText}>{initials(displayName)}</Text>
                  )}
                  {photoBusy ? (
                    <View style={styles.avatarBusy}>
                      <ActivityIndicator color={colors.white} />
                      {pending !== null && pending.progress > 0 ? <Text style={styles.avatarBusyText}>{Math.round(pending.progress * 100)}%</Text> : null}
                    </View>
                  ) : null}
                </View>
                <View style={styles.badge}>
                  <Camera size={15} color={colors.forestDeep} />
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={photoBusy} hitSlop={6} onPress={() => setSheet(true)} style={({ pressed }) => [styles.changePill, pressed && styles.pressed]}>
                <Text style={styles.changeText}>{pending !== null ? "Uploading…" : removing ? "Removing…" : viewer.photoUrl ? "Change photo" : "Add photo"}</Text>
              </Pressable>
              <Text numberOfLines={1} style={styles.name}>
                {displayName}
              </Text>
              {viewer.email || viewer.phone ? (
                <Text numberOfLines={1} style={styles.contact}>
                  {[viewer.email, viewer.phone].filter(Boolean).join("  ·  ")}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {viewer === undefined ? (
            <>
              <Skeleton height={120} radius={radii.lg + 2} />
              <Skeleton height={130} radius={radii.lg + 2} />
            </>
          ) : (
            <Stagger>
              {photoNote !== null ? <Notice tone={photoNote.tone === "error" ? "error" : "brand"} icon={photoNote.tone === "error" ? undefined : Check}>{photoNote.text}</Notice> : null}

              <Section title="Personal details">
                <View style={styles.card}>
                  <TextField
                    label="Full name"
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      setNameError(null);
                      setSaveError(null);
                    }}
                    error={nameError}
                    helper="Your name on your account and your orders."
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    maxLength={80}
                    returnKeyType="done"
                  />
                </View>
              </Section>

              <Section title="Contact and sign-in">
                <View style={styles.card0}>
                  <InfoRow icon={Mail} label="Email" value={viewer.email} empty="No email added" link />
                  <View style={styles.divider} />
                  <InfoRow icon={Phone} label="Phone" value={viewer.phone} empty="No phone number added" link />
                </View>
              </Section>

              <Section title="Account">
                <View style={styles.card0}>
                  <InfoRow icon={Calendar} label="Member since" value={memberSince(viewer.memberSince)} />
                </View>
              </Section>

              {saveError !== null ? <Notice tone="error">{saveError}</Notice> : null}
            </Stagger>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Save changes" fullWidth loading={busy} disabled={!changed || photoBusy} onPress={() => void save()} />
      </View>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
        <Text variant="heading">Profile photo</Text>
        <Text variant="caption">Farmers you order from can see it in your chats.</Text>
        <ListGroup>
          <ListRow icon={Camera} title="Take photo" onPress={() => void choose("camera")} />
          <ListRow icon={GalleryIcon} title="Choose from library" onPress={() => void choose("library")} />
          {viewer?.photoUrl ? <ListRow icon={Trash} title="Remove photo" tone="danger" onPress={() => void remove()} /> : null}
        </ListGroup>
        <Button label="Cancel" variant="ghost" fullWidth onPress={() => setSheet(false)} />
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="small" color={colors.inkMuted} style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** A read-only line in a card: tint icon square, label and value, and optionally "Change in Login details". */
function InfoRow({ icon: Icon, label, value, empty, link = false }: { icon: IconComponent; label: string; value: string | null; empty?: string; link?: boolean }) {
  const body = (
    <>
      <View style={styles.icon}>
        <Icon size={17} color={colors.forest} />
      </View>
      <View style={styles.flex}>
        <Text variant="small">{label}</Text>
        <Text variant="bodyMedium" color={value ? colors.ink : colors.inkMuted} numberOfLines={1}>
          {value ?? empty ?? ""}
        </Text>
        {link ? <Text style={styles.link}>Change in Login details</Text> : null}
      </View>
    </>
  );
  if (!link) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value ?? empty ?? ""}. Change in Login details`}
      onPress={() => router.push("/settings/login-details")}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {body}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: spacing.xxl },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  pressed: { opacity: 0.85 },
  // Header
  header: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", gap: spacing.lg },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  back: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: colors.white },
  identity: { alignItems: "center", gap: spacing.xs },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: "rgba(169, 214, 84, 0.16)",
    borderWidth: 2,
    borderColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarLoading: { borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.08)" },
  avatarPhoto: { width: "100%", height: "100%" },
  avatarText: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 44, color: colors.lime },
  avatarBusy: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(11, 26, 7, 0.55)", alignItems: "center", justifyContent: "center", gap: 2 },
  avatarBusyText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.white },
  badge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lime,
    borderWidth: 3,
    borderColor: colors.forestMid,
    alignItems: "center",
    justifyContent: "center",
  },
  changePill: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md + 2,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: borders.hairline,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
  },
  changeText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.lime },
  name: { marginTop: spacing.xs, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: colors.white, maxWidth: "100%" },
  contact: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.onForest, maxWidth: "100%" },
  loadingBar: { width: 160, height: 18, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)", marginTop: spacing.xs },
  loadingBarShort: { width: 110, height: 12 },
  // Body
  content: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { fontFamily: fonts.medium, paddingHorizontal: 2 },
  card: { borderRadius: radii.lg + 2, backgroundColor: colors.white, padding: spacing.md + 2 },
  card0: { borderRadius: radii.lg + 2, backgroundColor: colors.white, overflow: "hidden", paddingVertical: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.md, minHeight: 58 },
  rowPressed: { backgroundColor: "rgba(0,0,0,0.035)" },
  divider: { height: borders.hairline, backgroundColor: "#F0F1EE", marginLeft: spacing.md + 2 + 34 + spacing.md },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  link: { marginTop: 2, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.limeInk },
  footer: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, backgroundColor: colors.canvas },
});
