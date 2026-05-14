/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Contact {
  id: string;
  name: string;
  phone: string;
  group?: string;
  addedAt: number;
}

export interface MessageVariation {
  id: string;
  text: string;
  type: 'ai' | 'manual';
}

export interface Campaign {
  id: string;
  name: string;
  baseMessage: string;
  variations: MessageVariation[];
  createdAt: number;
}
