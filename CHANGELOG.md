# Changelog

## 2.2.0

- Add **Rollover to-dos from the past week**, collecting from the seven most recent daily notes before today, even when dates are missing.
- Add a **Rollover to today source** dropdown with **Yesterday** and **Past week**. Choosing Past week gives the regular command the seven-note behavior and disables the separate past-week command.
- Use the existing rollover filters and move/copy settings for both commands. Save today's note once, and keep one undo for the entire batch, including completed writes after a partial failure.
- Ignore frontmatter and fenced code examples when finding tasks and headings.
- Prevent outdated or expired undo confirmations from restoring an earlier operation, and block undo while rollover is running.
- Use the active app instance, honor Periodic Notes when enabled, and keep source tasks if a configured template cannot be read.
- Remove unused periodic-note helpers and legacy task-removal paths. Collect daily-note dates in one pass and retain only the requested recent notes when selecting sources.
- Add repeatable regression checks, official Obsidian lint checks, and a GitHub checks workflow.
