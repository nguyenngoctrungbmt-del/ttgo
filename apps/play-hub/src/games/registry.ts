import type { ActionInfo } from '../data/actionKit'
import type { GameId } from '../data/games'
import { INFO as asteroids } from './asteroids/info'
import { INFO as defense } from './defense/info'
import { INFO as knife } from './knife/info'
import { INFO as ninja } from './ninja/info'
import { INFO as orbit } from './orbit/info'
import { INFO as parry } from './parry/info'
import { INFO as slash } from './slash/info'
import { INFO as swing } from './swing/info'
import { INFO as tank } from './tank/info'
import { INFO as zombie } from './zombie/info'
import { INFO as jetpack } from './jetpack/info'
import { INFO as pulse } from './pulse/info'
import { INFO as brawler } from './brawler/info'
import { INFO as archer } from './archer/info'
import { INFO as goalie } from './goalie/info'
import { INFO as boxing } from './boxing/info'
import { INFO as helix } from './helix/info'
import { INFO as hoops } from './hoops/info'
import { INFO as racer } from './racer/info'
import { INFO as drift } from './drift/info'
import { INFO as slither } from './slither/info'
import { INFO as hole } from './hole/info'
import { INFO as bubble } from './bubble/info'
import { INFO as pinball } from './pinball/info'
import { INFO as galaga } from './galaga/info'
import { INFO as bullet } from './bullet/info'
import { INFO as copter } from './copter/info'
import { INFO as hopper } from './hopper/info'
import { INFO as catapult } from './catapult/info'
import { INFO as bowduel } from './bowduel/info'
import { INFO as towerdef } from './towerdef/info'
import { INFO as mech } from './mech/info'
import { INFO as dungeon } from './dungeon/info'
import { INFO as ski } from './ski/info'
import { INFO as surf } from './surf/info'
import { INFO as bmx } from './bmx/info'
import { INFO as sumo } from './sumo/info'
import { INFO as hockey } from './hockey/info'
import { INFO as fisher } from './fisher/info'
import { INFO as miner } from './miner/info'
import { INFO as spinner } from './spinner/info'
import { INFO as paint } from './paint/info'
import { INFO as blocks } from './blocks/info'
import { INFO as smash } from './smash/info'
import { INFO as beats } from './beats/info'
import { INFO as dogfight } from './dogfight/info'
import { INFO as gravity } from './gravity/info'
import { INFO as bouncy } from './bouncy/info'
import { INFO as lumber } from './lumber/info'
import { INFO as sniper } from './sniper/info'
import { INFO as matrix } from './matrix/info'
import { INFO as cups } from './cups/info'
import { INFO as darkmaze } from './darkmaze/info'
import { INFO as changed } from './changed/info'
import { INFO as nback } from './nback/info'
import { INFO as flashcount } from './flashcount/info'
import { INFO as faces } from './faces/info'
import { INFO as melody } from './melody/info'
import { INFO as recipe } from './recipe/info'
import { INFO as route } from './route/info'
import { INFO as crane } from './crane/info'
import { INFO as bridge } from './bridge/info'
import { INFO as tinycity } from './tinycity/info'
import { INFO as tumble } from './tumble/info'
import { INFO as roads } from './roads/info'
import { INFO as sandcastle } from './sandcastle/info'
import { INFO as blueprint } from './blueprint/info'
import { INFO as domino } from './domino/info'
import { INFO as mergetown } from './mergetown/info'
import { INFO as rocket } from './rocket/info'
import { INFO as fruitmerge } from './fruitmerge/info'
import { INFO as dropmerge } from './dropmerge/info'
import { INFO as chainmerge } from './chainmerge/info'
import { INFO as hexsort } from './hexsort/info'
import { INFO as mergedefense } from './mergedefense/info'
import { INFO as gunmerge } from './gunmerge/info'
import { INFO as carmerge } from './carmerge/info'
import { INFO as planetmerge } from './planetmerge/info'
import { INFO as farmmerge } from './farmmerge/info'
import { INFO as potionmerge } from './potionmerge/info'
import { INFO as busjam } from './busjam/info'
import { INFO as parkingjam } from './parkingjam/info'
import { INFO as blockjam } from './blockjam/info'
import { INFO as arrowescape } from './arrowescape/info'
import { INFO as sandblast } from './sandblast/info'
import { INFO as goodssort } from './goodssort/info'
import { INFO as screwjam } from './screwjam/info'
import { INFO as numbermerge } from './numbermerge/info'
import { INFO as allinhole } from './allinhole/info'
import { INFO as lanedefense } from './lanedefense/info'

/** Self-contained action games: each folder's info.ts declares meta, missions and upgrades. */
export const ACTION_INFOS: ActionInfo[] = [
  slash,
  asteroids,
  tank,
  ninja,
  orbit,
  parry,
  defense,
  swing,
  zombie,
  knife,
  jetpack,
  pulse,
  brawler,
  archer,
  goalie,
  boxing,
  helix,
  hoops,
  racer,
  drift,
  slither,
  hole,
  bubble,
  pinball,
  galaga,
  bullet,
  copter,
  hopper,
  catapult,
  bowduel,
  towerdef,
  mech,
  dungeon,
  ski,
  surf,
  bmx,
  sumo,
  hockey,
  fisher,
  miner,
  spinner,
  paint,
  blocks,
  smash,
  beats,
  dogfight,
  gravity,
  bouncy,
  lumber,
  sniper,
  matrix,
  cups,
  darkmaze,
  changed,
  nback,
  flashcount,
  faces,
  melody,
  recipe,
  route,
  crane,
  bridge,
  tinycity,
  tumble,
  roads,
  sandcastle,
  blueprint,
  domino,
  mergetown,
  rocket,
  fruitmerge,
  dropmerge,
  chainmerge,
  hexsort,
  mergedefense,
  gunmerge,
  carmerge,
  planetmerge,
  farmmerge,
  potionmerge,
  busjam,
  parkingjam,
  blockjam,
  arrowescape,
  sandblast,
  goodssort,
  screwjam,
  numbermerge,
  allinhole,
  lanedefense,
]

export function actionInfo(id: GameId): ActionInfo | undefined {
  return ACTION_INFOS.find((i) => i.meta.id === id)
}
