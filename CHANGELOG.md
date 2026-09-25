# Changelog

## 2.3.0

- Restore **Automatic rollover on daily note open**, using the preference key from Rollover Daily Todos. Enable it in settings to run when today's note opens or is already open at startup.
- Automatic rollover looks up yesterday's exact note directly, even when the manual source is set to Past week. It uses the existing heading, move/copy, task-child, cleanup, and undo behavior.
- Remember completed automatic rollovers across reopens and restarts to avoid duplicate copies. Keep partial moves undoable without repeating them automatically.
- Rename the selection command to **Send selection to tomorrow** and add it to the editor's right-click menu for an unfinished task. Keep the command ID so existing hotkeys work.
- Allow selecting a parent task and its children together without treating the children as separate selected tasks.

## 2.2.0

- Add **Rollover to-dos from the past week**, collecting from the seven most recent daily notes before today, even when dates are missing.
- Add a **Rollover to today source** dropdown with **Yesterday** and **Past week**. Choosing Past week gives the regular command the seven-note behavior and disables the separate past-week command.
- Use the existing rollover filters and move/copy settings for both commands. Save today's note once, and keep one undo for the entire batch, including completed writes after a partial failure.
- Ignore frontmatter and fenced code examples when finding tasks and headings.
- Prevent outdated or expired undo confirmations from restoring an earlier operation, and block undo while rollover is running.
- Use the active app instance, honor Periodic Notes when enabled, and keep source tasks if a configured template cannot be read.
- Remove unused periodic-note helpers and legacy task-removal paths. Collect daily-note dates in one pass and retain only the requested recent notes when selecting sources.
- Add repeatable regression checks, official Obsidian lint checks, and a GitHub checks workflow.
