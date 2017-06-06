'use babel';
// @flow

import {Directory, File} from 'atom';

export function getEntries(
  directory: Directory,
): Promise<$ReadOnlyArray<File | Directory>> {
  return new Promise((resolve, reject) => {
    directory.getEntries((error, entries) => {
      if (error) {
        reject(error);
        return;
      }
      // Erasing the type here since array elements are invariant, but this
      // always return subtypes of elements.
      resolve(entries || []);
    });
  });
}

export default {
  getEntries,
};
