"""Checkpoint for Exercise 2. Run with: pytest backend/tests/test_graph_traversal.py -v

Every assertion here is against real, already-extracted `pallets/flask`
data (see backend/data_store.py) — these are real relationships in
Flask's source, not fixtures made up for the test.
"""

from backend.exercises.graph_traversal import get_neighbors, get_subgraph

# Flask.wsgi_app — the method that kicks off handling a WSGI request.
WSGI_APP_ID = "b0ba0cc27b2a53574e62b2409e67388b"
# The three functions wsgi_app calls directly, as real CALLS edges.
WSGI_APP_CALLEES = {
    "src/flask/app.py::Flask.request_context",
    "src/flask/app.py::Flask.full_dispatch_request",
    "src/flask/app.py::Flask.handle_exception",
}
# Flask.full_dispatch_request — PART_OF the file src/flask/app.py.
FULL_DISPATCH_REQUEST_ID = "ae4c46b2a7dfa126974912328863027e"
FLASK_APP_FILE_NATURAL_KEY = "src/flask/app.py"


def test_get_neighbors_filters_by_edge_type_and_direction():
    neighbors = get_neighbors(WSGI_APP_ID, edge_types=["CALLS"], direction="out")

    assert len(neighbors) == 3
    assert {n["natural_key"] for n in neighbors} == WSGI_APP_CALLEES
    assert all(n["edge_type"] == "CALLS" for n in neighbors)
    assert all(n["rel_direction"] == "out" for n in neighbors)


def test_get_neighbors_direction_in_finds_callers():
    # full_dispatch_request is called BY wsgi_app — direction="in" from
    # full_dispatch_request's own perspective should surface wsgi_app.
    callers = get_neighbors(FULL_DISPATCH_REQUEST_ID, edge_types=["CALLS"], direction="in")
    assert any(n["node_id"] == WSGI_APP_ID for n in callers)


def test_get_neighbors_unfiltered_returns_more_than_calls_alone():
    all_neighbors = get_neighbors(WSGI_APP_ID, direction="both")
    calls_only = get_neighbors(WSGI_APP_ID, edge_types=["CALLS"], direction="out")
    assert len(all_neighbors) > len(calls_only)


def test_get_subgraph_one_hop_matches_get_neighbors():
    subgraph = get_subgraph(WSGI_APP_ID, depth=1, edge_types=["CALLS"], direction="out")
    node_keys = {n["natural_key"] for n in subgraph["nodes"]}

    assert node_keys == WSGI_APP_CALLEES | {"src/flask/app.py::Flask.wsgi_app"}
    assert len(subgraph["edges"]) == 3


def test_get_subgraph_depth_limits_expansion():
    shallow = get_subgraph(WSGI_APP_ID, depth=1, edge_types=["CALLS"], direction="out")
    deeper = get_subgraph(WSGI_APP_ID, depth=2, edge_types=["CALLS"], direction="out")

    assert len(deeper["nodes"]) >= len(shallow["nodes"])


def test_get_subgraph_accepts_list_of_seeds():
    subgraph = get_subgraph([WSGI_APP_ID, FULL_DISPATCH_REQUEST_ID], depth=1, edge_types=["PART_OF"], direction="out")
    node_keys = {n["natural_key"] for n in subgraph["nodes"]}
    assert FLASK_APP_FILE_NATURAL_KEY in node_keys
