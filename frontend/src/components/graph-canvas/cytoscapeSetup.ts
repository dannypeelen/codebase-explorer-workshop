import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import fcose from "cytoscape-fcose";
import { buildStylesheet } from "./cytoscapeStyle";

let registered = false;
function ensureRegistered() {
  if (registered) return;
  cytoscape.use(fcose);
  registered = true;
}

export function createCytoscape(container: HTMLElement): Core {
  ensureRegistered();
  return cytoscape({
    container,
    elements: [],
    style: buildStylesheet(),
    wheelSensitivity: 0.25,
    boxSelectionEnabled: false,
    minZoom: 0.05,
    maxZoom: 6,
  });
}

/** Adds only elements not already present — Cytoscape errors (or silently
 * no-ops depending on version) on a duplicate id, and merging previously-
 * loaded nodes is the normal case for every "expand"/"focus" interaction. */
export function mergeElements(cy: Core, elements: ElementDefinition[]): number {
  const toAdd = elements.filter((el) => !el.data?.id || cy.getElementById(String(el.data.id)).length === 0);
  if (toAdd.length) cy.add(toAdd);
  return toAdd.length;
}
