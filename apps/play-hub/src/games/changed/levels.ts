/**
 * Signature levels for Spot the Change: curated casts, palettes and rule mixes blended into the
 * endless generator. Every 5th level is a boss scene (hearts at stake, double points).
 * Validated by the lv5 scene checker (every scene can produce exactly its change count).
 */
import type { Kind, Theme } from './art'
import type { ChangeType } from './scene'

export type SceneSig = {
  name: string
  sub: string
  theme: Theme
  boss?: boolean
  objs?: number
  changes?: number
  types?: ChangeType[]
  kinds?: Kind[]
  colors?: string[]
  /** Multiplier on the study time. */
  memo?: number
}

const ALL: ChangeType[] = ['vanish', 'appear', 'move', 'color', 'turn']

export const SIGNATURE: Record<number, SceneSig> = {
  1: { name: 'Tidy Room', sub: 'one thing will disappear', theme: 'room', objs: 4, changes: 1, types: ['vanish'], memo: 1.2 },
  2: { name: 'Duck Pond', sub: 'something new arrives', theme: 'park', objs: 5, changes: 1, types: ['appear'], kinds: ['duck', 'tree', 'flower', 'bench'] },
  3: { name: 'Shifting Desk', sub: 'one object moves', theme: 'desk', objs: 5, changes: 1, types: ['move'] },
  4: { name: 'Fish Tank', sub: 'gone, new or moved?', theme: 'aquarium', objs: 6, changes: 1, types: ['vanish', 'appear', 'move'] },
  5: { name: 'Boss · Birthday Party', sub: 'two changes at the party', theme: 'room', boss: true, objs: 8, changes: 2, types: ['vanish', 'appear', 'move', 'color'], kinds: ['balloon', 'gift', 'cupcake', 'cat', 'ball'] },
  6: { name: 'Lazy Sunday', sub: 'a gentle breather', theme: 'park', objs: 5, changes: 1, memo: 1.15 },
  7: { name: 'Mirror Mirror', sub: 'something turned around', theme: 'room', objs: 7, changes: 1, types: ['turn'], kinds: ['mug', 'cat', 'lamp', 'frame', 'gift', 'plant'] },
  8: { name: 'Paint Shop', sub: 'two things changed colour', theme: 'desk', objs: 8, changes: 2, types: ['color'] },
  10: { name: 'Boss · Coral Reef', sub: 'three changes in the deep', theme: 'aquarium', boss: true, objs: 10, changes: 3, types: ALL },
  11: { name: 'Calm Waters', sub: 'a breather by the sea', theme: 'aquarium', objs: 7, changes: 1, memo: 1.15 },
  12: { name: 'Rainbow Garden', sub: 'colours shift among the flowers', theme: 'park', objs: 9, changes: 2, types: ['color', 'appear'], kinds: ['flower', 'butterfly', 'balloon'] },
  13: { name: 'Vanishing Act', sub: 'three things disappear', theme: 'room', objs: 10, changes: 3, types: ['vanish'] },
  15: { name: 'Boss · Exam Night', sub: 'a cluttered desk · three changes', theme: 'desk', boss: true, objs: 12, changes: 3, types: ALL },
  17: { name: 'Two Tones', sub: 'everything in blue and white', theme: 'desk', objs: 10, changes: 2, types: ['move', 'turn', 'vanish', 'color'], colors: ['#f8fafc', '#3b82f6'] },
  18: { name: 'Crab Shuffle', sub: 'the crabs keep wandering', theme: 'aquarium', objs: 9, changes: 2, types: ['move'], kinds: ['crab', 'shell', 'starfish'] },
  20: { name: 'Boss · The Toy Box', sub: 'toys everywhere · three changes', theme: 'room', boss: true, objs: 13, changes: 3, types: ALL, kinds: ['ball', 'gift', 'balloon', 'cat', 'cupcake'] },
  22: { name: 'Duck Parade', sub: 'nothing but ducks', theme: 'park', objs: 8, changes: 2, types: ['turn', 'move', 'vanish'], kinds: ['duck'] },
  23: { name: 'Quiet Desk', sub: 'a breather', theme: 'desk', objs: 7, changes: 1, memo: 1.2 },
  25: { name: 'Boss · Deep Sea', sub: 'a crowded reef, a short look', theme: 'aquarium', boss: true, objs: 14, changes: 3, types: ALL, memo: 0.9 },
  27: { name: 'Library', sub: 'books turn, frames recolour', theme: 'desk', objs: 11, changes: 2, types: ['turn', 'color'], kinds: ['book', 'frame', 'lamp', 'clock', 'pencil'] },
  28: { name: 'Fruit Bowl', sub: 'apples and cupcakes', theme: 'park', objs: 10, changes: 2, types: ['vanish', 'appear', 'color'], kinds: ['apple', 'cupcake', 'flower'] },
  30: { name: 'Boss · Grand Hall', sub: 'a full room · three changes', theme: 'room', boss: true, objs: 15, changes: 3, types: ALL, memo: 0.95 },
  33: { name: 'Picnic Rush', sub: 'everything moves', theme: 'park', objs: 12, changes: 3, types: ['move'], kinds: ['apple', 'cupcake', 'bench', 'ball', 'flower'] },
  35: { name: 'Boss · Shipwreck', sub: 'treasure, crabs and jellies', theme: 'aquarium', boss: true, objs: 15, changes: 3, types: ALL, kinds: ['chest', 'crab', 'fish', 'jelly', 'seaweed', 'shell'] },
  37: { name: 'Night Shift', sub: 'two tones on the desk', theme: 'desk', objs: 13, changes: 3, types: ['turn', 'color', 'move'], colors: ['#facc15', '#3b82f6', '#78350f'] },
  40: { name: 'Boss · Everything Changes', sub: 'four changes · find them all', theme: 'room', boss: true, objs: 16, changes: 4, types: ALL, memo: 1.1 },
}

export const AUTHORED = 40
