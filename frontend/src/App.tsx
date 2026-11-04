import { lazy, Suspense } from "react";
import { AppStateProvider } from "./state/AppState";
import { AppShell } from "./components/layout/AppShell";
import { TopBar } from "./components/layout/TopBar";
import { RepoExplorer } from "./components/repo-explorer/RepoExplorer";
import { RightPanel } from "./components/layout/RightPanel";
import { LoadingState } from "./components/common/StateViews";

// Cytoscape + fcose are the single largest dependency in this app (~250KB
// gzipped) — code-split so the shell/sidebar paint immediately and the
// canvas streams in, rather than blocking the whole app behind one bundle.
const GraphCanvas = lazy(() => import("./components/graph-canvas/GraphCanvas").then((m) => ({ default: m.GraphCanvas })));

const DEFAULT_REPO = import.meta.env.VITE_DEFAULT_REPO ?? "pallets/flask";

function App() {
  return (
    <AppStateProvider repo={DEFAULT_REPO}>
      <AppShell
        topBar={<TopBar />}
        sidebar={<RepoExplorer />}
        canvas={
          <Suspense
            fallback={
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LoadingState label="Loading graph engine…" />
              </div>
            }
          >
            <GraphCanvas />
          </Suspense>
        }
        rightPanel={<RightPanel />}
      />
    </AppStateProvider>
  );
}

export default App;
