// The voice-over script of the film (single source of truth for the audio pipeline
// and the captions). Delivery notes are passed to the TTS director prompt.
export const VOICE = 'Achernar';

export const DELIVERY = {
  log: 'calm, flat, clinical, metronomic. No warmth, no emotion. Precise consonants. Reads a status log.',
  alert: 'still synthetic and controlled, but clipped and faster, with a cold urgency. Every word crisp.',
  count: 'one single word, crisp, evenly stressed, no rising intonation, then stop.',
  soft: 'quieter and lower, slower, almost confidential, still completely synthetic and emotionless.',
};

/** id, text, delivery, zh caption */
export const LINES = [
  // I — reassembly
  ['v01', 'Runner defragmentation protocol, initiated.', 'log', '跑者碎片整理协议，已启动。'],
  ['v02', 'Reassembling the psyche. Evaluating vital signs.', 'log', '正在重组心智。正在评估生命体征。'],
  ['v03', 'Evaluating recognition response.', 'log', '正在评估识别反应。'],
  ['v04', 'Loading memory packages.', 'log', '正在载入记忆包。'],
  ['v05', 'Fragment four-one-one. Cohesion failure. Skipped.', 'log', '碎片 411：内聚失败。已跳过。'],
  ['v06', 'Liminal buffer: twenty-six percent.', 'log', '阈限缓冲：百分之二十六。'],
  // II — what a runner is
  ['v07', 'Assert. Subject is a runner.', 'log', '断言：受试者是一名跑者。'],
  ['v08', 'A consciousness without a body, renting a printed shell.', 'log', '一个没有身体的意识，租用着一具打印出来的躯壳。'],
  ['v09', 'Assert. The previous shell was killed in the field.', 'log', '断言：上一具躯壳已在外勤中被击杀。'],
  ['v10', 'At the moment of death, the psyche was ejected, and caught.', 'log', '死亡的瞬间，心智被弹出，并被接住。'],
  ['v11', 'It waits in the buffer while a new shell is printed.', 'log', '新躯壳打印期间，它在缓冲区中等待。'],
  ['v12', 'Please stand by.', 'log', '请稍候。'],
  // III — the world
  ['v13', 'Assert. Nine years ago, the colony on Periapt Four went silent.', 'log', '断言：九年前，近拱点四号上的殖民地陷入沉寂。'],
  ['v14', 'From orbit, the station drops runners on every signal that remains.', 'log', '空间站从轨道向每一个尚存的信号投放跑者。'],
  ['v15', 'Drop zone mapped. Whatever you salvage is yours.', 'log', '投放区已测绘。你打捞到的一切归你所有。'],
  ['v16', 'The Authority still patrols the ruins. Engage at your discretion.', 'log', '管理局仍在废墟中巡逻。是否交火，由你决定。'],
  // IV — the error
  ['v17', 'Warning. Cognition runtime error.', 'alert', '警告：认知运行时错误。'],
  ['v18', 'Signal from shell zero-six, on the surface.', 'alert', '地表出现零六号躯壳的信号。'],
  ['v19', 'Subject instance count: two.', 'alert', '受试者实例数：二。'],
  ['v20', 'Proceeding with suboptimal durability settings.', 'log', '以次优耐久设置继续。'],
  // V — the transfer
  ['v21', 'Liminal buffer: one hundred percent.', 'log', '阈限缓冲：百分之百。'],
  ['v22', 'Defragmentation complete.', 'log', '碎片整理完成。'],
  ['v23', 'Welcome back, runner. I am ORA, your support intelligence.', 'log', '欢迎回来，跑者。我是 ORA，你的支援智能。'],
  ['v24', 'Your next contract is on Periapt Four.', 'log', '你的下一份合约在近拱点四号。'],
  ['v25', 'Target: shell zero-six.', 'log', '目标：零六号躯壳。'],
  ['v26', 'Consciousness transfer in', 'log', '意识传输，倒计时'],
  ['v27', 'Three.', 'count', '三。'],
  ['v28', 'Two.', 'count', '二。'],
  ['v29', 'One.', 'count', '一。'],
  ['v30', 'Initiate.', 'count', '启动。'],
  ['v31', 'Good luck.', 'soft', '祝你好运。'],
];

/**
 * edge-tts settings (current engine). Voice and chains come from a measured
 * comparison (Whisper WER 0, STOI 0.96 / 0.94 for chains A / B): Aria is the
 * calmest, crispest of the English female voices. Chain A = frequency-shift
 * sheen + cold EQ + 4.5 ms metallic comb + even compression; chain B adds a
 * monotone robot undertone, an octave double and grain.
 */
export const EDGE_VOICE = 'en-US-AriaNeural';
// Aria is synthesized at native pitch. D is the clean pre-processing chain
// and E adds a faint robot layer for alerts. The final pitch and formant
// treatment runs on both chains after trimming.
export const EDGE_PROSODY = {
  log: { rate: '-6%', pitch: '+0Hz', chain: 'D' },
  alert: { rate: '-2%', pitch: '+0Hz', chain: 'E' },
  count: { rate: '-4%', pitch: '+0Hz', chain: 'D' },
  soft: { rate: '-12%', pitch: '+0Hz', chain: 'D' },
};
