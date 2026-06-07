---
description: Local pre-check — run Commit Guardian on your changes before you push
allowed-tools: Bash(bash .github/scripts/guardian.sh:*), Bash(git status:*), Bash(git diff:*)
---

Run the Commit Guardian scan locally as a PRE-CHECK on my current changes.

This is a convenience, not the gate. The real enforcement is the Commit Guardian
GitHub Action, which runs on GitHub's servers for every push and PR and cannot
be bypassed. This command runs the exact same script
(`.github/scripts/guardian.sh`) so I see the same findings before I push.

Steps:
1. Run `bash .github/scripts/guardian.sh` (warn mode — reports everything,
   blocks nothing).
2. To preview how the PUBLIC repo would judge these same changes, also run
   `GUARDIAN_MODE=block bash .github/scripts/guardian.sh` and tell me whether it
   would block.
3. Summarize each finding in plain language and tell me, file by file, what to
   move, redact, or `APPROVED:` before pushing. Remind me that the GitHub Action
   is what ultimately gates, so I should still open a PR for the public repo.
