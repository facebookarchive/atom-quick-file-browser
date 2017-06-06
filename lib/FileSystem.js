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
