import { pageHead, section, spec } from './_ui';
import { mountRadialSequences, radialSequences } from './telemetry-dials';
import {
  countdownHTML, factionHTML, mountCountdown, mountFaction,
  mountLaunchMap, mountRelayTerm, relayTermHTML,
} from '../lib/board';
import { hydrate } from '../lib/hydrate';
import { bag, $ } from '../lib/util';

export default function mount(root: HTMLElement) {
  const b = bag();

  root.innerHTML = `
  <section class="page">
    ${pageHead('05', 'Data<br><span class="t-outline">Readouts</span>', ['FILM DIALS · FIXED CAMERA', 'STEPPED READOUTS', 'BOARD MODULES'], 115)}
    <p class="page-lede">Everything that reads out a value. The film's rotating dials play here on a fixed camera — readouts step on
    frames while tracks and read heads travel. The board spreads the same readouts flat: a pixel map with live times, a capsule
    countdown, a relay terminal and a faction grid. The relay tracks live in the Interface chapter, where they can be driven.</p>
    ${radialSequences()}

    ${section('Board', 'lib/board.ts')}

    <div class="tel-board">
      ${spec({ code: 'BD-01', title: 'Local times', cls: 'mountLaunchMap()', bodyCls: 'spec-body--flush tel-map', body: '<canvas id="bd-map"></canvas>', foot: 'Land as square cells from the 110 m atlas. City times are live; the magenta band sits where local midnight is now.' })}
      ${spec({ code: 'BD-02', title: 'Capsule countdown', cls: 'countdownHTML() · capsuleText()', bodyCls: 'spec-body--flush', body: countdownHTML(), foot: 'Counts to the top of the hour. Each run of lit pixels is one pill.' })}
      ${spec({ code: 'BD-03', title: 'Relay terminal', cls: 'mountRelayTerm()', bodyCls: 'spec-body--flush', body: relayTermHTML() })}
      ${spec({ code: 'BD-04', title: 'Faction standing', cls: 'factionHTML() · mountFaction()', bodyCls: 'spec-body--flush', body: factionHTML() })}
    </div>
  </section>`;

  b.add(hydrate(root));
  b.add(mountRadialSequences(root));
  b.add(mountLaunchMap($<HTMLCanvasElement>('#bd-map', root)));
  b.add(mountRelayTerm($('.k-relay', root)));
  b.add(mountFaction($('.k-faction', root)));
  b.add(mountCountdown($('.k-count', root)));
  return b.dispose;
}
