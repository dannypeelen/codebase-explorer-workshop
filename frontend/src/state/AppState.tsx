import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { EdgeType, NodeType } from "../types/graph";
import { EDGE_TYPES, NODE_TYPES } from "../domain/taxonomy";

export type LayoutName = "fcose" | "breadthfirst" | "concentric" | "circle" | "grid";

interface AppState {
  repo: string;
  selectedNodeId: string | null;
  focusNodeId: string | null; // last node explicitly centered/expanded from — the canvas's "home"
  visibleNodeTypes: ReadonlySet<NodeType>;
  visibleEdgeTypes: ReadonlySet<EdgeType>;
  layout: LayoutName;
  impactNodeId: string | null;
  rightPanelTab: "inspector" | "ai";
  pathTarget: { fromId: string; toId: string } | null;
}

type Action =
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "SET_FOCUS_NODE"; nodeId: string }
  | { type: "TOGGLE_NODE_TYPE"; nodeType: NodeType }
  | { type: "TOGGLE_EDGE_TYPE"; edgeType: EdgeType }
  | { type: "SET_ALL_NODE_TYPES"; visible: boolean }
  | { type: "SET_ALL_EDGE_TYPES"; visible: boolean }
  | { type: "SET_LAYOUT"; layout: LayoutName }
  | { type: "START_IMPACT"; nodeId: string }
  | { type: "CLEAR_IMPACT" }
  | { type: "SET_RIGHT_PANEL_TAB"; tab: "inspector" | "ai" }
  | { type: "SET_PATH_TARGET"; fromId: string; toId: string }
  | { type: "CLEAR_PATH_TARGET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.nodeId, rightPanelTab: action.nodeId ? "inspector" : state.rightPanelTab };
    case "SET_FOCUS_NODE":
      return { ...state, focusNodeId: action.nodeId };
    case "TOGGLE_NODE_TYPE": {
      const next = new Set(state.visibleNodeTypes);
      if (next.has(action.nodeType)) next.delete(action.nodeType);
      else next.add(action.nodeType);
      return { ...state, visibleNodeTypes: next };
    }
    case "TOGGLE_EDGE_TYPE": {
      const next = new Set(state.visibleEdgeTypes);
      if (next.has(action.edgeType)) next.delete(action.edgeType);
      else next.add(action.edgeType);
      return { ...state, visibleEdgeTypes: next };
    }
    case "SET_ALL_NODE_TYPES":
      return { ...state, visibleNodeTypes: action.visible ? new Set(NODE_TYPES) : new Set() };
    case "SET_ALL_EDGE_TYPES":
      return { ...state, visibleEdgeTypes: action.visible ? new Set(EDGE_TYPES) : new Set() };
    case "SET_LAYOUT":
      return { ...state, layout: action.layout };
    case "START_IMPACT":
      return { ...state, impactNodeId: action.nodeId, selectedNodeId: action.nodeId };
    case "CLEAR_IMPACT":
      return { ...state, impactNodeId: null };
    case "SET_RIGHT_PANEL_TAB":
      return { ...state, rightPanelTab: action.tab };
    case "SET_PATH_TARGET":
      return { ...state, pathTarget: { fromId: action.fromId, toId: action.toId } };
    case "CLEAR_PATH_TARGET":
      return { ...state, pathTarget: null };
    default:
      return state;
  }
}

function initialState(repo: string): AppState {
  return {
    repo,
    selectedNodeId: null,
    focusNodeId: null,
    visibleNodeTypes: new Set(NODE_TYPES),
    visibleEdgeTypes: new Set(EDGE_TYPES),
    layout: "fcose",
    impactNodeId: null,
    rightPanelTab: "inspector",
    pathTarget: null,
  };
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  selectNode: (nodeId: string | null) => void;
  focusNode: (nodeId: string) => void;
  startImpact: (nodeId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ repo, children }: { repo: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, repo, initialState);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      selectNode: (nodeId) => dispatch({ type: "SELECT_NODE", nodeId }),
      focusNode: (nodeId) => {
        dispatch({ type: "SET_FOCUS_NODE", nodeId });
        dispatch({ type: "SELECT_NODE", nodeId });
      },
      startImpact: (nodeId) => dispatch({ type: "START_IMPACT", nodeId }),
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
