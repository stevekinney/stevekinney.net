---
date: 
title: Some Keyboard Shortcuts for Visual Studio Code
modified: 2025-03-18T00:58:31-05:00
---

## General Navigation & Search

|Action|macOS Shortcut|Windows Shortcut|Description|
|---|---|---|---|
|**Command Palette**|**Cmd + Shift + P**|**Ctrl + Shift + P**|Access all commands, settings, and more.|
|**Go to File**|**Cmd + P**|**Ctrl + P**|Fuzzy-find and open files.|
|**Search Across Files**|**Cmd + Shift + F**|**Ctrl + Shift + F**|Global search in all files/folders.|
|**Toggle Terminal**|**Ctrl + `**|**Ctrl + `**|Show/hide the integrated terminal. (Backtick is the key above Tab.)|
|**Toggle Sidebar**|**Cmd + B**|**Ctrl + B**|Show/hide the left sidebar (file explorer, etc.).|
|**Navigate Back**|**Ctrl + -**|**Alt + Left Arrow**|Go back to the previous location in code.|
|**Navigate Forward**|**Ctrl + Shift + -**|**Alt + Right Arrow**|Go forward to the next location in code.|

## Editing Essentials

|Action|macOS Shortcut|Windows Shortcut|Description|
|---|---|---|---|
|**Cut Line** (no selection needed)|**Cmd + X**|**Ctrl + X**|Cuts the entire line if nothing is selected.|
|**Copy Line** (no selection needed)|**Cmd + C**|**Ctrl + C**|Copies the entire line if nothing is selected.|
|**Paste**|**Cmd + V**|**Ctrl + V**|Pastes what you last cut or copied.|
|**Duplicate Line**|**Shift + Option + ↓**|**Shift + Alt + ↓**|Clones your current line right below.|
|**Move Line Up/Down**|**Option + ↑/↓**|**Alt + ↑/↓**|Moves the current line (or selection) up/down.|
|**Select Next Occurrence**|**Cmd + D**|**Ctrl + D**|Finds the next exact match of your current selection and adds a new cursor.|
|**Select All Occurrences**|**Cmd + Shift + L**|**Ctrl + Shift + L**|Highlights all matching words in the file at once (multi-cursor).|
|**Comment/Uncomment Line**|**Cmd + /**|**Ctrl + /**|Toggles a line comment (//) or comments out a selection.|
|**Toggle Block Comment**|**Shift + Option + A**|**Shift + Alt + A**|Wraps/unwraps the selected text in a block comment.|
|**Add Multiple Cursors**|**Option + Cmd + Up/Down** _or_ **Option + Click**|**Ctrl + Alt + Up/Down** _or_ **Alt + Click**|Adds multiple cursors for editing in parallel.|
|**Delete Line**|_not bound by default (suggest Ctrl+Shift+K)_|**Ctrl + Shift + K** (default)|Deletes the entire current line.|
|**Join Lines**|(bind manually, e.g. **Ctrl+J**)|(bind manually, e.g. **Ctrl+J**)|Joins the next line to the end of the current line (no line break).|

## Code Intelligence

|Action|macOS Shortcut|Windows Shortcut|Description|
|---|---|---|---|
|**Go to Definition**|**F12** or **Cmd + Click**|**F12** or **Ctrl + Click**|Jumps to where a symbol (function/variable) is defined.|
|**Peek Definition**|**Option + F12**|**Alt + F12**|Shows the definition in a popup without leaving your file.|
|**Rename Symbol**|**F2**|**F2**|Renames all instances of a symbol (function, variable, etc.).|
|**Auto-Complete Suggestions**|**Ctrl + Space**|**Ctrl + Space**|Pops up intellisense suggestions for context-based completions.|

## Layout & Formatting

|Action|macOS Shortcut|Windows Shortcut|Description|
|---|---|---|---|
|**Format Document**|**Shift + Option + F**|**Shift + Alt + F**|Formats your code (with Prettier/beautifier, etc.).|
|**Toggle Word Wrap**|**Option + Z**|**Alt + Z**|Wraps long lines of code onto the next line.|
|**Fold All / Unfold All**|**Cmd + K + 0 / Cmd + K + J**|**Ctrl + K + 0 / Ctrl + K + J**|Collapses or expands all foldable regions in the file.|
|**Split Editor**|**Cmd + \**|**Ctrl + \**|Splits the active editor window into multiple panes.|
|**Focus on Next/Prev Editor Group**|**Ctrl + Cmd + → / ←**|**Ctrl + K Ctrl + → / ←**|Moves focus between split panes (or use the arrow keys).|
|**Toggle Fullscreen**|**Ctrl + Cmd + F**|**F11**|Toggles full screen.|
|**Zen Mode**|**Cmd + K Z**|**Ctrl + K Z**|Distraction-free mode.|
