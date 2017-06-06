'use babel';
// @flow

import invariant from 'assert';
import path from 'path';

function notNull<T>(value: ?T): T {
  invariant(value != null);
  return value;
}

function queryBreadcrumb(): ?HTMLElement {
  return document.querySelector(
    '.quick-file-browser .quick-file-browser-breadcrumb',
  );
}

function queryEntriesList(): ?HTMLElement {
  return document.querySelector(
    '.quick-file-browser .quick-file-browser-entries ul',
  );
}

function queryEntriesElems(): NodeList<HTMLElement> {
  return document.querySelectorAll(
    '.quick-file-browser .quick-file-browser-entries ul li',
  );
}

function queryEntrySelected(): ?HTMLElement {
  return document.querySelector(
    '.quick-file-browser .quick-file-browser-entries ul li.selected',
  );
}

function querySearchInputFocused(): ?HTMLElement {
  return document.querySelector(
    '.quick-file-browser .quick-file-browser-search atom-text-editor.is-focused',
  );
}

function waitsForSettle(breadcrumbPred): void {
  waitsFor('ui to render', 5000, () => {
    const breadcrumb = queryBreadcrumb();
    return (
      breadcrumb &&
      queryEntriesList() &&
      (!breadcrumbPred || breadcrumbPred(breadcrumb.innerText || ''))
    );
  });
}

function waitsForElementToBeSelected(message: string, text: string): void {
  waitsFor(message, 500, () => {
    return notNull(queryEntrySelected()).innerText === text;
  });
}

describe('Quick file browser integration', () => {
  beforeEach(() => {
    jasmine.attachToDOM(atom.views.getView(atom.workspace));
    atom.packages.activatePackage('quick-file-browser');
  });

  it('can perform basic navigation and search', () => {
    let root: ?string;
    waitsForPromise(async () => {
      root = path.join(__dirname, 'fixtures');
      atom.project.addPath(root);
      await atom.workspace.open(`${root}/dir1/start.txt`);
    });

    // Activate
    runs(() => {
      const workspaceView = atom.views.getView(atom.workspace);
      atom.commands.dispatch(
        workspaceView,
        'quick-file-browser:browse-active-file-directory',
      );
    });
    waitsForSettle();

    runs(() => {
      invariant(root != null);
      expect(notNull(queryBreadcrumb()).innerText).toEqual(
        `${root}/dir1`,
        'navigated to the containing directory',
      );

      const entries = queryEntriesElems();
      const entryText = Array.from(entries).map(entry => entry.innerText);
      expect(entryText).toEqual(
        ['inner1/', 'inner2/', 'f1.txt', 'f2.txt', 'f3.txt', 'start.txt'],
        'lists directory contents in correct order',
      );
      expect(notNull(queryEntrySelected()).innerText).toEqual(
        'inner1/',
        'first entry should be initially selected',
      );

      atom.commands.dispatch(notNull(document.activeElement), 'core:move-down');
      // dispatchKeyboardEvent('j', document.activeElement);
    });
    waitsForElementToBeSelected('next element to be selected', 'inner2/');

    runs(() => {
      atom.commands.dispatch(notNull(document.activeElement), 'core:move-up');
      // dispatchKeyboardEvent('k', document.activeElement);
    });
    waitsForElementToBeSelected('previous element to be selected', 'inner1/');

    runs(() => {
      atom.commands.dispatch(notNull(document.activeElement), 'core:confirm');
      // dispatchKeyboardEvent('enter', document.activeElement);
    });
    waitsForSettle(text => text === `${notNull(root)}/dir1/inner1`);

    runs(() => {
      const entries = queryEntriesElems();
      const entryText = Array.from(entries).map(entry => entry.innerText);
      expect(entryText).toEqual(
        ['empty.txt'],
        'entry list updated to reflect the new folder contents',
      );

      atom.commands.dispatch(notNull(document.activeElement), 'quick-file-browser:parent-dir');
      // dispatchKeyboardEvent('-', document.activeElement);
    });
    waitsForSettle(text => text === `${notNull(root)}/dir1`);

    runs(() => {
      atom.commands.dispatch(notNull(document.activeElement), 'quick-file-browser:search');
      // dispatchKeyboardEvent('/', document.activeElement);
    });
    waitsFor('search box to focus', 500, () => {
      return querySearchInputFocused();
    });

    runs(() => {
      (querySearchInputFocused(): any).model.insertText('f[12]');
      atom.commands.dispatch(notNull(document.activeElement), 'core:confirm');
      // dispatchKeyboardEvent('enter', document.activeElement);
    });
    waitsForElementToBeSelected('first match to be selected', 'f1.txt');

    runs(() => {
      atom.commands.dispatch(notNull(document.activeElement), 'quick-file-browser:search-next');
      // dispatchKeyboardEvent('n', document.activeElement);
    });
    waitsForElementToBeSelected('next match be selected', 'f2.txt');

    runs(() => {
      atom.commands.dispatch(notNull(document.activeElement), 'quick-file-browser:search-previous');
      // dispatchKeyboardEvent('N', document.activeElement);
    });
    waitsForElementToBeSelected('prev match be selected', 'f1.txt');

    runs(() => {
      atom.commands.dispatch(notNull(document.activeElement), 'quick-file-browser:search-previous');
      // dispatchKeyboardEvent('N', document.activeElement);
    });
    waitsForElementToBeSelected('wrap-around match be selected', 'f2.txt');

    runs(() => {
      atom.commands.dispatch(notNull(document.activeElement), 'core:confirm');
      // dispatchKeyboardEvent('enter', document.activeElement);
    });
    waitsFor('browser to dismiss', 500, () => {
      const item: ?any = document.querySelector('.quick-file-browser');
      if (!item || !item.model) {
        return true;
      }
      return !notNull(item.model).isVisible();
    });
    waitsFor('correct file to be open', 500, () => {
      return (
        notNull(atom.workspace.getActiveTextEditor()).getPath() ===
        `${notNull(root)}/dir1/f2.txt`
      );
    });
  });
});
