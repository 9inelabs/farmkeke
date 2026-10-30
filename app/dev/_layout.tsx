// The sample and preview screens under /dev are for building the app only.
// A release build sends any /dev link (typed, deep-linked or left over) home.
import { Redirect, Slot } from "expo-router";

export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Slot />;
}
