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
  ['v01', 'Initiating runner defragmentation protocol.', 'log', '正在启动跑者碎片整理协议。'],
  ['v02', 'Evaluating shell integrity.', 'log', '正在评估躯壳完整性。'],
  ['v03', 'Evaluating vital signs.', 'log', '正在评估生命体征。'],
  ['v04', 'Evaluating recognition response.', 'log', '正在评估识别反应。'],
  ['v05', 'Loading memory packages.', 'log', '正在载入记忆包。'],
  ['v06', 'Fragment four-one-one. Cohesion failure. Skipping.', 'log', '碎片 411：内聚失败。已跳过。'],
  ['v07', 'Liminal buffer: twenty-six percent.', 'log', '阈限缓冲：百分之二十六。'],
  ['v08', 'Assert. Subject is a runner.', 'log', '断言：受试者是一名跑者。'],
  ['v09', 'A mind without a body, leased to a printed shell.', 'log', '一个没有身体的心智，租用着一具打印出来的躯壳。'],
  ['v10', "Assert. Subject's previous shell was terminated in the field.", 'log', '断言：受试者的上一具躯壳已在外勤中终止。'],
  ['v11', 'The psyche was ejected at the moment of death.', 'log', '心智在死亡的瞬间被弹出。'],
  ['v12', 'It is held in the buffer while a new shell is printed.', 'log', '新躯壳打印期间，它被保存在缓冲区中。'],
  ['v13', 'Please stand by.', 'log', '请稍候。'],
  ['v14', 'Assert. Nine years ago, the colony on Periapt Four stopped transmitting.', 'log', '断言：九年前，近拱点四号上的殖民地停止了信号传输。'],
  ['v15', 'Runners are contracted to salvage what remains.', 'log', '跑者受雇打捞残存之物。'],
  ['v16', 'The Authority still patrols the ruins. Contact is at your discretion.', 'log', '管理局仍在废墟中巡逻。是否交火，由你自行决定。'],
  ['v17', 'Warning. Cognition runtime error.', 'alert', '警告：认知运行时错误。'],
  ['v18', 'Signal from shell zero-six detected on the surface.', 'alert', '在地表检测到零六号躯壳的信号。'],
  ['v19', 'Subject instance count: two.', 'alert', '受试者实例数：二。'],
  ['v20', 'Proceeding with suboptimal durability settings.', 'log', '以次优耐久设置继续。'],
  ['v21', 'Liminal buffer: one hundred percent.', 'log', '阈限缓冲：百分之百。'],
  ['v22', 'Defragmentation complete.', 'log', '碎片整理完成。'],
  ['v23', 'Welcome back, runner. This is ORA, your support intelligence.', 'log', '欢迎回来，跑者。我是 ORA，你的支援智能。'],
  ['v24', 'Your next contract is on Periapt Four.', 'log', '你的下一份合约在近拱点四号。'],
  ['v25', 'Target: shell zero-six.', 'log', '目标：零六号躯壳。'],
  ['v26', 'Prepare for consciousness transfer in', 'log', '准备意识传输，倒计时'],
  ['v27', 'Three.', 'count', '三。'],
  ['v28', 'Two.', 'count', '二。'],
  ['v29', 'One.', 'count', '一。'],
  ['v30', 'Initiate.', 'count', '启动。'],
  ['v31', 'Good luck. It will not hesitate.', 'soft', '祝你好运。它不会犹豫。'],
];

/**
 * edge-tts settings (current engine). Voice and chains come from a measured
 * comparison (Whisper WER 0, STOI 0.96 / 0.94 for chains A / B): Aria is the
 * calmest, crispest of the English female voices. Chain A = frequency-shift
 * sheen + cold EQ + 4.5 ms metallic comb + even compression; chain B adds a
 * monotone robot undertone, an octave double and grain.
 */
export const EDGE_VOICE = 'en-US-AriaNeural';
// A blind ranking (dry / A / B / C) by the listening model put chain A first:
// clearly synthetic but premium and never 'weird' under a dense score. B is
// kept for the short alarm lines; C (heaviest) is not used.
export const EDGE_PROSODY = {
  log: { rate: '-10%', pitch: '-8Hz', chain: 'A' },
  alert: { rate: '-4%', pitch: '-6Hz', chain: 'B' },
  count: { rate: '-8%', pitch: '-8Hz', chain: 'A' },
  soft: { rate: '-16%', pitch: '-14Hz', chain: 'A' },
};
