"use client";

// Renders nothing if its children throw, for small optional sections that
// call a backend function the live deployment may not have yet (Phase 5
// functions before the owner deploys). The rest of the page keeps working.
import { Component, type ReactNode } from "react";

export class QuietBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
