#!/usr/bin/env bash
#
# Commit Guardian — the ONE scan script (single source of truth for the rules).
#
# Two callers use this exact file, so the rules never drift apart:
#   1. .github/workflows/commit-guardian.yml   -> runs on GitHub's servers = THE GATE
#   2. .claude/commands/scan.md  via  /scan    -> runs locally = advisory pre-check
#
# Behaviour is set by the CALLER via env vars, never duplicated:
#   GUARDIAN_MODE       block | warn   (default: warn)
#       block -> exit 1 when a CRITICAL or structural issue is found (public repo)
#       warn  -> always exit 0, just print the report               (private repos)
#   GUARDIAN_FILES      newline-separated list of files to scan
#       if unset, the script picks a sensible local default (staged, then dirty)
#   GUARDIAN_APPROVALS  space/newline-separated basenames that are pre-approved
#       (the workflow fills this from "APPROVED: <file>" lines in the PR body)
#
# Portability note: uses `grep -E` (POSIX ERE) + POSIX character classes, NOT
# `grep -P`. That keeps /scan working with the BSD grep on Natasha's and
# Dawood's Macs, not just the GNU grep on GitHub's Ubuntu runners. Do not
# switch these patterns to -P / \d / \s.

set -euo pipefail

MODE="${GUARDIAN_MODE:-warn}"
APPROVALS="${GUARDIAN_APPROVALS:-}"

# A PUBLIC repo may only contain these. Anything else is flagged for review.
PUBLIC_ALLOWED_DIRS="website product-info media brand .github .claude"
PUBLIC_ALLOWED_ROOT_FILES="README.md CLAUDE.md .gitignore LICENSE"

# ---- decide which files to scan -----------------------------------------
if [ -n "${GUARDIAN_FILES:-}" ]; then
  FILES="$GUARDIAN_FILES"
else
  FILES="$(git diff --cached --name-only 2>/dev/null || true)"      # staged
  [ -z "$FILES" ] && FILES="$(git diff --name-only HEAD 2>/dev/null || true)"  # dirty
  [ -z "$FILES" ] && FILES="$(git ls-files 2>/dev/null || true)"     # fresh repo
fi

CRITICAL=0     # hard problems (SSN, card, key) — block in block mode
STRUCTURAL=0   # public-repo placement / keyword problems — block in block mode
WARNINGS=0     # soft flags — never block, informational only
REPORT=""

is_approved() {
  local base; base="$(basename "$1")"
  for a in $APPROVALS; do
    [ "$(basename "$a")" = "$base" ] && return 0
  done
  return 1
}

in_public_allowlist() {
  local f="$1" top; top="${f%%/*}"
  if [ "$top" = "$f" ]; then                       # root-level file
    for ok in $PUBLIC_ALLOWED_ROOT_FILES; do
      [ "$f" = "$ok" ] && return 0
    done
    return 1
  fi
  for ok in $PUBLIC_ALLOWED_DIRS; do
    [ "$top" = "$ok" ] && return 0
  done
  return 1
}

# Policy/scaffolding files legitimately mention the keywords (this script lists
# them; CLAUDE.md documents what must NOT be committed). Skip them for the soft
# keyword check ONLY — the CRITICAL secret checks below still run on every file.
is_meta() {
  case "$1" in
    .github/*|.claude/*|CLAUDE.md|README.md|LICENSE) return 0 ;;
  esac
  return 1
}

while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ ! -f "$file" ] && continue                      # skip deletes / moved paths

  if is_approved "$file"; then
    REPORT="${REPORT}APPROVED (skipped): ${file}\n"
    continue
  fi

  # ---- binary files (skip truly-empty files so they aren't misflagged) ----
  if [ -s "$file" ] && ! grep -Iq . "$file" 2>/dev/null; then
    REPORT="${REPORT}WARNING: binary file committed: ${file}\n"
    WARNINGS=$((WARNINGS + 1))
    if [ "$MODE" = "block" ]; then
      REPORT="${REPORT}  -> public repo: binaries need an explicit APPROVED: ${file}\n"
      STRUCTURAL=$((STRUCTURAL + 1))
    fi
    continue
  fi

  content="$(cat "$file" 2>/dev/null || true)"

  # ---- CRITICAL pattern checks (every repo) -------------------------------
  if printf '%s' "$content" | grep -Eq '[0-9]{3}-[0-9]{2}-[0-9]{4}'; then
    REPORT="${REPORT}CRITICAL: possible SSN in ${file}\n"
    CRITICAL=$((CRITICAL + 1))
  fi
  if printf '%s' "$content" | grep -Eq '[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}'; then
    REPORT="${REPORT}CRITICAL: possible credit-card number in ${file}\n"
    CRITICAL=$((CRITICAL + 1))
  fi
  if printf '%s' "$content" | grep -Eiq '(api[_-]?key|secret[_-]?key|access[_-]?token|private[_-]?key)[[:space:]]*[:=]'; then
    REPORT="${REPORT}CRITICAL: possible API key/secret in ${file}\n"
    CRITICAL=$((CRITICAL + 1))
  fi
  if printf '%s' "$content" | grep -Eq 'AKIA[0-9A-Z]{16}'; then
    REPORT="${REPORT}CRITICAL: AWS access key in ${file}\n"
    CRITICAL=$((CRITICAL + 1))
  fi

  # ---- sensitive business keywords ----------------------------------------
  if ! is_meta "$file" && printf '%s' "$content" | grep -Eiq '(confidential|internal only|provisional patent|COGS|gross margin|co-packer|wholesale price|supplier cost)'; then
    if [ "$MODE" = "block" ]; then
      REPORT="${REPORT}BLOCK: sensitive business keyword in ${file} (public repo)\n"
      STRUCTURAL=$((STRUCTURAL + 1))
    else
      REPORT="${REPORT}WARNING: sensitive business keyword in ${file}\n"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi

  # ---- public repo: file must live in an approved directory ---------------
  if [ "$MODE" = "block" ] && ! in_public_allowlist "$file"; then
    REPORT="${REPORT}BLOCK: file outside approved public dirs: ${file}\n"
    STRUCTURAL=$((STRUCTURAL + 1))
  fi

done <<EOF
$FILES
EOF

# ---- report -------------------------------------------------------------
TOTAL=$((CRITICAL + STRUCTURAL + WARNINGS))
echo "========================================="
echo "COMMIT GUARDIAN  (mode: ${MODE})"
echo "  critical:   ${CRITICAL}"
echo "  structural: ${STRUCTURAL}"
echo "  warnings:   ${WARNINGS}"
echo "========================================="
if [ "$TOTAL" -gt 0 ]; then
  printf '%b' "$REPORT"
  echo ""
  echo "To approve a specific flagged file, add this line to the PR description:"
  echo "  APPROVED: <filename>"
fi

# ---- exit code = the gate -----------------------------------------------
if [ "$MODE" = "block" ] && [ $((CRITICAL + STRUCTURAL)) -gt 0 ]; then
  echo "RESULT: BLOCKED — resolve or APPROVE the items above before merging."
  exit 1
fi
echo "RESULT: pass${MODE:+ ($MODE mode)}"
exit 0
