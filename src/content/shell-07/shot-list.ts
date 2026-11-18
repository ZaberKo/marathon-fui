import { ST } from './times';

type ShotId = keyof typeof ST;

const descriptions = {
  S00: { title: 'Boot',
    note: 'The runtime posts its checks into black and arms the defragmentation queue.' },
  S01: { title: 'Initiating',
    note: 'The cached psyche acquires the Shell 07 link. Its wire preview resolves beside the initiating bands before the defragmentation ring takes over.' },
  S02: { title: 'Defragmentation ring',
    note: 'A single-frame metal wheel gives way to three concentric tracks. Their cobalt and green plates seat separately as the register swings into place. Open protocol lettering flashes solid, then overflows the frame.' },
  S03: { title: 'Vital signs',
    note: 'An anatomical plate in smooth 2D line work: nerve bundles of many strands in several colours (fanning into fingers and toes), muscles filled with fibre lines, hatched organs, the brain and the optic pathway. Signals run out along the nerves, muscle groups light in sequence, a scan band travels down, a heart trace runs beside it.' },
  S04: { title: 'Recognition response',
    note: 'Same plate, lime skin, close: the eyes track a stimulus with a measured lag; the vertical RESPONSE label resolves into an OK plate. Framed by the boot slab pieces — the kit is one system across shots.' },
  S05: { title: 'Loading memory packages',
    note: 'Seen from almost straight above, the memory module is a chip array of mixed cells — notched packages, chamfered cells, two dies, bosses, contact rows, edge pins — drawn in 3D lines with hidden lines removed. Loaded cells become flat lemon graphics laid over their projected tops (with their details cut out in black), column by column under a write head. One fragment fails cohesion: the passphrase wall flashes, it is marked and skipped.' },
  S06: { title: 'Liminal buffer 26%',
    note: 'The buffer holds at the spoken 26 percent while the scan completes. The hemispheres activate, then the red lock wheel and yellow insert confirm readiness.' },
  S07: { title: 'Subject is a runner',
    note: 'The red and cobalt assertion dial cuts to a large pixel profile and a second silhouette. Green contours and lime fragments identify the subject as the definition types in.' },
  S08: { title: 'A mind without a body',
    note: 'A contour runner sprints while delayed copies trail behind it — the body as a sequence of time slices, the mind as the only constant.' },
  S09: { title: 'Leased to a printed shell',
    note: 'Behind: the mind as a standing point-cloud human, twice life size. In front: the solid printed shell. Mapping lines connect each joint of the cloud to the same joint of the shell — the lease, made visible.' },
  S10: { title: 'Terminated in the field',
    note: 'The cropped assertion register holds through the spoken ASSERT. It lifts to reveal the previous shell walking into the reticle. On impact the voxel shell turns red, falls and breaks across the deck.' },
  S11: { title: 'Psyche ejected',
    note: 'Above the red voxel debris the psyche hangs as a slow cloud of points, caught in a containment bracket — the only part of the runner that survived.' },
  S12: { title: 'A new shell is printed',
    note: 'No machine, just the work. The body lies on its back, long axis up the frame, arms resting at its sides, divided into eight segments by cross-section frames. Every segment prints at once — layer lines behind a moving front with its real cross-section contour — and every frame is wired back to the psyche: the brain on its grid at left, feeding all fronts through one bus.' },
  S13: { title: 'Please stand by',
    note: 'Hold frame. A full cobalt field — no black at all — the new shell idling in white contour lines; the lockup alternates PLEASE / STAND BY. The score drops out; the picture waits with you.' },
  S14: { title: 'Periapt IV — from the system to the drop',
    note: 'One camera move: a drafted system chart (a corona star that dwarfs its planets, orbits with ticks and lanes, a ringed giant) → the planet, at an exactly matched scale handoff from dithered schematic to sensor imagery → high orbit behind the station, shown as an angular ring and two wing outlines. It drops runners down arcs onto every remaining signal; the camera follows one drop down toward its zone. Labels sit on dark plates beside the planet and move to a side panel once the planet fills the view.' },
  S15: { title: 'Drop zone survey',
    note: 'A contour map of the drop zone: marching-squares isolines of the terrain, each lifted to its height and coloured by elevation, index contours brighter, a ground grid with coordinates; the colony ruins are map symbols, not models. Pods fall in on their trails and land on their marks; the camera tilts from straight down (the dive) to an oblique survey view.' },
  S16: { title: 'The Authority',
    note: 'An Authority soldier runs the ruins, its body broken into red outline voxels with cyan plates; at the end it turns and locks on the camera — on us.' },
  S17: { title: 'Cognition runtime error',
    note: 'Fault = the whole frame floods orange-red. One continuous row on a black band — WARNING_WARNING_… → COGNITION_ → RUNTIME_ → ERROR_, evenly spaced by underscores — giant pixel-font letters are cropped behind it; pixel crosses mark the corners.' },
  S18: { title: 'Shell 06 signal',
    note: 'Back to the planet map: a ping rises from the ruins — the dead shell is still transmitting. The map pushes in on the source.' },
  S19: { title: 'Instance count: two',
    note: 'Split frame: the new shell (white on cobalt) and the old one (red on black), the same body twice. They turn to face each other across the seam.' },
  S20: { title: 'Suboptimal durability',
    note: 'Restraint after the alarm: a near-empty black frame where durability sliders drop to compromised values and debris drifts. The AI decides to proceed anyway.' },
  S21: { title: 'Defragmentation complete',
    note: 'Two red tracks reach 100 percent. The readout changes ink before the track fragments fall away. A lime relay sheds its teeth into a macro radial print, then the compact COMPLETE wheel resolves into the ORA ring.' },
  S22: { title: 'ORA',
    note: 'The completed ring grows into the ORA wordmark on the introduction. The mark docks with its support readout, then the O expands into the outline of Periapt IV.' },
  S23: { title: 'Contract — target: shell 06',
    note: 'The orbital view picks up the ORA ring. A surface pointer traces into the contract readout as its fields resolve, then the view dives to the ruins and scans the moving target.' },
  S24: { title: 'Consciousness transfer',
    note: 'The camera circles the shell, then keeps moving into the brain along the optic route throughout the countdown.' },
  S25: { title: 'Initiate',
    note: 'INIT lights up in the internal optic view. The camera rushes toward the eyes, the two rings fuse into one and the field floods blue before the final blackout.' },
} satisfies Record<ShotId, { title: string; note: string }>;

export function shotInfo(id: ShotId) {
  const [t0, t1] = ST[id];
  return { id, t0, t1, ...descriptions[id] };
}

export const SHOT_LIST = (Object.keys(ST) as ShotId[]).map(shotInfo);
