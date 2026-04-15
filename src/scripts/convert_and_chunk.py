#!/usr/bin/env python3
"""Convert a document to Markdown and chunk it using docling.

Usage: convert_and_chunk.py <file_path>

Outputs JSON to stdout:
  { "markdown": "...", "chunks": [{ "text": "...", "headings": [...], "contextualized": "..." }] }

Errors are written to stderr as JSON and the process exits with code 1.
"""

import sys
import json
import os

try:
    from docling.document_converter import DocumentConverter
    from docling.chunking import HierarchicalChunker
except ImportError as e:
    print(f"Import error: {e}", file=sys.stderr)
    sys.exit(1)


def main():
    if len(sys.argv) != 2:
        print("Usage: convert_and_chunk.py <file_path>", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    try:
        converter = DocumentConverter()
        result = converter.convert(file_path)
        doc = result.document
        markdown = doc.export_to_markdown()

        chunker = HierarchicalChunker()
        chunks = list(chunker.chunk(doc))

        chunk_list = []
        for chunk in chunks:
            meta = getattr(chunk, 'meta', None)
            headings = list(getattr(meta, 'headings', None) or [])

            try:
                contextualized = chunker.contextualize(chunk)
            except Exception:
                contextualized = chunk.text

            chunk_list.append({
                "text": chunk.text,
                "headings": headings,
                "contextualized": contextualized,
            })

        output = {
            "markdown": markdown,
            "chunks": chunk_list,
        }

        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        print(f"Processing error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
