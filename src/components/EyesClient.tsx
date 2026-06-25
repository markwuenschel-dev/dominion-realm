'use client';

import { useEffect } from 'react';

/**
 * The Neurochromatic Eyes interactive, ported from eyes.astro's inline script.
 * Builds the stage rail + stepper, drives the procedural eye SVG (by id) per
 * stage, and gates fades/meter animation behind a motion probe. Operates on the
 * server-rendered markup; renders nothing.
 */
export function EyesClient() {
  useEffect(() => {
    const root = document.documentElement;
    const $ = (id: string) => document.getElementById(id) as HTMLElement;

    const STAGES = [
      {
        num: 'I',
        name: 'Limbal <em>Shift</em>',
        plain: 'Limbal Shift',
        hue: '#4fd6e0',
        band: 'CYAN BAND',
        wl: 'λ 488nm',
        desc: 'The first awakening.',
        see: 'A faint iridescence at the rim of everything — doorways, hands, the horizon — as if the world were laminated under glass and the edge of the glass had just caught the light. The walker cannot yet read it. They only know, for the first time, that the Realm has more than one layer. It is where Marcus stands now, his eyes only beginning to change.',
        effect:
          '<span class="tag">UNLOCKS</span> passive layer-sense. The walker registers that interfaces exist, but cannot resolve them. No active control.',
        perception: 18,
        strain: 10,
        control: 28,
        cost: 'A permanent ache behind the eye, like a held breath that never releases. Minor — and never noticed again until it is gone.',
      },
      {
        num: 'II',
        name: 'Iris <em>Refraction</em>',
        plain: 'Iris Refraction',
        hue: '#6b8def',
        band: 'AZURE BAND',
        wl: 'λ 470nm',
        desc: 'Sight resolves into bands.',
        see: 'The iridescence separates into legible color. Threats glow one hue, ley-lines another, intention a third; the world sorts itself into a readable spectrum. This is where the implant stabilizes the Realm into something a human mind can hold.',
        effect:
          '<span class="tag">STABILIZES</span> the RPG interface. Health, threat, and affinity render as discrete bands. First reliable reading of the substrate.',
        perception: 38,
        strain: 24,
        control: 48,
        cost: 'Recurring spectral migraines — colors that arrive before the things they belong to. Manageable, with rest the walker rarely gets.',
      },
      {
        num: 'III',
        name: 'Neuro-Optical <em>Overdrive</em>',
        plain: 'Neuro-Optical Overdrive',
        hue: '#8a7bf0',
        band: 'INDIGO BAND',
        wl: 'λ 445nm',
        desc: 'Perception outpaces the body.',
        see: 'Too much, too fast. Every surface volunteers its data at once; the walker reads a room faster than they can cross it, predicts a blow before the muscle to dodge it can fire. Knowledge arrives with no time to use it — a flood with no shore.',
        effect:
          '<span class="tag">GRANTS</span> precognitive read; <span class="tag">RISK</span> sensory flooding and lost time. The gap between seeing and acting becomes a wound.',
        perception: 66,
        strain: 60,
        control: 38,
        cost: 'Dangerous. Walkers at Overdrive lose minutes, then hours, standing perfectly still inside a single perfect second.',
      },
      {
        num: 'IV',
        name: 'Spectral <em>Partition</em>',
        plain: 'Spectral Partition',
        hue: '#9b6cf0',
        band: 'VIOLET BAND',
        wl: 'λ 420nm',
        desc: 'The first true act of command.',
        see: 'The flood is dammed. The walker learns to lift one thread of reality and hold it apart from the rest — isolating a single channel of the substrate, silencing the others, reading one truth at a time. The Realm stops happening to them. They begin to choose where to look.',
        effect:
          '<span class="tag">UNLOCKS</span> channel isolation — suppress or amplify one band at will. The first stage that acts <em>on</em> the Realm, not just within it.',
        perception: 78,
        strain: 52,
        control: 68,
        cost: 'Identity bleed. Each isolated channel begins to feel like a separate self — and not all of them want the same things.',
      },
      {
        num: 'V',
        name: 'Gaze <em>Interference</em>',
        plain: 'Gaze Interference',
        hue: '#ef6f9e',
        band: 'ROSE BAND',
        wl: 'λ 405nm',
        desc: 'To look is to alter.',
        see: 'Attention becomes a force. Wherever the walker fixes their gaze, the substrate bends toward it — dampened, amplified, rerouted. Reality flinches under the eye. They no longer merely observe a thread; they pull it. The watched world is changed by the watching.',
        effect:
          '<span class="tag">GRANTS</span> active substrate manipulation by focus. <span class="tag">RISK</span> every alteration leaves a trace — on the Realm, and on the one who made it.',
        perception: 90,
        strain: 76,
        control: 74,
        cost: 'Every gaze marks the gazer. Walkers at Interference are read by what they have looked at, the way a blade remembers its edge.',
      },
      {
        num: 'VI',
        name: 'Prism <em>Coherence</em>',
        plain: 'Prism Coherence',
        hue: '#e0a850',
        band: 'FULL SPECTRUM',
        wl: 'λ ∞',
        desc: 'All bands resolve into one.',
        see: 'The interface dissolves. There are no more bands, no numbers, no merciful translation — only the Realm, perceived whole and unmediated, exactly as it is. The walker sees the substrate not as a game rendered for a mind, but as the thing the game was always standing in front of. Few minds survive the clarity intact.',
        effect:
          '<span class="tag">RESOLVES</span> all channels into unity. Interface offline. Direct contact with the substrate. <span class="tag">TERMINAL</span> — there is no Stage VII, only what one becomes here.',
        perception: 100,
        strain: 94,
        control: 96,
        cost: 'Most who reach coherence do not return as themselves. The clarity is total, and it does not give back what it takes to see.',
      },
    ];

    const STAGE_CFG = [
      {
        pupilR: 28,
        pupilCoreR: 22,
        fiberOp: 0.28,
        cryptOp: 0.0,
        veinOp: 0.0,
        limbalW: 2.2,
        lp: [0.35, 0.7],
        sweepDur: 6.0,
        glintOp: 0.22,
        sweepOp: 0.06,
      },
      {
        pupilR: 30,
        pupilCoreR: 23,
        fiberOp: 0.5,
        cryptOp: 0.18,
        veinOp: 0.0,
        limbalW: 2.8,
        lp: [0.5, 0.9],
        sweepDur: 5.0,
        glintOp: 0.2,
        sweepOp: 0.1,
      },
      {
        pupilR: 38,
        pupilCoreR: 30,
        fiberOp: 0.72,
        cryptOp: 0.45,
        veinOp: 0.55,
        limbalW: 3.4,
        lp: [0.65, 1.0],
        sweepDur: 3.4,
        glintOp: 0.14,
        sweepOp: 0.16,
      },
      {
        pupilR: 26,
        pupilCoreR: 20,
        fiberOp: 0.85,
        cryptOp: 0.7,
        veinOp: 0.25,
        limbalW: 3.8,
        lp: [0.6, 0.95],
        sweepDur: 4.0,
        glintOp: 0.13,
        sweepOp: 0.2,
      },
      {
        pupilR: 34,
        pupilCoreR: 27,
        fiberOp: 0.92,
        cryptOp: 0.88,
        veinOp: 0.8,
        limbalW: 4.4,
        lp: [0.75, 1.0],
        sweepDur: 2.8,
        glintOp: 0.07,
        sweepOp: 0.28,
      },
      {
        pupilR: 22,
        pupilCoreR: 17,
        fiberOp: 1.0,
        cryptOp: 1.0,
        veinOp: 0.0,
        limbalW: 5.0,
        lp: [0.9, 1.0],
        sweepDur: 1.8,
        glintOp: 0.04,
        sweepOp: 0.36,
      },
    ];

    const rail = $('rail');
    let current = 0;

    // Idempotent rebuild (React StrictMode may run effects twice in dev).
    rail.querySelectorAll('.stage-btn').forEach((b) => b.remove());
    STAGES.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.style.setProperty('--hue', s.hue);
      btn.dataset.index = String(i);
      btn.innerHTML = `<span class="connector"></span><span class="dot"></span><span><span class="s-num">STAGE ${s.num}</span><span class="s-name">${s.plain}</span></span>`;
      btn.addEventListener('click', () => select(i));
      rail.appendChild(btn);
    });
    const railBtns = [...rail.querySelectorAll<HTMLButtonElement>('.stage-btn')];

    const stepNodes = $('stepNodes');
    stepNodes.querySelectorAll('.pnode').forEach((n) => n.remove());
    STAGES.forEach(() => {
      const n = document.createElement('span');
      n.className = 'pnode';
      stepNodes.appendChild(n);
    });
    const pnodes = [...stepNodes.querySelectorAll<HTMLElement>('.pnode')];

    const els = {
      dataKey: $('dataKey'),
      dNum: $('dNum'),
      dName: $('dName'),
      dDesc: $('dDesc'),
      dSee: $('dSee'),
      dEffect: $('dEffect'),
      dCost: $('dCost'),
      vpStage: $('vpStage'),
      vpHueName: $('vpHueName'),
      liveStage: $('liveStage'),
      driftVal: $('driftVal'),
      stepFill: $('stepFill'),
      mPerception: $('mPerception'),
      mStrain: $('mStrain'),
      mControl: $('mControl'),
      mvPerception: $('mvPerception'),
      mvStrain: $('mvStrain'),
      mvControl: $('mvControl'),
      prevBtn: $('prevBtn') as HTMLButtonElement,
      nextBtn: $('nextBtn') as HTMLButtonElement,
      floats: [...document.querySelectorAll<HTMLElement>('#floats span')],
    };

    let MOTION = false;

    function renderEye(idx: number) {
      const s = STAGES[idx];
      const cf = STAGE_CFG[idx];
      root.style.setProperty('--stage-hue', s.hue);
      const hue = s.hue;

      $('ig1').setAttribute('stop-color', hue);
      $('ig1').setAttribute('stop-opacity', (0.35 + idx * 0.07).toFixed(2));
      $('pg0').setAttribute(
        'stop-color',
        idx >= 4 ? `color-mix(in srgb, ${hue} 20%, #1a0a2e)` : '#1a0a2e',
      );

      const haloOp = 0.0 + idx * 0.08;
      $('lh0').setAttribute('stop-color', hue);
      $('lh0').setAttribute('stop-opacity', (haloOp * 0.5).toFixed(3));
      $('lh1').setAttribute('stop-color', hue);
      $('lh1').setAttribute('stop-opacity', haloOp.toFixed(3));

      const sp = $('spokes-primary');
      const ss = $('spokes-secondary');
      sp.querySelectorAll('line').forEach((l) => l.setAttribute('stroke', hue));
      ss.querySelectorAll('line').forEach((l) => l.setAttribute('stroke', hue));
      sp.setAttribute('opacity', cf.fiberOp.toFixed(2));
      ss.setAttribute('opacity', (cf.fiberOp * 0.45).toFixed(2));

      const crypts = $('crypts');
      const collar = $('collarette-ring');
      const cnotches = $('collarette-notches');
      crypts.setAttribute('opacity', cf.cryptOp.toFixed(2));
      crypts.querySelectorAll('path').forEach((p) => p.setAttribute('stroke', hue));
      collar.setAttribute('opacity', cf.cryptOp.toFixed(2));
      collar.setAttribute('stroke', hue);
      cnotches.setAttribute('opacity', cf.cryptOp.toFixed(2));
      cnotches.querySelectorAll('line').forEach((l) => l.setAttribute('stroke', hue));

      $('veins').style.opacity = cf.veinOp.toFixed(2);

      const limb = $('limbal-ring');
      limb.setAttribute('stroke', hue);
      limb.setAttribute('stroke-width', cf.limbalW.toFixed(1));
      limb.style.setProperty('--lp-lo', cf.lp[0].toFixed(2));
      limb.style.setProperty('--lp-hi', cf.lp[1].toFixed(2));
      limb.style.animationDuration = (2.8 - idx * 0.28).toFixed(2) + 's';

      $('pupil-glow').setAttribute('r', String(cf.pupilR));
      $('pupil-void').setAttribute('r', String(cf.pupilCoreR));
      const pedge = $('pupil-edge');
      pedge.setAttribute('r', String(cf.pupilCoreR));
      pedge.setAttribute('stroke', hue);
      pedge.setAttribute('opacity', idx >= 3 ? '0.45' : '0.0');

      const sweepG = $('sweep-group');
      sweepG.style.animationDuration = cf.sweepDur.toFixed(1) + 's';
      $('sweep-wedge').setAttribute('opacity', cf.sweepOp.toFixed(2));
      $('sweep-line').setAttribute('stroke', hue);
      $('sw0').setAttribute('stop-color', hue);

      $('glint-main').setAttribute('opacity', cf.glintOp.toFixed(2));
      $('glint-small').setAttribute('opacity', (cf.glintOp * 0.55).toFixed(2));

      els.floats.forEach((f, fi) => f.classList.toggle('on', fi <= idx));
      els.floats[0].textContent = s.wl;
    }

    function animateMeter(barEl: HTMLElement, valEl: HTMLElement, target: number) {
      barEl.style.width = target + '%';
      valEl.textContent = target + '%';
      if (!MOTION) return;
      const start = parseInt(valEl.textContent) || 0;
      const t0 = performance.now();
      function tick(t: number) {
        const k = Math.min(1, (t - t0) / 600);
        const v = Math.round(start + (target - start) * (k * (2 - k)));
        valEl.textContent = v + '%';
        if (k < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function select(idx: number, instant?: boolean) {
      if (idx < 0 || idx > STAGES.length - 1) return;
      current = idx;
      const s = STAGES[idx];

      railBtns.forEach((b, i) => {
        b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
        b.dataset.reached = i <= idx ? 'true' : 'false';
        const dot = b.querySelector('.dot') as HTMLElement;
        dot.style.boxShadow = i <= idx ? '0 0 12px ' + STAGES[i].hue : 'none';
        dot.style.background = i <= idx ? STAGES[i].hue : 'transparent';
      });

      els.stepFill.style.width = (idx / (STAGES.length - 1)) * 100 + '%';
      pnodes.forEach((n, i) => n.classList.toggle('on', i <= idx));

      renderEye(idx);

      els.vpStage.innerHTML = s.num + ' — ' + s.plain.toUpperCase();
      els.vpHueName.textContent = s.band;
      els.liveStage.textContent = 'STAGE ' + s.num;
      els.driftVal.textContent = '+' + (0.04 + idx * 0.18).toFixed(2);

      els.prevBtn.disabled = idx === 0;
      els.nextBtn.disabled = idx === STAGES.length - 1;

      function applyText() {
        els.dNum.textContent = 'STAGE ' + s.num + ' / VI';
        els.dName.innerHTML = s.name;
        els.dDesc.textContent = s.desc;
        els.dSee.textContent = s.see;
        els.dEffect.innerHTML = s.effect;
        els.dCost.textContent = s.cost;
      }
      if (instant || !MOTION) {
        els.dataKey.classList.remove('swapping');
        applyText();
      } else {
        els.dataKey.classList.add('swapping');
        setTimeout(() => {
          applyText();
          els.dataKey.classList.remove('swapping');
        }, 200);
      }

      animateMeter(els.mPerception, els.mvPerception, s.perception);
      animateMeter(els.mStrain, els.mvStrain, s.strain);
      animateMeter(els.mControl, els.mvControl, s.control);
    }

    const onPrev = () => select(current - 1);
    const onNext = () => select(current + 1);
    els.prevBtn.addEventListener('click', onPrev);
    els.nextBtn.addEventListener('click', onNext);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        select(Math.min(STAGES.length - 1, current + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(Math.max(0, current - 1));
      }
    };
    document.addEventListener('keydown', onKey);

    select(current, true);

    let probeTimer = 0;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const probe = document.createElement('div');
      probe.style.cssText =
        'position:fixed;opacity:0;pointer-events:none;transition:opacity .15s linear';
      document.body.appendChild(probe);
      requestAnimationFrame(() => {
        probe.style.opacity = '1';
      });
      probeTimer = window.setTimeout(() => {
        const advancing = parseFloat(getComputedStyle(probe).opacity) > 0.05;
        probe.remove();
        if (advancing) {
          MOTION = true;
          document.body.classList.add('motion');
        }
      }, 260);
    }

    return () => {
      els.prevBtn.removeEventListener('click', onPrev);
      els.nextBtn.removeEventListener('click', onNext);
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(probeTimer);
    };
  }, []);

  return null;
}
