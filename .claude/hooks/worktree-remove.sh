#!/bin/bash

INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path')
NAME=$(basename "$WORKTREE_PATH")

jj workspace forget "$NAME" >&2
rm -rf "$WORKTREE_PATH" >&2
