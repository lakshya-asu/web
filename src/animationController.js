import * as THREE from 'three';

// Maps LLM gesture names → one or more clip name candidates (tries in order)
// Clip names must match NLA strip names from Blender export
const GESTURE_CLIPS = {
  // Idle/passive
  idle:            ['breathing_idle', 'happy_idle', 'weight_shift'],
  think:           ['thinking', 'focus', 'weight_shift'],
  listen:          ['acknowledging', 'lengthy_head_nod', 'head_nod_yes'],

  // Positive
  happy:           ['happy_idle', 'happy_hand_gesture', 'reacting'],
  excited:         ['victory_idle', 'rallying', 'reacting'],
  laugh:           ['laughing', 'reacting', 'victory_idle'],
  wave:            ['waving', 'waving_1'],
  celebrate:       ['victory_idle', 'victory_idle_1', 'rallying'],
  thankful:        ['thankful', 'acknowledging'],
  dance:           ['hip_hop_dancing', 'silly_dancing', 'samba_dancing', 'bestdance'],

  // Communicative
  talk:            ['talking', 'explaining', 'telling_a_secret'],
  explain:         ['explaining', 'talking'],
  secret:          ['telling_a_secret', 'talking'],

  // Negative / reactive
  sad:             ['sad_idle', 'sad_idle_1', 'rejected'],
  angry:           ['angry', 'standing_arguing', 'angry_gesture'],
  dismiss:         ['dismissing_gesture', 'look_away_gesture', 'being_cocky'],
  reject:          ['rejected', 'sad_idle', 'shaking_head_no'],
  shrug:           ['reacting', 'look_away_gesture'],

  // Head gestures
  nod:             ['head_nod_yes', 'hard_head_nod', 'lengthy_head_nod'],
  nod_sarcastic:   ['sarcastic_head_nod', 'annoyed_head_shake'],
  shake_no:        ['shaking_head_no', 'annoyed_head_shake'],
  sigh:            ['relieved_sigh', 'sad_idle'],
  cocky:           ['being_cocky', 'taunt_gesture'],
};

// Which gestures should loop vs play once
const LOOPING = new Set(['idle', 'think', 'listen', 'dance', 'talk']);

export class AnimationController {
  constructor() {
    this.mixer = null;
    this.clips = {};          // name → THREE.AnimationClip
    this.current = null;      // currently playing action
    this.currentName = null;
    this.fadeTime = 0.4;
  }

  /** Call after GLB is loaded. Pass gltf.animations array. */
  init(root, animations) {
    this.mixer = new THREE.AnimationMixer(root);

    for (const clip of animations) {
      this.clips[clip.name] = clip;
    }

    console.log(`AnimationController: ${Object.keys(this.clips).length} clips loaded:`,
      Object.keys(this.clips).sort().join(', '));
  }

  /** Play a gesture by LLM gesture name. Returns true if clip found. */
  playGesture(gestureName) {
    const candidates = GESTURE_CLIPS[gestureName];
    if (!candidates) return false;

    for (const clipName of candidates) {
      if (this.clips[clipName]) {
        return this._play(clipName, LOOPING.has(gestureName));
      }
    }

    console.warn(`AnimationController: no clip found for gesture "${gestureName}". Tried:`, candidates);
    return false;
  }

  /** Play a clip directly by name. */
  playClip(clipName, loop = false) {
    return this._play(clipName, loop);
  }

  _play(clipName, loop = false) {
    if (this.currentName === clipName) return true;

    const clip = this.clips[clipName];
    if (!clip) return false;

    const next = this.mixer.clipAction(clip);
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
    next.clampWhenFinished = !loop;
    next.reset();

    if (this.current && this.current !== next) {
      this.current.crossFadeTo(next, this.fadeTime, true);
    }
    next.play();

    this.current = next;
    this.currentName = clipName;

    // Auto-return to idle when one-shot finishes
    if (!loop) {
      const onFinish = (e) => {
        if (e.action === next) {
          this.mixer.removeEventListener('finished', onFinish);
          this.currentName = null;
          this.playGesture('idle');
        }
      };
      this.mixer.addEventListener('finished', onFinish);
    }

    return true;
  }

  /** Must be called every frame with delta seconds. */
  update(delta) {
    if (this.mixer) this.mixer.update(delta);
  }

  get availableGestures() {
    return Object.keys(GESTURE_CLIPS).filter(g =>
      GESTURE_CLIPS[g].some(c => this.clips[c])
    );
  }
}

export const GESTURE_NAMES = Object.keys(GESTURE_CLIPS);
