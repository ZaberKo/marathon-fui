import { pageHead, section, spec } from './_ui';
import { mountRadialSequences, radialSequences } from './telemetry-dials';
import {
  countdownHTML, cradleHTML, factionHTML, mountCountdown, mountCradle, mountDashField, mountFaction,
  mountLaunchMap, mountRelayTerm, mountSwarm, relayTermHTML,
} from '../lib/board';
import { hydrate } from '../lib/hydrate';
import { bag, $ } from '../lib/util';

export default function mount(root: HTMLElement) {
  const b = bag();

  root.innerHTML = `
  <section class="page">
    ${pageHead('05', 'Tele<br><span class="t-outline">metry</span>', ['CANVAS 2D · DOM', 'STEP LOOPS 2–12 FPS', 'PAUSE OFF-SCREEN'], 115)}
    <p class="page-lede">Data surfaces in the reference idiom: flat inks on black, hairline grids with lime tabs, square pixel cells,
    stepped text blocks and capsule dot type. Each module is <b>mountX(el) → cleanup</b> in <b>lib/board.ts</b>; readouts jump, nothing glides.</p>
    ${radialSequences()}

    ${section('Board', 'LIB/BOARD.TS')}
    <div class="tel-board">
      ${spec({ code: 'BD-01', title: 'Local times', cls: 'mountLaunchMap()', bodyCls: 'spec-body--flush tel-map', body: '<canvas id="bd-map"></canvas>', foot: 'Land as square cells from the 110 m atlas. City times are live; the magenta band sits where local midnight is now.' })}
      ${spec({ code: 'BD-02', title: 'Capsule countdown', cls: 'countdownHTML() · capsuleText()', bodyCls: 'spec-body--flush', body: countdownHTML(), foot: 'Counts to the top of the hour. Each run of lit pixels is one pill.' })}
      ${spec({ code: 'BD-03', title: 'Relay tracks', cls: 'cradleHTML() · mountCradle()', bodyCls: 'spec-body--flush', body: cradleHTML(), foot: 'One track takes or gives a block every 1.2 s; braided lines run to the fill edge and pinch at the nodes.' })}
      ${spec({ code: 'BD-04', title: 'Relay terminal', cls: 'mountRelayTerm()', bodyCls: 'spec-body--flush', body: relayTermHTML() })}
      ${spec({ code: 'BD-05', title: 'Swarm poster', cls: 'mountSwarm()', bodyCls: 'spec-body--flush tel-poster', body: '<canvas id="bd-swarm"></canvas>', foot: 'Outline triangles with solid red leads, crosses and coded tags; cells drop out per step.' })}
      ${spec({ code: 'BD-06', title: 'Dash field poster', cls: 'mountDashField()', bodyCls: 'spec-body--flush tel-poster', body: '<canvas id="bd-dash"></canvas>', foot: 'A checker body with a moving edge; loose dash rows feed it from the left.' })}
      ${spec({ code: 'BD-07', title: 'Faction standing', cls: 'factionHTML() · mountFaction()', bodyCls: 'spec-body--flush', body: factionHTML() })}
    </div>
  </section>`;

  b.add(mountRadialSequences(root));
  b.add(hydrate(root));
  b.add(mountLaunchMap($<HTMLCanvasElement>('#bd-map', root)));
  b.add(mountCradle($('.k-cradle', root)));
  b.add(mountRelayTerm($('.k-relay', root)));
  b.add(mountSwarm($<HTMLCanvasElement>('#bd-swarm', root)));
  b.add(mountDashField($<HTMLCanvasElement>('#bd-dash', root)));
  b.add(mountFaction($('.k-faction', root)));
  b.add(mountCountdown($('.k-count', root)));
  return b.dispose;
}
