'use babel';
// @flow

import type {Directory, File} from 'atom';

import React from 'react';
import ReactDOM from 'react-dom';
import {Observable} from 'rxjs/bundles/Rx.min.js';
import invariant from 'assert';

import nuclideUri from 'nuclide-commons/nuclideUri';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';
import {AtomInput} from 'nuclide-commons-ui/AtomInput';

import FileSystem from './FileSystem';

/** Line containing the directory. */
function Breadcrumb(props: {
  className: string,
  directory: Directory,
}): React.Element<any> {
  const display = nuclideUri.nuclideUriToDisplayString(
    props.directory.getPath(),
  );
  return <div className={props.className}>{display}</div>;
}

/** Line containing the search box. */
function SearchLine(props: {
  ref_: (elem: any) => void,
  className: string,
  onDidChange: (text: string) => void,
  onConfirm: () => void,
  onCancel: () => void,
}): React.Element<any> {
  return (
    <div className={props.className}>
      <AtomInput
        ref={(elem: AtomInput) => props.ref_(elem)}
        placeholderText="Search"
        onDidChange={props.onDidChange}
        onConfirm={props.onConfirm}
        onCancel={props.onCancel}
      />
    </div>
  );
}

/** A single entry in the listing */
class ListEntry extends React.PureComponent {
  props: {
    isSelected: boolean,
    isDirectory: boolean,
    searchRegex: ?RegExp,
    displayString: string,
  };

  render(): React.Element<any> {
    const iconClass = this.props.isDirectory
      ? 'icon icon-file-directory'
      : 'icon icon-file';
    const itemClass = this.props.isSelected
      ? 'list-item selected'
      : 'list-item';
    let display = this.props.displayString;
    if (this.props.searchRegex) {
      const result = this.props.searchRegex.exec(this.props.displayString);
      if (result) {
        const pre = this.props.displayString.slice(0, result.index);
        const mid = result[0];
        const post = this.props.displayString.slice(result.index + mid.length);
        display = (
          <span>
            {pre}<span className="text-highlight">{mid}</span>{post}
          </span>
        );
      }
    }
    return (
      <li className={itemClass}>
        <span className={iconClass}>{display}</span>
      </li>
    );
  }
}

type Props = {
  initialDirectory: Directory,
  onCancellation: () => void,
};

type State = {
  currentDirectory: Directory,
  entries: ?Array<File | Directory>,
  selected: number,
  inSearch: boolean,
  searchRegexp: ?RegExp,
};

export default class QuickBrowseControllerView extends React.Component {
  props: Props;
  state: State;
  _disposables: UniversalDisposable;
  _selectedElement: ?HTMLElement;
  _searchInputElement: ?AtomInput;
  _entriesElement: ?HTMLElement;

  constructor(props: Props) {
    super(props);
    this._disposables = new UniversalDisposable();
  }

  componentWillMount(): void {
    this._navigate(this.props.initialDirectory);
  }

  componentDidMount(): void {
    const node = ReactDOM.findDOMNode(this);
    invariant(node instanceof HTMLElement); // eslint-disable-line
    this._disposables.add(
      Observable.fromEvent(document, 'mousedown').subscribe(
        this._handleDocumentMouseDown.bind(this),
      ),
      // Support some core keys
      atom.commands.add(node, 'core:move-up', () => this._handleUp(1)),
      atom.commands.add(node, 'core:move-down', () => this._handleDown(1)),
      atom.commands.add(node, 'core:page-up', () => this._handleUp(20)),
      atom.commands.add(node, 'core:page-down', () => this._handleDown(20)),
      atom.commands.add(node, 'core:move-to-top', () =>
        this._handleUp(1000000),
      ),
      atom.commands.add(node, 'core:move-to-bottom', () =>
        this._handleDown(1000000),
      ),
      atom.commands.add(node, 'core:confirm', this._handleConfirm.bind(this)),
      atom.commands.add('body', 'core:cancel', this.props.onCancellation),
      // browse specific keys.
      atom.commands.add(
        node,
        'quick-file-browser:parent-dir',
        this._handleParent.bind(this),
      ),
      atom.commands.add(
        node,
        'quick-file-browser:search',
        this._handleSearch.bind(this),
      ),
      atom.commands.add(
        node,
        'quick-file-browser:search-next',
        this._handleSearchConfirm.bind(this),
      ),
      atom.commands.add(
        node,
        'quick-file-browser:search-previous',
        this._handleSearchPrevious.bind(this),
      ),
    );
  }

  componentWillUnmount(): void {
    const modalNode = ReactDOM.findDOMNode(this);
    invariant(modalNode instanceof HTMLElement); // eslint-disable-line
    modalNode.blur();
    this._disposables.dispose();
    this._disposables = new UniversalDisposable();
  }

  componentDidUpdate(): void {
    // keep selected element in view.
    if (this._selectedElement) {
      (this._selectedElement: any).scrollIntoViewIfNeeded(false);
    }

    // Maintain focus
    if (this.state.inSearch && this._searchInputElement) {
      // If we are searching, search box is in focus.
      this._searchInputElement.focus();
    } else if (this._entriesElement) {
      // If we are not searching, entries list is in focus.
      this._entriesElement.focus();
    }
  }

  render(): React.Element<any> {
    return (
      <div className="quick-file-browser-root">
        <Breadcrumb
          className="quick-file-browser-breadcrumb panel-heading"
          directory={this.state.currentDirectory}
        />
        <div
          ref={(elem: HTMLElement) => {
            this._entriesElement = elem;
          }}
          className="inset-panel padded quick-file-browser-entries"
          tabIndex="0">
          {this._renderEntries(this.state.entries)}
        </div>
        {this.state.inSearch &&
          <SearchLine
            ref_={(elem: AtomInput) => {
              this._searchInputElement = elem;
            }}
            className="quick-file-browser-search"
            onDidChange={text => this._handleSearchDidChange(text)}
            onConfirm={this._handleSearchConfirm.bind(this)}
            onCancel={() =>
              this.setState({inSearch: false, searchRegexp: null})}
          />}
      </div>
    );
  }

  _renderEntries(entries: ?Array<File | Directory>): React.Element<any> {
    if (!entries) {
      return (
        <div>
          <span className="loading loading-spinner-tiny inline-block" />
          Loading...
        </div>
      );
    }
    return (
      <ul className="list-group">
        {entries.map((entry, idx) => {
          const isSelected = idx === this.state.selected;
          const ref = isSelected
            ? elem => {
                this._selectedElement = (ReactDOM.findDOMNode(elem): any);
              }
            : undefined;
          return (
            <ListEntry
              key={idx}
              ref={ref}
              isSelected={isSelected}
              isDirectory={entry.isDirectory()}
              displayString={
                nuclideUri.basename(entry.getPath()) +
                  (entry.isDirectory() ? '/' : '')
              }
              searchRegex={this.state.searchRegexp}
            />
          );
        })}
      </ul>
    );
  }

  _navigate(directory: Directory) {
    // Set the new directory immediately, this display a loading screen.
    this.setState({
      currentDirectory: directory,
      entries: null,
      selected: 0,
      inSearch: false,
      searchRegexp: null,
    });

    // Fetch and populate the entries once available.
    FileSystem.getEntries(directory).then(entries => {
      const dirs = entries.filter(val => val.isDirectory());
      const files = entries.filter(val => !val.isDirectory());
      this.setState({
        currentDirectory: directory,
        entries: dirs.concat(files),
      });
    });
  }

  /** Handler to dismiss if mouse clicked outside the modal dialog. */
  _handleDocumentMouseDown(event: Event): void {
    const rootNode = ReactDOM.findDOMNode(this);
    if (
      rootNode &&
      event.target !== rootNode &&
      !rootNode.contains((event.target: any))
    ) {
      this.props.onCancellation();
    }
  }

  _handleUp(count: number): void {
    this.setState({
      selected: Math.max(0, this.state.selected - count),
    });
  }

  _handleDown(count: number): void {
    this.setState({
      selected: Math.min(
        this.state.entries ? this.state.entries.length - 1 : 0,
        this.state.selected + count,
      ),
    });
  }

  _handleConfirm(): void {
    if (this.state.entries) {
      const entry = this.state.entries[this.state.selected];
      if (entry.isDirectory()) {
        this._navigate((entry: any));
      } else {
        // eslint-disable-next-line nuclide-internal/atom-apis
        atom.workspace.open(entry.getPath(), {
          pending: true,
        });
        this.props.onCancellation();
      }
    }
  }

  _handleParent(): void {
    this._navigate(this.state.currentDirectory.getParent());
  }

  _handleSearch(): void {
    this.setState({inSearch: true, searchRegexp: null});
  }

  _handleSearchDidChange(text: string): void {
    let searchRegexp;
    try {
      searchRegexp = new RegExp(text);
    } catch (e) {
      searchRegexp = null;
    }
    this.setState({searchRegexp});
  }

  _handleSearchConfirm(): void {
    // Find first match.
    let result = this._find(this.state.selected, 'forward');
    if (result !== -1) {
      return this.setState({inSearch: false, selected: result});
    }

    // wrap around.
    result = this._find(0, 'forward');
    if (result !== -1) {
      return this.setState({inSearch: false, selected: result});
    }

    this.setState({inSearch: false});
  }

  _handleSearchPrevious(): void {
    let result = this._find(this.state.selected, 'backward');
    if (result !== -1) {
      return this.setState({selected: result});
    }

    // wrap around.
    if (!this.state.entries) {
      return;
    }
    result = this._find(this.state.entries.length, 'backward');
    if (result !== -1) {
      return this.setState({selected: result});
    }
  }

  _find(from: number, dir: 'forward' | 'backward'): number {
    if (!this.state.entries || !this.state.searchRegexp) {
      return -1;
    }

    switch (dir) {
      case 'forward':
        for (let i = from + 1; i < this.state.entries.length; i++) {
          if (
            this.state.searchRegexp.exec(this.state.entries[i].getBaseName())
          ) {
            return i;
          }
        }
        break;
      case 'backward':
        for (let i = from - 1; i >= 0; i--) {
          if (
            this.state.searchRegexp.exec(this.state.entries[i].getBaseName())
          ) {
            return i;
          }
        }
        break;
    }

    return -1;
  }
}
