import * as THREE from 'three';

// All six emotion states and their scene effects.
// "thinking" is client-side only — never returned by Gemini.
// headJerk: triggers a rapid head-shake (see robot.js triggerHeadJerk)
// headRapid: multiplies head lerp speed for rapid tracking
const EMOTION_MAP = {
  neutral:  { rimHex: 0xff6a00, bloom: 0.8,  floatSpeed: 0.5,  floatAmp: 0.05, headJerk: false, headRapid: false },
  happy:    { rimHex: 0xff8c00, bloom: 1.2,  floatSpeed: 0.9,  floatAmp: 0.07, headJerk: false, headRapid: false },
  excited:  { rimHex: 0xffffff, bloom: 1.8,  floatSpeed: 1.4,  floatAmp: 0.09, headJerk: false, headRapid: true  },
  sad:      { rimHex: 0x4466aa, bloom: 0.4,  floatSpeed: 0.3,  floatAmp: 0.03, headJerk: false, headRapid: false },
  angry:    { rimHex: 0xff2200, bloom: 1.6,  floatSpeed: 1.2,  floatAmp: 0.06, headJerk: true,  headRapid: false },
  thinking: { rimHex: 0xffcc00, bloom: 0.6,  floatSpeed: 0.4,  floatAmp: 0.04, headJerk: false, headRapid: false },
};

const _rimColor = new THREE.Color();

/**
 * Apply emotion effects to scene lights and bloom pass.
 * @param {string} emotion - one of the keys in EMOTION_MAP
 * @param {{ rimLight, faceLight, bloomPass }} refs
 */
export function applyEmotion(emotion, { rimLight, faceLight, bloomPass }) {
  const cfg = EMOTION_MAP[emotion] ?? EMOTION_MAP.neutral;
  _rimColor.setHex(cfg.rimHex);
  rimLight.color.copy(_rimColor);
  faceLight.color.copy(_rimColor);
  bloomPass.strength = cfg.bloom;
  return cfg; // caller can use floatSpeed / floatAmp / headJerk / headRapid
}

export { EMOTION_MAP };
