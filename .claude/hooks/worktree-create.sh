#!/bin/bash
set -e

INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name')
CWD=$(echo "$INPUT" | jq -r '.cwd')

WORKTREE_PATH="$CWD/.claude/worktrees/$NAME"

cd "$CWD"
jj workspace add "$WORKTREE_PATH" --name "$NAME" -r @ -m "wt: $NAME" >&2

echo "$WORKTREE_PATH"
