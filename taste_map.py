"""
Taste Map Pipeline — SCAFFOLD
------------------------------
Fill in each TODO. Docstrings tell you what the function needs to return
and why; they don't tell you how. Suggested libraries are named where
you'll need to look something up, not as instructions to copy from docs.

Install first:
    pip install sentence-transformers scikit-learn numpy --break-system-packages

Run order (see main() at the bottom):
    1. load_books
    2. build_embedding_text
    3. generate_embeddings
    4. reduce_dimensions
    5. compute_centroid
    6. cluster_books
    7. label_clusters
    8. build_trajectory
    9. export_taste_map
"""

import json
import numpy as np


def load_books(reading_data_path: str) -> list:
    """
    Load the 'books' list out of the reading_data.json your existing
    pipeline.py already produces.

    Returns: list of dicts, each with at least title, author, genre,
             my_rating, read_year (from your existing export_books()).

    TODO: open the file, json.load it, return payload["books"].
    Filter out books with shelf != "read" here if you don't want
    to-read/currently-reading books polluting the taste map.
    """
    raise NotImplementedError


def build_embedding_text(book: dict) -> str:
    """
    Turn one book's metadata into a single string to embed.

    Why this matters: the embedding model has no concept of "genre"
    or "author" as separate fields — it just reads text. The way you
    combine fields changes what "similarity" ends up meaning. Try:
      - just the genre tag alone
      - title + author + genre
      - (stretch) fetch a real description from Open Library's Books
        API and include it — richer text usually gives more meaningful
        clusters than sparse metadata alone

    TODO: return a single string built from `book`'s fields.
    Experiment with what you include and see how it changes the map.
    """
    raise NotImplementedError


def generate_embeddings(texts: list) -> np.ndarray:
    """
    Embed a list of strings into vectors.

    Look up: sentence_transformers.SentenceTransformer,
    model name "all-MiniLM-L6-v2" (small, CPU-friendly, 384 dims).

    Returns: numpy array, shape (n_books, 384).

    TODO: load the model once, call .encode(texts), return the array.
    """
    raise NotImplementedError


def reduce_dimensions(embeddings: np.ndarray, method: str = "pca") -> np.ndarray:
    """
    Project high-dimensional embeddings down to 2D for plotting.

    Look up: sklearn.decomposition.PCA (start here — deterministic,
    easy to reason about: "the 2 directions of greatest variance").
    Once that works, try sklearn.manifold or umap-learn's UMAP and
    compare — UMAP preserves local neighborhoods better but is
    stochastic (set a random_state) and sensitive to n_neighbors/
    min_dist.

    Returns: numpy array, shape (n_books, 2).

    TODO: fit the reducer on `embeddings`, return the 2D result.
    Branch on `method` if you implement both PCA and UMAP.
    """
    raise NotImplementedError


def compute_centroid(embeddings: np.ndarray) -> np.ndarray:
    """
    The "center of mass" of the user's full taste, in the ORIGINAL
    embedding space (not the 2D projection — average first, project
    after, so the centroid stays consistent with per-book distances).

    Returns: numpy array, shape (384,).

    TODO: this is one line. What numpy function averages along an axis?
    Think about which axis (books, or embedding dimensions).
    """
    raise NotImplementedError


def cluster_books(embeddings: np.ndarray, k: int = 5) -> np.ndarray:
    """
    Group books into k taste clusters using the FULL-dimensional
    embeddings (not the 2D projection — clustering after reduction
    throws away information the reduction already discarded).

    Look up: sklearn.cluster.KMeans. Think about how you'd choose k
    if you didn't want to hardcode it (elbow method, silhouette score
    — optional stretch goal, not required to ship a first version).

    Returns: numpy array, shape (n_books,) — a cluster id per book.

    TODO: fit KMeans, return the cluster labels.
    """
    raise NotImplementedError


def label_clusters(books: list, cluster_ids: np.ndarray) -> dict:
    """
    Turn numeric cluster ids into human-readable labels by finding
    what each cluster's books have in common.

    Approach: for each cluster, collect the genre tags (or authors)
    of every book assigned to it, count frequency, take the most
    common one or two as the label.

    Returns: dict like {0: "Literary Fiction", 1: "Fantasy / Sci-Fi", ...}

    TODO: group books by cluster_id, count genre occurrences per group
    (collections.Counter is useful here), build the label dict.
    """
    raise NotImplementedError


def build_trajectory(books: list, points_2d: np.ndarray) -> list:
    """
    Order books chronologically so the frontend can draw a path
    connecting them — "your taste over time" as a line through the map.

    Returns: list of dicts, sorted by read date, each with the book's
    2D coordinates attached — e.g.
    [{"title": ..., "x": ..., "y": ..., "read_year": ...}, ...]

    TODO: you'll need read_year (already in your book records) or a
    finer-grained date if you have one. Sort books by that, zip with
    their corresponding row in points_2d, build the output list.
    Careful: books and points_2d must stay in the same order
    throughout the whole pipeline, or this will silently mismatch.
    """
    raise NotImplementedError


def export_taste_map(
    books,
    points_2d,
    centroid_2d,
    cluster_ids,
    cluster_labels,
    trajectory,
    output_path: str = "taste_map.json",
):
    """
    Assemble everything into the JSON shape the frontend expects:

    {
      "points": [
        {"title": ..., "author": ..., "x": ..., "y": ...,
         "cluster": 0, "my_rating": ..., "read_year": ...},
        ...
      ],
      "centroid": {"x": ..., "y": ...},
      "cluster_labels": {"0": "...", "1": "...", ...},
      "trajectory": [ ... from build_trajectory ... ]
    }

    TODO: build this dict, json.dump it to output_path.
    Note: cluster_ids will be numpy ints — you'll need to cast to
    plain Python int before JSON serializing, or json.dump will error.
    """
    raise NotImplementedError


def main():
    # TODO: call each function above in order, threading outputs
    # into the next function's inputs. This is where you'll actually
    # see whether your understanding of the pipeline is right —
    # if something's the wrong shape, this is where it breaks.
    pass


if __name__ == "__main__":
    main()
