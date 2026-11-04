import type { Core } from "cytoscape";
import type { ImpactAnalysis } from "../../types/api";

const ALL_STATE_CLASSES =
  "highlighted dimmed selected-node impact-target impact-direct impact-transitive impact-module impact-test impact-dim impact-path path-node path-edge path-anchor";

export function clearAllHighlights(cy: Core) {
  cy.batch(() => {
    cy.elements().removeClass(ALL_STATE_CLASSES);
  });
}

export function applyEgoHighlight(cy: Core, nodeId: string) {
  cy.batch(() => {
    cy.elements().removeClass("highlighted dimmed selected-node");
    const node = cy.getElementById(nodeId);
    if (node.empty()) return;
    const neighborhood = node.closedNeighborhood();
    cy.elements().difference(neighborhood).addClass("dimmed");
    neighborhood.addClass("highlighted");
    node.removeClass("dimmed").addClass("selected-node");
  });
}

export function clearEgoHighlight(cy: Core) {
  cy.batch(() => cy.elements().removeClass("highlighted dimmed selected-node"));
}

export function applyImpactHighlight(cy: Core, impact: ImpactAnalysis) {
  cy.batch(() => {
    cy.elements().removeClass(ALL_STATE_CLASSES);

    const directIds = new Set([
      ...impact.direct_callers.map((n) => n.node_id),
      ...impact.direct_dependencies.map((n) => n.node_id),
    ]);
    const transitiveIds = new Set(impact.transitive_callers.map((n) => n.id));
    const keepIds = new Set([impact.target.id, ...directIds, ...transitiveIds]);

    cy.nodes().forEach((n) => {
      if (!keepIds.has(n.id())) n.addClass("impact-dim");
    });
    cy.edges().forEach((e) => {
      const s = keepIds.has(e.data("source"));
      const t = keepIds.has(e.data("target"));
      e.addClass(s && t ? "impact-path" : "impact-dim");
    });

    cy.getElementById(impact.target.id).addClass("impact-target");
    for (const id of directIds) cy.getElementById(id).addClass("impact-direct");
    for (const id of transitiveIds) {
      if (!directIds.has(id)) cy.getElementById(id).addClass("impact-transitive");
    }
  });
}

export function applyPathHighlight(cy: Core, nodeIds: string[], edgeIds: string[]) {
  cy.batch(() => {
    cy.elements().removeClass(ALL_STATE_CLASSES);
    cy.elements().addClass("impact-dim"); // reuse the dim visual language for "not part of this result"
    for (const id of edgeIds) cy.getElementById(id).removeClass("impact-dim").addClass("path-edge");
    for (const id of nodeIds) cy.getElementById(id).removeClass("impact-dim").addClass("path-node");
    if (nodeIds.length) {
      cy.getElementById(nodeIds[0]).addClass("path-anchor");
      cy.getElementById(nodeIds[nodeIds.length - 1]).addClass("path-anchor");
    }
  });
}
