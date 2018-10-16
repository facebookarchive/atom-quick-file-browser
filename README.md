# Quick File Browser

A keyboard-driven file browser focused on navigating from an open file to files
nearby.

This plugin is inspired by the vim plugins *netrw* and *vim-vinegar*. It allows
for navigation from the directory containing the current file to any other file
using keyboard controls.

This plugin works with both local projects and remote projects via
[nuclide](https://github.com/facebook/nuclide).

## Activation

The command `quick-file-browser:browse-active-file-directory` activates the
file browser in the directory of the current file. This command is unbound by
default. If using `vim-mode-plus`, the following entry in `keymap.cson` will
bind the activation command to the `-` key in normal mode.

```
  "atom-text-editor.vim-mode-plus.normal-mode":
    "-": "quick-file-browser:browse-active-file-directory"
```

## Usage

The default controls for the file browser dialog:

* `j/k/Ctrl-f/Ctrl-b` - Move selection down/up/down-20/up-20.
* `Down/Up/PageDown/PageUp` - Alternate keys to move selection.
* `Esc` - Close the browser.
* `Enter` - Enter the selected directory or open the file.
* `-` - Go up to parent directory.
* `/` - Start entering search regex.
* `n/N` - Search forwards/backwards.

When entering a search regex:

* `Enter` - Finish and go to first matching entry.
* `Esc` - Cancel.

## License
atom-quick-file-browser is Nuclide licensed, as found in the LICENSE file.
