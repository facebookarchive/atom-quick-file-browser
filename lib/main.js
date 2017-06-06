'use babel';
/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */


import type {Directory} from 'atom';

import createPackage from 'nuclide-commons-atom/createPackage';
import {getFileForPath} from 'nuclide-commons-atom/projects';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';
import nuclideUri from 'nuclide-commons/nuclideUri';

import QuickBrowseControllerView from './QuickBrowseControllerView';

import invariant from 'assert';
import React from 'react';
import ReactDOM from 'react-dom';

class Activation {
  _disposables: UniversalDisposable;
  _panel: ?atom$Panel;
  _previousFocus: ?HTMLElement;

  constructor(state: ?mixed) {
    // TODO(yiding): Add activation code here.
    this._disposables = new UniversalDisposable();
    this._disposables.add(
      atom.commands.add('atom-workspace', {
        'quick-file-browser:browse-active-file-directory': () => {
          const editor = atom.workspace.getActiveTextEditor();
          if (!editor) {
            atom.notifications.addWarning("Can't open quick-file-browser.", {
              description: 'No active editor selected.',
            });
            return;
          }
          const uri = editor.getPath();
          if (!uri) {
            atom.notifications.addWarning("Can't open quick-file-browser.", {
              description: 'Active editor is not opened to a valid file.',
            });
            return;
          }
          const path = getFileForPath(uri);
          if (!path) {
            const displayUri = nuclideUri.nuclideUriToDisplayString(uri);
            atom.notifications.addError("Can't open quick-file-browser.", {
              description: `Can't access directory "${displayUri}"`,
            });
            return;
          }
          this._browseDirectory(path.getParent(), path.getBaseName());
        },
      }),
    );
  }

  dispose(): void {
    this._disposables.dispose();
  }

  _browseDirectory(dir: Directory, initialEntryName: string): void {
    if (!this._panel) {
      this._panel = atom.workspace.addModalPanel({
        item: document.createElement('div'),
        visible: false,
        className: 'quick-file-browser',
      });
    }
    const panel = this._panel;
    invariant(panel != null);

    const component = ReactDOM.render(
      <QuickBrowseControllerView
        initialDirectory={dir}
        initialEntryName={initialEntryName}
        onCancellation={this._closePanel.bind(this)}
      />,
      panel.getItem(),
    );
    invariant(component instanceof QuickBrowseControllerView);

    this._previousFocus = document.activeElement;
    if (!panel.isVisible()) {
      panel.show();
    }
  }

  _closePanel(): void {
    const panel = this._panel;
    invariant(panel);
    ReactDOM.unmountComponentAtNode(panel.getItem());
    panel.hide();
    if (this._previousFocus) {
      this._previousFocus.focus();
    }
  }
}

createPackage(module.exports, Activation);
