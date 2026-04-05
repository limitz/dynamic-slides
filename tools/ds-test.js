#!/usr/bin/env node
/**
 * ds-test — automated animation & DOM state validation for dynamic-slides
 *
 * Walks through every slide and every step in the presentation,
 * waits for animations to settle, then inspects DOM state and
 * validates against expectations derived from the parsed script.
 *
 * Usage:
 *   node tools/ds-test.js                     # run full test suite
 *   node tools/ds-test.js --slide 2           # test only slide index 2
 *   node tools/ds-test.js --screenshot        # capture screenshots per state
 *   node tools/ds-test.js --verbose           # detailed per-element output
 *
 * Requires: engine running on PRESENT_URL (default http://localhost:3001)
 *           viewer running on VIEWER_URL (default http://localhost:5173)
 */

import { chromium } from 'playwright';

const ENGINE  = process.env.PRESENT_URL || 'http://localhost:3001';
const VIEWER  = process.env.VIEWER_URL  || 'http://localhost:5173';
const args    = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const SCREENSHOTS = args.includes('--screenshot');
const SLIDE_FILTER = args.includes('--slide') ? parseInt(args[args.indexOf('--slide') + 1], 10) : null;

// Max time to wait for animations to settle (ms)
const ANIMATION_TIMEOUT = 3000;
// Extra settle time after animations finish
const SETTLE_MS = 500;

// ---------- Helpers ----------

async function engineGet(path) {
  const res = await fetch(`${ENGINE}${path}`);
  return res.json();
}

async function enginePost(path) {
  const res = await fetch(`${ENGINE}${path}`, { method: 'POST' });
  return res.json();
}

function color(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`;
}
const green  = (t) => color(32, t);
const red    = (t) => color(31, t);
const yellow = (t) => color(33, t);
const dim    = (t) => color(2, t);
const bold   = (t) => color(1, t);

// ---------- DOM inspection ----------

/**
 * Wait for all CSS and Web Animations to finish in the page.
 */
async function waitForAnimations(page) {
  await page.waitForFunction(() => {
    const anims = document.getAnimations();
    if (anims.length === 0) return true;
    return anims.every(a => a.playState === 'finished' || a.playState === 'idle');
  }, { timeout: ANIMATION_TIMEOUT }).catch(() => {
    // Timeout — some animations may be infinite or stuck
  });
  // Extra settle for any layout / paint to complete
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * Inspect the DOM state of the current slide.
 * Returns a structured snapshot of all visible/hidden elements.
 */
async function inspectSlideDOM(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.transition-layer:last-child');
    if (!stage) return { error: 'No stage element found' };

    const slideEl = stage.querySelector('.slide');
    if (!slideEl) return { error: 'No slide element found' };

    // Get transition layer states
    const layers = [...document.querySelectorAll('.transition-layer')];
    const transitionState = layers.map(l => ({
      className: l.className,
      childCount: l.children.length,
      hasContent: l.innerHTML.trim().length > 0,
    }));

    // Get all sections
    const sectionEls = slideEl.querySelectorAll('.slide > div:not(.slide__footer)');
    // If layout is in use, sections may be deeper
    const allDivs = slideEl.querySelectorAll('div');

    // Inspect each section-level div (direct children of slide or layout)
    const sections = [];
    const sectionContainers = slideEl.querySelectorAll(':scope > div:not(.slide__footer), :scope > div:not(.slide__footer) > div');

    for (const el of sectionContainers) {
      // Skip the footer and layout wrapper itself
      if (el.classList.contains('slide__footer')) continue;

      const computed = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const anims = el.getAnimations();

      sections.push({
        tag: el.tagName,
        className: el.className || null,
        id: el.id || null,
        opacity: parseFloat(computed.opacity),
        display: computed.display,
        visibility: computed.visibility,
        transform: computed.transform,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
        inlineOpacity: el.style.opacity,
        inlineDisplay: el.style.display,
        animations: anims.map(a => ({
          name: a.animationName || a.id || 'unnamed',
          state: a.playState,
          progress: a.effect?.getComputedTiming?.()?.progress ?? null,
        })),
      });
    }

    // Inspect all bullet items
    const bullets = [];
    for (const li of slideEl.querySelectorAll('li')) {
      const computed = getComputedStyle(li);
      const anims = li.getAnimations();
      bullets.push({
        text: li.textContent.trim().substring(0, 60),
        opacity: parseFloat(computed.opacity),
        display: computed.display,
        visibility: computed.visibility,
        transform: computed.transform,
        inlineOpacity: li.style.opacity,
        inlineDisplay: li.style.display,
        animations: anims.map(a => ({
          name: a.animationName || a.id || 'unnamed',
          state: a.playState,
          progress: a.effect?.getComputedTiming?.()?.progress ?? null,
        })),
      });
    }

    // Check for running animations anywhere
    const allAnims = document.getAnimations();
    const runningAnims = allAnims.filter(a => a.playState === 'running');

    return {
      slideClass: slideEl.className,
      title: slideEl.querySelector('h1')?.textContent || null,
      transitionLayers: transitionState,
      sections,
      bullets,
      totalAnimations: allAnims.length,
      runningAnimations: runningAnims.length,
    };
  });
}

/**
 * Capture a positional fingerprint of all visible elements at the current state.
 * Returns a stable, serializable snapshot: for each element, its bounding rect,
 * computed opacity, display, and transform. Used to detect layout inconsistencies
 * when the same (slide, step) is visited multiple times.
 */
async function captureFingerprint(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.transition-layer:last-child');
    if (!stage) return null;
    const slideEl = stage.querySelector('.slide');
    if (!slideEl) return null;

    const elements = [];

    // Collect all meaningful elements: h1, h2, sections, bullets, paragraphs
    const selectors = 'h1, h2, li, p, div:not(.slide__footer):not(.transition-layer):not(.transition-stage):not(.presentation)';
    for (const el of slideEl.querySelectorAll(selectors)) {
      if (el.closest('.slide__footer')) continue;
      const computed = getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      // Skip elements that are not rendered
      if (computed.display === 'none') continue;

      // Snap opacity to 0 or 1 for effectively-hidden/visible elements
      // to avoid capturing mid-animation fractional values
      const rawOpacity = parseFloat(computed.opacity);
      const opacity = rawOpacity < 0.01 ? 0 : rawOpacity > 0.99 ? 1 : Math.round(rawOpacity * 100) / 100;

      elements.push({
        tag: el.tagName,
        text: el.textContent.trim().substring(0, 40),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        opacity,
        display: computed.display,
      });
    }

    return elements;
  });
}

/**
 * Compare two fingerprints and return a list of differences.
 * Allows a small tolerance for sub-pixel rounding.
 */
function compareFingerprints(baseline, current, label) {
  const diffs = [];
  const TOLERANCE = 2; // pixels

  if (!baseline || !current) return diffs;

  // Compare by index — element order should be stable
  const len = Math.max(baseline.length, current.length);
  for (let i = 0; i < len; i++) {
    const b = baseline[i];
    const c = current[i];

    if (!b && c) {
      diffs.push(`${label}: extra element [${i}] ${c.tag} "${c.text}" appeared`);
      continue;
    }
    if (b && !c) {
      diffs.push(`${label}: element [${i}] ${b.tag} "${b.text}" missing`);
      continue;
    }

    // Position drift
    const dx = Math.abs(b.x - c.x);
    const dy = Math.abs(b.y - c.y);
    const dw = Math.abs(b.w - c.w);
    const dh = Math.abs(b.h - c.h);
    if (dx > TOLERANCE || dy > TOLERANCE) {
      diffs.push(`${label}: ${b.tag} "${b.text}" position shifted (${b.x},${b.y})→(${c.x},${c.y})`);
    }
    if (dw > TOLERANCE || dh > TOLERANCE) {
      diffs.push(`${label}: ${b.tag} "${b.text}" size changed (${b.w}x${b.h})→(${c.w}x${c.h})`);
    }

    // Opacity mismatch (after snapping, so only flags real visibility changes)
    if (Math.abs(b.opacity - c.opacity) > 0.05) {
      diffs.push(`${label}: ${b.tag} "${b.text}" opacity ${b.opacity}→${c.opacity}`);
    }

    // Display mismatch
    if (b.display !== c.display) {
      diffs.push(`${label}: ${b.tag} "${b.text}" display ${b.display}→${c.display}`);
    }
  }

  return diffs;
}

/**
 * Capture an animation snapshot: total count and per-element animation IDs.
 * Used to detect whether new animations fired between two points in time.
 */
async function snapshotAnimations(page) {
  return page.evaluate(() => {
    const allAnims = document.getAnimations();
    return {
      total: allAnims.length,
      ids: allAnims.map(a => a.id || `${a.effect?.target?.tagName}:${a.animationName || 'waapi'}`),
      // Count animations in 'running' or 'pending' state — freshly fired
      active: allAnims.filter(a => a.playState === 'running' || a.playState === 'pending').length,
    };
  });
}

// ---------- Validation ----------

/**
 * Build expected state for a slide at a given step from parsed script data.
 */
function buildExpectations(slide, step) {
  const expectations = { sections: [], bullets: [] };

  for (const section of slide.sections) {
    const visible = section.reveal == null || step >= section.reveal;
    const dismissed = section.dismiss != null && step >= section.dismiss;
    const shouldShow = visible && !dismissed;

    expectations.sections.push({
      id: section.id,
      title: section.title,
      shouldBeVisible: shouldShow,
      hasEnterAnim: !!section.enter,
      hasDismissAnim: !!section.exit,
      dismissed,
    });

    // Bullets from all segments
    for (const seg of section.segments) {
      const segVisible = seg.reveal == null || step >= seg.reveal;
      if (!segVisible && seg.reveal != null) continue; // segment not revealed yet

      for (const bullet of seg.bullets) {
        const bVisible = bullet.reveal == null || step >= bullet.reveal;
        const bDismissed = bullet.dismiss != null && step >= bullet.dismiss;
        const bShouldShow = bVisible && !bDismissed && shouldShow;

        expectations.bullets.push({
          html: bullet.html.substring(0, 60),
          shouldBeVisible: bShouldShow,
          hasEnterAnim: !!bullet.enter,
          hasExitAnim: !!bullet.exit,
          dismissed: bDismissed,
          reveal: bullet.reveal,
        });
      }
    }
  }

  return expectations;
}

/**
 * Validate DOM state against expectations. Returns array of issues.
 */
function validate(dom, expectations, slideIndex, step) {
  const issues = [];
  const prefix = `slide ${slideIndex}, step ${step}`;

  // 1. Check no running animations remain
  if (dom.runningAnimations > 0) {
    issues.push({
      severity: 'warn',
      message: `${prefix}: ${dom.runningAnimations} animation(s) still running after settle`,
    });
  }

  // 2. Check transition layers are clean (exit layer should be empty after animation)
  if (dom.transitionLayers?.length >= 2) {
    const exitLayer = dom.transitionLayers[0];
    if (exitLayer.hasContent && !exitLayer.className.includes('slide-exit')) {
      // Exit layer has leftover content but no active exit animation
      issues.push({
        severity: 'warn',
        message: `${prefix}: exit transition layer has leftover content (${exitLayer.childCount} children)`,
      });
    }
  }

  // 3. Validate bullets
  for (let i = 0; i < expectations.bullets.length; i++) {
    const exp = expectations.bullets[i];
    const actual = dom.bullets[i];
    if (!actual) {
      // Bullet might not be in DOM if section is hidden
      if (exp.shouldBeVisible) {
        issues.push({
          severity: 'fail',
          message: `${prefix}: bullet "${exp.html}" expected visible but not found in DOM`,
        });
      }
      continue;
    }

    const isEffectivelyVisible = actual.opacity > 0 && actual.display !== 'none';

    if (exp.shouldBeVisible && !isEffectivelyVisible) {
      // If it has an enter animation, opacity 0 is OK if animation is still initializing
      if (!exp.hasEnterAnim || actual.animations.length === 0) {
        issues.push({
          severity: 'fail',
          message: `${prefix}: bullet "${exp.html}" expected visible but opacity=${actual.opacity}, display=${actual.display}`,
        });
      }
    }

    if (!exp.shouldBeVisible && isEffectivelyVisible && !exp.hasExitAnim) {
      issues.push({
        severity: 'fail',
        message: `${prefix}: bullet "${exp.html}" expected hidden but opacity=${actual.opacity}, display=${actual.display}`,
      });
    }
  }

  return issues;
}

// ---------- Test runner ----------

// Stores positional fingerprints keyed by "slide:step" for consistency checks.
const fingerprintStore = {};

/**
 * Run a single check: inspect DOM, validate against expectations, record result.
 *
 * @param {object} [opts] - Optional context for backward-specific validation
 * @param {object} [opts.animBefore] - Animation snapshot taken before the action
 * @param {boolean} [opts.crossedBoundary] - Whether a slide boundary was crossed
 */
async function runCheck(page, slide, slideIndex, step, label, results, opts = {}) {
  const dom = await inspectSlideDOM(page);

  if (dom.error) {
    results.allIssues.push({ severity: 'fail', message: `${label}: ${dom.error}` });
    results.failed++;
    return;
  }

  const expectations = buildExpectations(slide, step);
  const issues = validate(dom, expectations, slideIndex, step);

  // Backward-specific: check animation behaviour
  if (opts.animBefore) {
    const animAfter = await snapshotAnimations(page);

    if (opts.crossedBoundary) {
      const exitLayer = dom.transitionLayers?.[0];
      if (exitLayer?.hasContent && !exitLayer.className.includes('slide-exit')) {
        issues.push({
          severity: 'fail',
          message: `slide ${slideIndex}, step ${step}: backward cross-boundary left dirty exit layer`,
        });
      }
    } else {
      const newAnims = animAfter.total - opts.animBefore.total;
      if (newAnims > 0) {
        issues.push({
          severity: 'warn',
          message: `slide ${slideIndex}, step ${step}: ${newAnims} new animation(s) fired on backward step (expected 0 within-slide)`,
        });
      }
      if (animAfter.active > 0) {
        issues.push({
          severity: 'warn',
          message: `slide ${slideIndex}, step ${step}: ${animAfter.active} animation(s) still active after backward step settle`,
        });
      }
    }
  }

  // --- Positional fingerprint: capture and compare ---
  const fpKey = `${slideIndex}:${step}`;
  const fingerprint = await captureFingerprint(page);

  if (fingerprint) {
    if (fingerprintStore[fpKey]) {
      // Revisiting this state — compare against baseline
      const diffs = compareFingerprints(fingerprintStore[fpKey], fingerprint, label);
      for (const diff of diffs) {
        issues.push({ severity: 'fail', message: diff });
      }
      if (diffs.length === 0 && VERBOSE) {
        console.log(dim(`    fingerprint matches baseline for ${fpKey}`));
      }
    } else {
      // First visit — store as baseline
      fingerprintStore[fpKey] = fingerprint;
    }
  }

  // Rewrite issue messages to use the label
  for (const issue of issues) {
    issue.message = issue.message.replace(/^slide \d+, step \d+/, label);
  }

  results.totalChecks++;

  if (issues.length === 0) {
    results.passed++;
    if (VERBOSE) {
      console.log(green('  ✓') + ` ${label}` +
        dim(` (${dom.bullets.length} bullets, ${dom.sections.length} sections, ${dom.totalAnimations} anims)`));
    }
  } else {
    const fails = issues.filter(i => i.severity === 'fail');
    const warns = issues.filter(i => i.severity === 'warn');
    if (fails.length > 0) results.failed++;
    else results.passed++;
    results.warnings += warns.length;
    results.allIssues.push(...issues);

    for (const issue of issues) {
      const icon = issue.severity === 'fail' ? red('  ✗') : yellow('  ⚠');
      console.log(`${icon} ${issue.message}`);
    }
  }

  if (SCREENSHOTS) {
    const safeName = label.replace(/[^a-z0-9]+/gi, '-');
    const name = `screenshot-${safeName}.png`;
    await page.screenshot({ path: `tools/${name}` });
    if (VERBOSE) console.log(dim(`    📸 ${name}`));
  }
}

// ---------- Forward walk ----------

async function runForwardTests(page, slides, results) {
  console.log(bold('── Forward walk ──\n'));

  for (let si = 0; si < slides.length; si++) {
    if (SLIDE_FILTER != null && si !== SLIDE_FILTER) continue;

    const slide = slides[si];
    const maxStep = slide.maxStep || 0;

    await enginePost(`/slide/${si}`);
    await waitForAnimations(page);

    for (let step = 0; step <= maxStep; step++) {
      if (step > 0) {
        await enginePost('/slide/next');
        await waitForAnimations(page);
      }

      const label = `slide ${si} "${slide.title}" step ${step}`;
      await runCheck(page, slide, si, step, label, results);
    }

    const stepCount = maxStep + 1;
    const slideIssues = results.allIssues.filter(i => i.message.includes(`slide ${si} "`));
    const slideFails = slideIssues.filter(i => i.severity === 'fail').length;
    if (slideFails > 0) {
      console.log(red(`✗ Slide ${si}`) + ` "${slide.title}" — ${stepCount} steps, ${slideFails} failure(s)`);
    } else {
      console.log(green(`✓ Slide ${si}`) + ` "${slide.title}" — ${stepCount} steps` +
        (slideIssues.length > 0 ? yellow(` (${slideIssues.length} warning(s))`) : ''));
    }
  }
}

// ---------- Backward navigation tests ----------

async function runBackwardTests(page, slides, results) {
  console.log(bold('\n── Backward navigation ──\n'));

  // --- Test 1: Cross-slide boundary backward ---
  // Navigate to slide 3 step 0, then prev → should land on slide 2 at maxStep
  // Slide 2 is "Reveal & Dismiss" (maxStep=3): at step 3, bullet 1 is dismissed,
  // bullet 2 is visible, replacement paragraph is visible.
  // Cross-boundary = component remounts, so animations SHOULD fire fresh.
  {
    const targetSlide = 2;
    const fromSlide = 3;
    if (fromSlide < slides.length && targetSlide < slides.length) {
      const slide = slides[targetSlide];
      const expectedStep = slide.maxStep;

      await enginePost(`/slide/${fromSlide}`);
      await waitForAnimations(page);
      const animBefore = await snapshotAnimations(page);
      await enginePost('/slide/prev');
      await waitForAnimations(page);

      const label = `back: slide ${fromSlide}→${targetSlide} step ${expectedStep} (cross-boundary)`;
      await runCheck(page, slide, targetSlide, expectedStep, label, results,
        { animBefore, crossedBoundary: true });
    }
  }

  // --- Test 2: Within-slide backward, un-dismiss ---
  // On slide 2 "Reveal & Dismiss", go to step 3 (bullet 1 dismissed),
  // then prev to step 2 (bullet 1 should be visible again).
  // Within-slide = NO remount, so NO new enter animations should fire.
  {
    const si = 2;
    if (si < slides.length) {
      const slide = slides[si];

      // Go to step 3 first (dismissed state)
      await enginePost(`/slide/${si}`);
      await waitForAnimations(page);
      for (let s = 0; s < 3; s++) {
        await enginePost('/slide/next');
        await waitForAnimations(page);
      }

      // Snapshot before going back
      const animBefore = await snapshotAnimations(page);
      await enginePost('/slide/prev');
      await waitForAnimations(page);

      const label = `back: slide ${si} step 3→2 (un-dismiss bullet)`;
      await runCheck(page, slide, si, 2, label, results,
        { animBefore, crossedBoundary: false });
    }
  }

  // --- Test 3: Within-slide backward, un-reveal ---
  // On slide 1 "Features Overview" (maxStep=4), go to step 3,
  // then prev to step 2. Bullets at reveal=3 and reveal=4 should be hidden.
  // No new animations should fire (within-slide backward).
  {
    const si = 1;
    if (si < slides.length) {
      const slide = slides[si];

      await enginePost(`/slide/${si}`);
      await waitForAnimations(page);
      for (let s = 0; s < 3; s++) {
        await enginePost('/slide/next');
        await waitForAnimations(page);
      }

      const animBefore = await snapshotAnimations(page);
      await enginePost('/slide/prev');
      await waitForAnimations(page);

      const label = `back: slide ${si} step 3→2 (un-reveal bullets)`;
      await runCheck(page, slide, si, 2, label, results,
        { animBefore, crossedBoundary: false });
    }
  }

  // --- Test 4: Multiple backward steps across two slide boundaries ---
  // Start at slide 4 step 0, prev three times:
  //   slide 4 step 0 → slide 3 maxStep → slide 3 step 0 → slide 2 maxStep
  // Tracks animation state at each hop to verify cross- vs within-slide behaviour.
  {
    const startSlide = 4;
    if (startSlide < slides.length && startSlide >= 2) {
      // Jump to slide 4
      await enginePost(`/slide/${startSlide}`);
      await waitForAnimations(page);

      // prev 1: slide 4→3 at maxStep (cross-boundary)
      let animBefore = await snapshotAnimations(page);
      await enginePost('/slide/prev');
      await waitForAnimations(page);
      {
        const si = 3;
        const slide = slides[si];
        const label = `back: slide ${startSlide}→${si} step ${slide.maxStep} (boundary 1)`;
        await runCheck(page, slide, si, slide.maxStep, label, results,
          { animBefore, crossedBoundary: true });
      }

      // prev 2: slide 3 step maxStep→step maxStep-1 (or cross boundary if maxStep=0)
      animBefore = await snapshotAnimations(page);
      await enginePost('/slide/prev');
      await waitForAnimations(page);
      {
        const si = 3;
        const slide = slides[si];
        const expectedStep = slide.maxStep > 0 ? slide.maxStep - 1 : 0;
        if (slide.maxStep > 0) {
          const label = `back: slide ${si} step ${slide.maxStep}→${expectedStep} (within-slide)`;
          await runCheck(page, slide, si, expectedStep, label, results,
            { animBefore, crossedBoundary: false });
        } else {
          // Crossed another boundary to slide 2
          const prevSi = 2;
          const prevSlide = slides[prevSi];
          const label = `back: slide ${si}→${prevSi} step ${prevSlide.maxStep} (boundary 2)`;
          await runCheck(page, prevSlide, prevSi, prevSlide.maxStep, label, results,
            { animBefore, crossedBoundary: true });
        }
      }

      // prev 3: keep going back
      animBefore = await snapshotAnimations(page);
      await enginePost('/slide/prev');
      await waitForAnimations(page);

      // Verify we get the engine state and it matches what we inspect
      const engineState = await engineGet('/state');
      const si = engineState.currentIndex;
      const step = engineState.currentStep;
      const slide = slides[si];
      const prevSi = 3;
      const crossed = si !== prevSi;
      const label = `back: continued prev → slide ${si} step ${step} (chain)`;
      await runCheck(page, slide, si, step, label, results,
        { animBefore, crossedBoundary: crossed });
    }
  }

  // --- Test 5: Backward into dismissed-then-revealed slide ---
  // Slide 2 has dismiss=3 on bullet 1. Navigate forward through all steps,
  // then backward step-by-step through the full dismiss/reveal lifecycle.
  // Every backward step is within-slide, so no new animations should fire.
  {
    const si = 2;
    if (si < slides.length) {
      const slide = slides[si];

      // Go to maxStep (step 3)
      await enginePost(`/slide/${si}`);
      await waitForAnimations(page);
      for (let s = 0; s < slide.maxStep; s++) {
        await enginePost('/slide/next');
        await waitForAnimations(page);
      }

      // Walk backward through every step, checking animation count at each
      for (let step = slide.maxStep - 1; step >= 0; step--) {
        const animBefore = await snapshotAnimations(page);
        await enginePost('/slide/prev');
        await waitForAnimations(page);

        const label = `back: slide ${si} full-rewind step ${step}`;
        await runCheck(page, slide, si, step, label, results,
          { animBefore, crossedBoundary: false });
      }
    }
  }

  // --- Test 6: Cross-boundary backward with transition direction ---
  // Verify the exit layer is clean after a backward slide transition.
  // Go to slide 5 (enter=zoom), then prev to slide 4. The backward
  // transition should use dir-backward and clean up after itself.
  {
    const fromSlide = 5;
    const toSlide = 4;
    if (fromSlide < slides.length && toSlide < slides.length) {
      await enginePost(`/slide/${fromSlide}`);
      await waitForAnimations(page);

      const animBefore = await snapshotAnimations(page);
      await enginePost('/slide/prev');
      await waitForAnimations(page);

      const slide = slides[toSlide];
      const label = `back: slide ${fromSlide}→${toSlide} (transition cleanup)`;
      await runCheck(page, slide, toSlide, slide.maxStep, label, results,
        { animBefore, crossedBoundary: true });
    }
  }
}

// ---------- Round-trip consistency tests ----------

async function runRoundTripTests(page, slides, results) {
  console.log(bold('\n── Round-trip consistency ──\n'));

  // Walk forward through all slides/steps (fingerprints are stored as baselines
  // during the forward walk above). Now navigate backward and then forward again,
  // comparing fingerprints at each revisited (slide, step) pair.

  // Pick slides with interesting step counts for thorough round-trip testing
  const candidates = slides
    .map((s, i) => ({ slide: s, index: i }))
    .filter(c => c.slide.maxStep > 0);

  for (const { slide, index: si } of candidates) {
    if (SLIDE_FILTER != null && si !== SLIDE_FILTER) continue;

    const maxStep = slide.maxStep;

    // Forward to maxStep (establishes baseline if not already set)
    await enginePost(`/slide/${si}`);
    await waitForAnimations(page);
    await runCheck(page, slide, si, 0, `roundtrip: slide ${si} fwd step 0`, results);

    for (let s = 1; s <= maxStep; s++) {
      await enginePost('/slide/next');
      await waitForAnimations(page);
      await runCheck(page, slide, si, s, `roundtrip: slide ${si} fwd step ${s}`, results);
    }

    // Backward all the way to step 0
    for (let s = maxStep - 1; s >= 0; s--) {
      const animBefore = await snapshotAnimations(page);
      await enginePost('/slide/prev');
      await waitForAnimations(page);
      await runCheck(page, slide, si, s, `roundtrip: slide ${si} back step ${s}`, results,
        { animBefore, crossedBoundary: false });
    }

    // Forward again to maxStep — fingerprints must still match
    for (let s = 1; s <= maxStep; s++) {
      await enginePost('/slide/next');
      await waitForAnimations(page);
      await runCheck(page, slide, si, s, `roundtrip: slide ${si} re-fwd step ${s}`, results);
    }

    const rtIssues = results.allIssues.filter(i => i.message.includes(`roundtrip: slide ${si}`));
    const rtFails = rtIssues.filter(i => i.severity === 'fail').length;
    if (rtFails > 0) {
      console.log(red(`✗ Slide ${si}`) + ` "${slide.title}" round-trip — ${rtFails} inconsistency(ies)`);
    } else {
      console.log(green(`✓ Slide ${si}`) + ` "${slide.title}" round-trip — fwd→back→fwd consistent`);
    }
  }

  // Cross-boundary round-trip: slide 2→3→2 (boundary crossing twice)
  if (slides.length > 3) {
    const si2 = 2, si3 = 3;
    const slide2 = slides[si2], slide3 = slides[si3];

    // Go to slide 2 maxStep
    await enginePost(`/slide/${si2}`);
    await waitForAnimations(page);
    for (let s = 0; s < slide2.maxStep; s++) {
      await enginePost('/slide/next');
      await waitForAnimations(page);
    }
    await runCheck(page, slide2, si2, slide2.maxStep,
      `roundtrip: cross-boundary slide ${si2} step ${slide2.maxStep} (before)`, results);

    // Forward into slide 3
    await enginePost('/slide/next');
    await waitForAnimations(page);
    await runCheck(page, slide3, si3, 0,
      `roundtrip: cross-boundary slide ${si3} step 0`, results);

    // Back to slide 2 maxStep
    const animBefore = await snapshotAnimations(page);
    await enginePost('/slide/prev');
    await waitForAnimations(page);
    await runCheck(page, slide2, si2, slide2.maxStep,
      `roundtrip: cross-boundary slide ${si2} step ${slide2.maxStep} (after back)`, results,
      { animBefore, crossedBoundary: true });

    // Forward into slide 3 again
    await enginePost('/slide/next');
    await waitForAnimations(page);
    await runCheck(page, slide3, si3, 0,
      `roundtrip: cross-boundary slide ${si3} step 0 (revisit)`, results);

    const xIssues = results.allIssues.filter(i => i.message.includes('cross-boundary slide'));
    const xFails = xIssues.filter(i => i.severity === 'fail').length;
    if (xFails > 0) {
      console.log(red(`✗ Cross-boundary`) + ` round-trip — ${xFails} inconsistency(ies)`);
    } else {
      console.log(green(`✓ Cross-boundary`) + ` round-trip — slide ${si2}↔${si3} consistent`);
    }
  }
}

// ---------- Main ----------

async function main() {
  let engineState;
  try {
    engineState = await engineGet('/state');
  } catch (e) {
    console.error(red('✗ Cannot connect to engine at ' + ENGINE));
    console.error('  Start the engine first: npm run engine');
    process.exit(1);
  }

  const { slides } = engineState;
  console.log(bold(`\nds-test — ${slides.length} slides loaded\n`));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto(VIEWER, { waitUntil: 'networkidle', timeout: 10000 });
  } catch (e) {
    console.error(red('✗ Cannot connect to viewer at ' + VIEWER));
    console.error('  Start the viewer first: npm run viewer');
    await browser.close();
    process.exit(1);
  }

  await page.waitForSelector('.status', { timeout: 5000 });
  await page.waitForFunction(
    () => document.querySelector('.status')?.textContent === '●',
    { timeout: 5000 }
  ).catch(() => {
    console.warn(yellow('⚠ WebSocket connection indicator not found, proceeding anyway'));
  });

  const results = { totalChecks: 0, passed: 0, failed: 0, warnings: 0, allIssues: [] };

  await runForwardTests(page, slides, results);
  await runBackwardTests(page, slides, results);
  await runRoundTripTests(page, slides, results);

  await browser.close();

  // Summary
  console.log(bold('\n─── Summary ───'));
  console.log(`  Checks:   ${results.totalChecks}`);
  console.log(`  Passed:   ${green(String(results.passed))}`);
  if (results.failed > 0) console.log(`  Failed:   ${red(String(results.failed))}`);
  if (results.warnings > 0) console.log(`  Warnings: ${yellow(String(results.warnings))}`);
  console.log('');

  if (results.failed > 0) {
    console.log(red('FAIL'));
    process.exit(1);
  } else {
    console.log(green('PASS'));
  }
}

main().catch(err => {
  console.error(red('Fatal error:'), err.message);
  process.exit(1);
});
