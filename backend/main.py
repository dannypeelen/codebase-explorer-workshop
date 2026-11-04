"""FastAPI service — prebuilt, not an exercise. Translates HTTP params to
a call into `graph_service` or one of the `exercises` modules and a
result to JSON. Mirrors the original project's api/main.py; the same
REST contract, so the frontend (copied from the original `visual/`
unmodified) needs no changes to talk to this instead.

/search and /ask depend on Gemini and on Exercises 1/3/4; they degrade to
a 503 / an explained "unavailable" answer when Gemini isn't configured,
or raise a clear error naming the unfinished exercise until it's
implemented. Everything else (/nodes, /graph, /ingest/status,
/provenance) never depends on either.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import data_store, graph_service
from .exercises import qa, semantic_search
from .gemini_client import GeminiUnavailable, try_create_client

DEFAULT_REPO = data_store.REPO

app = FastAPI(title="Codebase Explorer Workshop API", version="0.1.0")

_gemini_client = try_create_client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("VISUAL_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/ingest/status")
def ingest_status(repo: str = DEFAULT_REPO):
    return graph_service.get_repository_status()


@app.get("/graph")
def get_graph(
    repo: str = DEFAULT_REPO,
    node_types: list[str] | None = Query(default=None),
    edge_types: list[str] | None = Query(default=None),
    limit: int = Query(default=graph_service.DEFAULT_GRAPH_LIMIT, ge=1, le=graph_service.MAX_GRAPH_LIMIT),
):
    return graph_service.get_graph(node_types=node_types, edge_types=edge_types, limit=limit)


@app.get("/nodes/{node_id}")
def get_node(node_id: str):
    node = graph_service.get_node_details(node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="node not found")
    return node


@app.get("/nodes/{node_id}/neighbors")
def get_node_neighbors(
    node_id: str,
    edge_types: list[str] | None = Query(default=None),
    node_types: list[str] | None = Query(default=None),
    direction: str = Query(default="both", pattern="^(out|in|both)$"),
):
    if data_store.get_node(node_id) is None:
        raise HTTPException(status_code=404, detail="node not found")
    return graph_service.get_neighbors(node_id, edge_types=edge_types, node_types=node_types, direction=direction)


@app.get("/subgraph")
def get_subgraph(
    node_id: str,
    depth: int = Query(default=2, ge=1, le=6),
    edge_types: list[str] | None = Query(default=None),
    direction: str = Query(default="out", pattern="^(out|in|both)$"),
):
    return graph_service.get_subgraph(node_id, depth=depth, edge_types=edge_types, direction=direction)


@app.get("/paths")
def get_paths(
    from_id: str,
    to_id: str,
    max_depth: int = Query(default=6, ge=1, le=8),
    edge_types: list[str] | None = Query(default=None),
    directed: bool = False,
    limit: int = Query(default=5, ge=1, le=20),
):
    for nid in (from_id, to_id):
        if data_store.get_node(nid) is None:
            raise HTTPException(status_code=404, detail=f"node not found: {nid}")
    return graph_service.find_paths(from_id, to_id, max_depth=max_depth, edge_types=edge_types, directed=directed, limit=limit)


@app.get("/impact/{node_id}")
def get_impact(node_id: str, max_depth: int = Query(default=3, ge=1, le=5), max_results: int = Query(default=50, ge=1, le=500)):
    result = graph_service.impact_analysis(node_id, max_depth=max_depth, max_results=max_results)
    if result is None:
        raise HTTPException(status_code=404, detail="node not found")
    return result


@app.get("/search")
def search(q: str, repo: str = DEFAULT_REPO, node_type: str | None = None, top_k: int = 10):
    try:
        return semantic_search.semantic_search(q, _gemini_client, top_k=top_k, node_type=node_type)
    except GeminiUnavailable as e:
        raise HTTPException(status_code=503, detail=f"semantic search unavailable: {e}") from e


class AskRequest(BaseModel):
    question: str
    repo: str = DEFAULT_REPO


@app.post("/ask")
def ask(req: AskRequest):
    return qa.answer_question(req.question, _gemini_client)


@app.get("/provenance/{edge_id}")
def get_provenance(edge_id: str):
    edge = next((e for e in data_store.EDGES if e["id"] == edge_id), None)
    if edge is None:
        raise HTTPException(status_code=404, detail="edge not found")
    prov = edge["provenance"]
    return {"source": prov["source"], "evidence": prov["evidence"], "confidence": prov["confidence"],
            "extractor_version": prov["extractor_version"], "extracted_at": prov["extracted_at"]}
