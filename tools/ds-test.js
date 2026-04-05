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
const SETTLE_MS = 100;

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

// ---------- Main ----------

async function main() {
  // Fetch presentation state from engine
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

  // Launch headless browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // Navigate to viewer
  try {
    await page.goto(VIEWER, { waitUntil: 'networkidle', timeout: 10000 });
  } catch (e) {
    console.error(red('✗ Cannot connect to viewer at ' + VIEWER));
    console.error('  Start the viewer first: npm run viewer');
    await browser.close();
    process.exit(1);
  }

  // Wait for initial WebSocket connection
  await page.waitForSelector('.status', { timeout: 5000 });
  await page.waitForFunction(
    () => document.querySelector('.status')?.textContent === '●',
    { timeout: 5000 }
  ).catch(() => {
    console.warn(yellow('⚠ WebSocket connection indicator not found, proceeding anyway'));
  });

  let totalChecks = 0;
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  const allIssues = [];

  for (let si = 0; si < slides.length; si++) {
    if (SLIDE_FILTER != null && si !== SLIDE_FILTER) continue;

    const slide = slides[si];
    const maxStep = slide.maxStep || 0;

    // Jump to this slide
    await enginePost(`/slide/${si}`);
    await waitForAnimations(page);

    for (let step = 0; step <= maxStep; step++) {
      // If not on step 0, advance step by step
      if (step > 0) {
        await enginePost('/slide/next');
        await waitForAnimations(page);
      }

      // Inspect DOM
      const dom = await inspectSlideDOM(page);

      if (dom.error) {
        allIssues.push({ severity: 'fail', message: `slide ${si}, step ${step}: ${dom.error}` });
        failed++;
        continue;
      }

      // Build expectations and validate
      const expectations = buildExpectations(slide, step);
      const issues = validate(dom, expectations, si, step);

      totalChecks++;

      if (issues.length === 0) {
        passed++;
        if (VERBOSE) {
          console.log(green('  ✓') + ` slide ${si} "${slide.title}" step ${step}` +
            dim(` (${dom.bullets.length} bullets, ${dom.sections.length} sections, ${dom.totalAnimations} anims)`));
        }
      } else {
        const fails = issues.filter(i => i.severity === 'fail');
        const warns = issues.filter(i => i.severity === 'warn');
        if (fails.length > 0) failed++;
        else passed++;
        warnings += warns.length;
        allIssues.push(...issues);

        for (const issue of issues) {
          const icon = issue.severity === 'fail' ? red('  ✗') : yellow('  ⚠');
          console.log(`${icon} ${issue.message}`);
        }
      }

      // Screenshot
      if (SCREENSHOTS) {
        const name = `screenshot-s${si}-step${step}.png`;
        await page.screenshot({ path: `tools/${name}` });
        if (VERBOSE) console.log(dim(`    📸 ${name}`));
      }
    }

    // Print slide summary line
    const stepCount = maxStep + 1;
    const slideIssues = allIssues.filter(i => i.message.startsWith(`slide ${si},`));
    const slideFails = slideIssues.filter(i => i.severity === 'fail').length;
    if (slideFails > 0) {
      console.log(red(`✗ Slide ${si}`) + ` "${slide.title}" — ${stepCount} steps, ${slideFails} failure(s)`);
    } else {
      console.log(green(`✓ Slide ${si}`) + ` "${slide.title}" — ${stepCount} steps` +
        (slideIssues.length > 0 ? yellow(` (${slideIssues.length} warning(s))`) : ''));
    }
  }

  await browser.close();

  // Summary
  console.log(bold('\n─── Summary ───'));
  console.log(`  Checks:   ${totalChecks}`);
  console.log(`  Passed:   ${green(String(passed))}`);
  if (failed > 0) console.log(`  Failed:   ${red(String(failed))}`);
  if (warnings > 0) console.log(`  Warnings: ${yellow(String(warnings))}`);
  console.log('');

  if (failed > 0) {
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
