import type { AuthoredLevel } from './levels'

/**
 * Hand-designed Goods Sort levels (layouts written per level; goods placement verified solvable by a
 * scripted solver playout). Arc: 1–5 basics, 6–10 locked shelves, 11–15 frozen goods, 16–20 conveyor
 * belts, 21–25 deep stacks and tight space, 26–30 everything at once. Every 5th level is a HARD level.
 * Goods: a jam b soda c milk d donut e bear f lipstick g chips h juice i duck j perfume k cupcake
 * l melon m cone n lime o ball p honey q cheese r robot.
 */
export const AUTHORED: AuthoredLevel[] = [
  { name: 'Opening Day', time: 35, tip: 'drag goods to make 3 of a kind', rows: [['gb.', '.bg', '.gb']] },
  { name: 'Back Stock', time: 55, tip: 'goods behind slide forward', rows: [['gg./cbb', 'gg./bcb', 'b.b/gcg']] },
  { name: 'Two Aisles', time: 70, tip: 'clear fast to chain combos', rows: [['k.d', '..k/pp.', 'kap'], ['app/adk', 'kdk', 'p.d/dd.']] },
  { name: 'Toy Pyramid', time: 90, tip: 'empty spots are your workspace', rows: [['', 'r../eii'], ['er./ioi', '', 'er./eoi'], ['oer/iei', 'ree/e..', 'ori/oio']] },
  { name: 'Grand Opening', time: 120, rows: [['ah./b.c', 'cph/hbg', 'cg./bkb'], ['.ka/dbb', '.da/kph/ggc', 'aad/dpd'], ['gka/bpp', 'hpb/kbd', 'hcc/k.g']] },
  { name: 'Lock & Key', time: 55, tip: 'a locked shelf opens after a few clears', rows: [['.jj', 'fjj', 'fj.'], ['f..', '#2:llj/f..', 'ffl']] },
  { name: 'Beauty Counter', time: 90, rows: [['jaj/.am', 'm../ffe', 'emj/ja.'], ['..f/eej', '#3:aea/fmf', 'amf/jme']] },
  { name: 'Back Room', time: 130, rows: [['#2:bdh/gqb', 'gdd/qb.', '#5:chg/hbc'], ['hgc/cch', 'q.g', 'gbg/gqb'], ['hbd/cqd', 'ccq', 'c.d/bbg']] },
  { name: 'Tight Squeeze', time: 140, tip: 'only two free slots — plan ahead', rows: [['llk/plh/pkl', 'nlp/nkp/hnh', 'pnn/h.k/kpl'], ['.pn/hkn/hpk', 'k.l/lph/nhn', 'lnl/lnh/knl']] },
  { name: 'The Vault', time: 140, rows: [['#2:dic/bgd', 'd.f/cfb/baf', '#4:hbd/iee'], ['g.g/ad./cbh', 'bfi/bed', '.ci/aie/gca'], ['#6:ahf/abg', 'ch./hha/e.i', '#8:bea/agf']] },
  { name: 'Ice Delivery', time: 70, tip: 'frozen goods thaw as you clear', rows: [['bmb', 'cb2m/kk.', 'c1.c2'], ['c.k/k.c', '.mk', 'km./mcm']] },
  { name: 'Frozen Aisle', time: 120, rows: [['qcb/kck', 'cmm', 'qmq/k.c'], ['cb./cqq', 'b1.c/kqb', 'm.k/.b1c'], ['m.k/bcc', 'mc2c', 'mmc/cc3m1']] },
  { name: 'Freezer Lock', time: 140, rows: [['q.k/h2cc', 'gm2k/q.k', 'mgg/g.k'], ['qmq/hgh', '#3:mqk/cgm/qgc', 'chm/mqg'], ['.hc/kqc', 'ckm/qg2c', '.m./hkk3']] },
  { name: 'Cold Snap', time: 120, tip: 'free the right goods first', rows: [['.nc/p1c2k', 'pmk3/pkm/kck', 'mm./mc1p'], ['nmj4/ckj/ncn', 'cmn/p3nj', '.jm/pmc3/jjc']] },
  { name: 'Deep Freeze', time: 165, rows: [['.cc/hcp/kcb', 'qbc/qbc/mcc', 'm4bq/h1ck/mck'], ['.qb2/qck1/mnp', '#4:bpm/chb', 'bn2c/ph4q/kch'], ['kmc/qpp/kkm', '.nh/q../mnk', 'cm./bq2c1/nnc']] },
  { name: 'Conveyor', time: 90, moving: 1, tip: 'the middle row is a conveyor belt', rows: [['ooi', 'o.e', 'e.o'], ['bbe/ibb', 'ioe', 'bie/i.i', 'i..'], ['beo', 'iei', '.ee']] },
  { name: 'Belt & Lock', time: 135, moving: 1, rows: [['eie/rri', '#3:ooe', '.ee/roi'], ['re./rio', 'aeg/ggr', 'aei/aeg', 'oig/roo'], ['rao/ria', 'o..', 'i.a/ig.']] },
  { name: 'Sushi Train', time: 150, moving: 2, rows: [['.m2p/clh', 'lc./hch', 'mlm/nn1c'], ['cn./ppm', 'lpm/hc.', 'lpm/n2cn'], ['hpc/nln', '.pl/nnl', 'hp./h3ch', 'mlm/mhp']] },
  { name: 'Toybox Express', time: 180, moving: 0, rows: [['jr./jrj/jrr', 'jff/eif/eik', 'oei/oke/ree', '.ei/ofr/rko'], ['ook/ief', '.kf/eoj', 'jko/.re'], ['ije/kff', 'ek./ifo', '.ji/ikr']] },
  { name: 'Rush Hour', time: 165, moving: 1, rows: [['pda/mhk', '#3:pgq/acp/cad', 'ha./qgc'], ['h1hk/abd/qgc', 'dc2g/bbm/dpg', 'bqk/bqp1/dmc', 'dd4a/mc./qmh'], ['amg', '#6:adh/cbp/bbk', '.kb/kac']] },
  { name: 'Deep Stock', time: 115, tip: 'tall stacks hide goods four deep', rows: [['kd.', 'd.a/adp/dqp/dqa', 'kaq'], ['..q/p.a/pkk/kaq', '.dp', 'qpd/kdk/pdp/kkp']] },
  { name: 'Twin Towers', time: 140, rows: [['hgg/hba/hnn/bcg', '', 'nan/..c/cnh/cag'], ['bbc/bgb', '', 'gnb/hgn'], ['..a/hah', 'hc./cng/nga', 'b.c/hbc']] },
  { name: 'Honeycomb', time: 150, moving: 1, rows: [['', 'ddl/pkh/npd'], ['p.h/ldl', 'nn./lkl', 'p.n/.ph', 'nlk/nkp'], ['hdl/lkd/hlh', '', 'pk./dhk/hnp'], ['', 'k.d/pdn/hnk']] },
  { name: 'Last Slot', time: 135, tip: 'one free slot — every move counts', rows: [['gfh/eec', 'gbh/..h', 'fhd/fe.'], ['dbh/gae', 'bdg/abb', 'adg/fgh'], ['.dd/bcc', 'cff/.e.', 'cea/aac']] },
  { name: 'Warehouse', time: 210, rows: [['aed/hbg/hbd', '.ee/fgl/kdh', 'cid/ach/gle'], ['gdf/gfi/abk', 'a1he/bik', 'cd./cef/hab'], ['gd./b2fa/hgd', 'k3eb/chh', 'f.g/jji/cac'], ['i.i3/jb./dcl', 'beg/aje/klj', 'fkf2/lca/flj']] },
  { name: 'Bear Market', time: 90, rows: [['ee./.oe', '.e./iie', 'oro/err'], ['eii/ioo', 'i.o/ere', 'r.i/rii']] },
  { name: 'Locksmith', time: 155, rows: [['#2:fjm/joj', '.q./o.r', '#4:aqo/qom'], ['q.o/aqf', '#6:faf/acq/off', 'orc/rcj'], ['arf/jrf/jmj', '.ma/ojo', 'mjf/cmc/.rc']] },
  { name: 'Glacier Belt', time: 195, moving: 1, rows: [['lm./pl3c4', 'c3nk/n2nm1/hbp', '.b./mll'], ['bp4h/pnl/hlc', 'bhp/bnl/knb', '.mm/.kp/bmh', 'chl/pnb/ckn'], ['kck/nbc', 'c.c/lm5h/mkh', 'kpp/k4hm']] },
  { name: 'Mega Mart', time: 265, rows: [['hae/ena/dlc', 'adb/.dn/bdg', 'l.d/fi1d/ejf'], ['cgk/kdi/ffi', '.ka/efb/dhb', 'ca3d/lch/hec'], ['mif/bmn/cjl', '.jm/all4/fmj', 'mic/mgn/bnk'], ['afe/bgf2/nek', 'aha/jgk/cji', 'b../hbg/cee']] },
  { name: 'Black Friday', time: 240, moving: 1, rows: [['b.l/nha/jab', '#2:oep/dil/bmo', '.on/hge/ebm'], ['gl./anb/kfj', 'o1c6f/mge/gdf', 'hb./c2ii/cnk', 'apd/dph/cig'], ['kkg/dkp/fjc', '.oh/lcc/lkm', '.ij/mf4c4/ean'], ['#5:daa/enh/ede', 'opb2/ald/amp', '#8:jbj/cfb/eid']] },
]
