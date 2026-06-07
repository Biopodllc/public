---
description: Show current deadlines and action items across the repo
allowed-tools: Read, Bash(git log:*)
---

Show me my current deadlines and open action items.

Read this repo's `CLAUDE.md` (and a `DEADLINES.md` if one exists) and produce a
single sorted list of upcoming deadlines with days-remaining from today. Put
anything due in the next 14 days at the top and flag it.

Do not invent dates — only report what is actually written in the files. If a
date has passed, mark it OVERDUE rather than dropping it.
