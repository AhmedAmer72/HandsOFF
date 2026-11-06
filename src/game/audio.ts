let context: AudioContext | null = null;

function ctx() {
  if (!context) context = new AudioContext();
  return context;
}

export function tone(frequency: number, duration = 0.08, type: OscillatorType = "triangle", gain = 0.03) {
  const audio = ctx();
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  amp.gain.value = gain;
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}

export const sfx = {
  ui: () => tone(520, 0.05, "square", 0.02),
  place: () => tone(180, 0.12, "sawtooth", 0.03),
  attack: () => tone(140, 0.09, "square", 0.04),
  hit: () => tone(90, 0.12, "triangle", 0.05),
  coin: () => tone(880, 0.07, "square", 0.02),
  burn: () => {
    tone(220, 0.25, "sawtooth", 0.04);
    tone(90, 0.4, "triangle", 0.03);
  },
};
