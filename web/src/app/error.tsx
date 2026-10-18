"use client";

// W-S2 Something went wrong: any page that fails while rendering, below the
// root layout (so providers, fonts and global pieces still work).
import { useEffect } from "react";
import { ErrorView } from "@/components/system/ErrorView";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorView error={error} retry={retry} />;
}
