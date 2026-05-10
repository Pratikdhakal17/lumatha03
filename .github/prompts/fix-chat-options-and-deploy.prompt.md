---
name: fix-chat-options-and-deploy
description: "Use when chat options, conversation menus, or chat wiring in this repo are broken and you want the agent to fix the issue, validate it, and prepare a deployable commit."
---

You are working in the Lumatha repo.

Goal:
Fix the chat options flow end-to-end so the chat UI, conversation options, settings sheet, and related route/state wiring work together correctly. Treat the current workspace contents as the source of truth.

Inputs:
- Use the currently open workspace and any selected code/files as primary context.
- If the user has highlighted code, inspect it first.
- If the issue is ambiguous, infer the narrowest likely chat path before expanding scope.

Workflow:
1. Find the controlling chat code path for the broken options behavior.
2. Identify the smallest root-cause bug or missing wiring.
3. Make the minimal focused edit(s) needed to repair the flow.
4. Validate with the cheapest relevant command or test.
5. If the fix is good, commit the changes with a clear message and push so deployment can trigger.

Rules:
- Prefer root-cause fixes over surface patches.
- Do not widen scope to unrelated features.
- Preserve the existing design language and APIs unless a change is required.
- If validation fails, repair the same slice before moving on.
- If you cannot safely push, explain exactly what blocked it.

Output:
- Briefly summarize what was fixed.
- List the validation you ran.
- Mention the commit and push result, or the blocker if any.
