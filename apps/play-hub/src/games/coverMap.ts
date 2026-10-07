import type { ComponentType } from 'react'
import type { GameId } from '../data/games'
import SlashCover from './slash/Cover'
import AsteroidsCover from './asteroids/Cover'
import TankCover from './tank/Cover'
import NinjaCover from './ninja/Cover'
import OrbitCover from './orbit/Cover'
import ParryCover from './parry/Cover'
import DefenseCover from './defense/Cover'
import SwingCover from './swing/Cover'
import ZombieCover from './zombie/Cover'
import KnifeCover from './knife/Cover'
import JetpackCover from './jetpack/Cover'
import PulseCover from './pulse/Cover'
import BrawlerCover from './brawler/Cover'
import ArcherCover from './archer/Cover'
import GoalieCover from './goalie/Cover'
import BoxingCover from './boxing/Cover'
import HelixCover from './helix/Cover'
import HoopsCover from './hoops/Cover'
import RacerCover from './racer/Cover'
import DriftCover from './drift/Cover'
import SlitherCover from './slither/Cover'
import HoleCover from './hole/Cover'
import BubbleCover from './bubble/Cover'
import PinballCover from './pinball/Cover'
import GalagaCover from './galaga/Cover'
import BulletCover from './bullet/Cover'
import CopterCover from './copter/Cover'
import HopperCover from './hopper/Cover'
import CatapultCover from './catapult/Cover'
import BowduelCover from './bowduel/Cover'
import TowerdefCover from './towerdef/Cover'
import MechCover from './mech/Cover'
import DungeonCover from './dungeon/Cover'
import SkiCover from './ski/Cover'
import SurfCover from './surf/Cover'
import BmxCover from './bmx/Cover'
import SumoCover from './sumo/Cover'
import HockeyCover from './hockey/Cover'
import FisherCover from './fisher/Cover'
import MinerCover from './miner/Cover'
import SpinnerCover from './spinner/Cover'
import PaintCover from './paint/Cover'
import BlocksCover from './blocks/Cover'
import SmashCover from './smash/Cover'
import BeatsCover from './beats/Cover'
import DogfightCover from './dogfight/Cover'
import GravityCover from './gravity/Cover'
import BouncyCover from './bouncy/Cover'
import LumberCover from './lumber/Cover'
import SniperCover from './sniper/Cover'
import MatrixCover from './matrix/Cover'
import CupsCover from './cups/Cover'
import DarkmazeCover from './darkmaze/Cover'
import ChangedCover from './changed/Cover'
import NbackCover from './nback/Cover'
import FlashcountCover from './flashcount/Cover'
import FacesCover from './faces/Cover'
import MelodyCover from './melody/Cover'
import RecipeCover from './recipe/Cover'
import RouteCover from './route/Cover'
import CraneCover from './crane/Cover'
import BridgeCover from './bridge/Cover'
import TinycityCover from './tinycity/Cover'
import TumbleCover from './tumble/Cover'
import RoadsCover from './roads/Cover'
import SandcastleCover from './sandcastle/Cover'
import BlueprintCover from './blueprint/Cover'
import DominoCover from './domino/Cover'
import MergetownCover from './mergetown/Cover'
import RocketCover from './rocket/Cover'
import FruitmergeCover from './fruitmerge/Cover'
import DropmergeCover from './dropmerge/Cover'
import ChainmergeCover from './chainmerge/Cover'
import HexsortCover from './hexsort/Cover'
import MergedefenseCover from './mergedefense/Cover'
import GunmergeCover from './gunmerge/Cover'
import CarmergeCover from './carmerge/Cover'
import PlanetmergeCover from './planetmerge/Cover'
import FarmmergeCover from './farmmerge/Cover'
import PotionmergeCover from './potionmerge/Cover'
import BusjamCover from './busjam/Cover'
import ParkingjamCover from './parkingjam/Cover'
import BlockjamCover from './blockjam/Cover'
import ArrowescapeCover from './arrowescape/Cover'
import SandblastCover from './sandblast/Cover'
import GoodssortCover from './goodssort/Cover'
import ScrewjamCover from './screwjam/Cover'
import NumbermergeCover from './numbermerge/Cover'
import AllinholeCover from './allinhole/Cover'
import LanedefenseCover from './lanedefense/Cover'

/** All cover components — loaded as a separate chunk (see covers.ts). */
export const COVER_MAP: Partial<Record<GameId, ComponentType>> = {
  slash: SlashCover,
  asteroids: AsteroidsCover,
  tank: TankCover,
  ninja: NinjaCover,
  orbit: OrbitCover,
  parry: ParryCover,
  defense: DefenseCover,
  swing: SwingCover,
  zombie: ZombieCover,
  knife: KnifeCover,
  jetpack: JetpackCover,
  pulse: PulseCover,
  brawler: BrawlerCover,
  archer: ArcherCover,
  goalie: GoalieCover,
  boxing: BoxingCover,
  helix: HelixCover,
  hoops: HoopsCover,
  racer: RacerCover,
  drift: DriftCover,
  slither: SlitherCover,
  hole: HoleCover,
  bubble: BubbleCover,
  pinball: PinballCover,
  galaga: GalagaCover,
  bullet: BulletCover,
  copter: CopterCover,
  hopper: HopperCover,
  catapult: CatapultCover,
  bowduel: BowduelCover,
  towerdef: TowerdefCover,
  mech: MechCover,
  dungeon: DungeonCover,
  ski: SkiCover,
  surf: SurfCover,
  bmx: BmxCover,
  sumo: SumoCover,
  hockey: HockeyCover,
  fisher: FisherCover,
  miner: MinerCover,
  spinner: SpinnerCover,
  paint: PaintCover,
  blocks: BlocksCover,
  smash: SmashCover,
  beats: BeatsCover,
  dogfight: DogfightCover,
  gravity: GravityCover,
  bouncy: BouncyCover,
  lumber: LumberCover,
  sniper: SniperCover,
  matrix: MatrixCover,
  cups: CupsCover,
  darkmaze: DarkmazeCover,
  changed: ChangedCover,
  nback: NbackCover,
  flashcount: FlashcountCover,
  faces: FacesCover,
  melody: MelodyCover,
  recipe: RecipeCover,
  route: RouteCover,
  crane: CraneCover,
  bridge: BridgeCover,
  tinycity: TinycityCover,
  tumble: TumbleCover,
  roads: RoadsCover,
  sandcastle: SandcastleCover,
  blueprint: BlueprintCover,
  domino: DominoCover,
  mergetown: MergetownCover,
  rocket: RocketCover,
  fruitmerge: FruitmergeCover,
  dropmerge: DropmergeCover,
  chainmerge: ChainmergeCover,
  hexsort: HexsortCover,
  mergedefense: MergedefenseCover,
  gunmerge: GunmergeCover,
  carmerge: CarmergeCover,
  planetmerge: PlanetmergeCover,
  farmmerge: FarmmergeCover,
  potionmerge: PotionmergeCover,
  busjam: BusjamCover,
  parkingjam: ParkingjamCover,
  blockjam: BlockjamCover,
  arrowescape: ArrowescapeCover,
  sandblast: SandblastCover,
  goodssort: GoodssortCover,
  screwjam: ScrewjamCover,
  numbermerge: NumbermergeCover,
  allinhole: AllinholeCover,
  lanedefense: LanedefenseCover,
}
