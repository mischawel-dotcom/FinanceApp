import React from "react";

interface AppErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (typeof console !== "undefined" && console.error) {
      console.error("AppErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 400, margin: "80px auto", padding: 24, border: "1px solid #e57373", borderRadius: 12, background: "#fff0f0", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#b71c1c", marginBottom: 12 }}>Etwas ist schiefgelaufen</div>
          {this.state.message && (
            <div style={{ color: "#b71c1c", marginBottom: 16, fontSize: 15 }}>{this.state.message}</div>
          )}
          <button onClick={this.handleReload} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #b71c1c", background: "#fff", color: "#b71c1c", fontWeight: 600, cursor: "pointer" }}>
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
