/** Dev-only single-scene viewer: /lab.html?s=runner[&gl=webgl] */
import './styles/tokens.css';
import './styles/base.css';
import './styles/fx.css';
import { SCENES } from './three/scenes/index';

const key = new URLSearchParams(location.search).get('s') ?? 'runner';
const def = SCENES.find((s) => s.key === key) ?? SCENES[0];
def.mount(document.getElementById('h')!, { fps: 12 }).then((h) => ((window as unknown as { scene: unknown }).scene = h));
