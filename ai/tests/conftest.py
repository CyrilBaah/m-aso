import os

# Unit tests never load the large models; tests that need them load them explicitly.
os.environ.setdefault("MASO_LOAD_MODELS", "0")
