"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; resetKey: number };

/**
 * Catches React rendering / commit-phase errors thrown anywhere in the
 * children and resets the subtree on demand.
 *
 * Used to recover from "u is not a function" crashes that some third-party
 * effects throw on certain commit transitions — the child unmounts + remounts
 * with a fresh key, which clears the broken effect list without losing the
 * rest of the app.
 */
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error("[ai-flow] editor crashed, recovering:", error, info);
  }

  reset = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  override render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm font-semibold text-destructive">
            The editor hit a recoverable error.
          </p>
          <button
            onClick={this.reset}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reset editor
          </button>
        </div>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
