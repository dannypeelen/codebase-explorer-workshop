import type { ElementDefinition, NodeSingular } from "cytoscape";
import type { GraphEdge, GraphNode } from "../../types/graph";
import { nodeLabel } from "../../domain/taxonomy";
import type { LayoutName } from "../../state/AppState";

export function toNodeElement(node: GraphNode): ElementDefinition {
  return {
    group: "nodes",
    data: {
      id: node.id,
      nodeType: node.type,
      naturalKey: node.natural_key,
      label: nodeLabel(node),
      repo: node.repo,
    },
  };
}

export function toEdgeElement(edge: GraphEdge): ElementDefinition {
  return {
    group: "edges",
    data: {
      id: edge.id,
      source: edge.src_id,
      target: edge.dst_id,
      edgeType: edge.type,
      source_: edge.provenance?.source,
    },
  };
}

export function layoutOptions(name: LayoutName) {
  switch (name) {
    case "fcose":
      return {
        name: "fcose",
        animate: true,
        animationDuration: 400,
        randomize: false,
        nodeRepulsion: 5500,
        idealEdgeLength: 70,
        edgeElasticity: 0.3,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 1500,
        fit: true,
        padding: 40,
      } as never;
    case "breadthfirst":
      return { name: "breadthfirst", animate: true, animationDuration: 400, spacingFactor: 1.1, fit: true, padding: 40 } as never;
    case "concentric":
      return {
        name: "concentric",
        animate: true,
        animationDuration: 400,
        minNodeSpacing: 28,
        fit: true,
        padding: 40,
        concentric: (node: NodeSingular) => node.degree(false),
        levelWidth: () => 1,
      } as never;
    case "circle":
      return { name: "circle", animate: true, animationDuration: 400, fit: true, padding: 40 } as never;
    case "grid":
      return { name: "grid", animate: true, animationDuration: 400, fit: true, padding: 40 } as never;
  }
}
