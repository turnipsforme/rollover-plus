# Rollover Plus

Keep unfinished tasks moving without copying and pasting them between daily notes. Rollover Plus gives you three focused commands:

- **Rollover to today:** Bring unfinished tasks from your most recent earlier daily note into today's note.
- **Rollover to tomorrow:** Send every unfinished task in today's note to tomorrow's note.
- **Rollover current selection to tomorrow:** Send one task from any Markdown note to tomorrow's note.

The plugin uses the folder, filename format, and template from Obsidian's Daily Notes plugin or the daily-note settings in Periodic Notes. An optional folder override is available in Rollover Plus settings.

## The three main commands

### Rollover to tomorrow

Moves or copies every unfinished task from today's daily note into tomorrow's daily note. Tomorrow's note is created through the existing Daily Notes or Periodic Notes pathway only after tasks have been found.

Leading `tomorrow` and `tmrw` labels are removed from the rolled task text.

### Rollover to today

Moves or copies every unfinished task from the closest earlier daily note into today's existing daily note. The source can be yesterday or an older note if there are gaps. Future notes are ignored.

Create today's daily note before running this command. This matches the manual rollover behavior from the original Rollover Daily Todos plugin.

### Send one task to tomorrow

Put the cursor anywhere on one unfinished task, or select part of its line, then run **Rollover current selection to tomorrow**. Rollover Plus moves the complete task line into tomorrow's daily note, so it never leaves an empty checkbox shell behind.

This command:

- works from any Markdown note;
- moves only the exact selected task when identical task text appears elsewhere;
- includes indented child lines when **Roll over task children** is enabled;
- always removes the selected source task after the destination is saved, even when bulk rollover is set to copy;
- keeps the source task if the editor changes while tomorrow's note is being saved.

## A quick safety net

### Undo last rollover

Restores every file changed by the last rollover. One undo is kept in memory for two minutes. Undo history is cleared when Obsidian closes.

## Placement and cleanup

Rollover Plus prefers the heading selected in settings. If it is missing, the first Markdown heading containing `task` or `tasks` is used, regardless of heading level, capitalization, emoji, or punctuation. If no task heading exists, tasks are added to the end of the destination note.

An empty task placeholder at the insertion point is replaced. When moving tasks empties a matching source section, Rollover Plus removes that affected heading and its blank scaffold. Completed tasks, prose, child headings, and other real content keep the heading in place.

The destination is always saved before source text is removed. If the source write fails or the editor changes during a selection rollover, the source stays intact.

## Settings

- **Daily note folder:** Optional folder override. Leave it blank to use Daily Notes or Periodic Notes.
- **Template heading:** Preferred destination heading, with automatic Task heading detection as fallback.
- **Delete tasks from source note:** Move tasks for the two bulk commands. Disable it to copy instead.
- **Remove empty tasks in rollover:** Skip empty task boxes and clean them from a source being moved.
- **Roll over task children:** Include indented Markdown beneath each unfinished task.
- **Done status markers:** Checkbox characters treated as complete. The default is `xX-`.

## Requirements

Enable either Obsidian's core Daily Notes plugin or Periodic Notes with daily notes enabled.

## Installation note

Rollover Plus uses the plugin ID `rollover-plus`, matching its Community Directory URL. Obsidian treats a new plugin ID as a new installation, so settings and hotkeys from an earlier installation need to be set again.

## Attribution

Rollover Plus is based on [Rollover Daily Todos by Lukas Mölschl](https://github.com/lumoe/obsidian-rollover-daily-todos), originally created by Matthew Sessions. The upstream project is available under the MIT License. See [LICENSE](LICENSE).
