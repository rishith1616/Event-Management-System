/**
 * tests/mobileUx.test.js — Automated test suite for NFR-04: Mobile-First Checkout UX
 * Verifies that the checkout user experience conforms to mobile-first standards:
 * - Adapts to small screens without horizontal scrolling (Pass Criteria)
 * - Large touch targets (min 48px) and touch-friendly forms (No tiny buttons / broken layouts)
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

test('NFR-04: Mobile-First Checkout UX Test Suite', async (t) => {
  const cssPath = path.resolve('..', 'client', 'src', 'pages', 'Checkout.css');
  const jsxPath = path.resolve('..', 'client', 'src', 'pages', 'Checkout.jsx');

  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const jsxContent = fs.readFileSync(jsxPath, 'utf8');

  await t.test('1. Mobile breakpoint rules exist for small screens (<= 640px and <= 380px)', () => {
    assert.ok(
      cssContent.includes('@media (max-width: 640px)'),
      'Must define media query for mobile devices at 640px'
    );
    assert.ok(
      cssContent.includes('@media (max-width: 380px)'),
      'Must define media query for compact mobile screens down to 320px'
    );
  });

  await t.test('2. Layout eliminates horizontal scrolling (Pass Criteria)', () => {
    // Assert overflow-x protection and fluid widths
    assert.ok(
      cssContent.includes('overflow-x: hidden'),
      'Checkout container must prevent horizontal overflow scrolling'
    );
    assert.ok(
      cssContent.includes('box-sizing: border-box'),
      'Container and cards must use border-box sizing'
    );
    assert.ok(
      cssContent.includes('width: 100%'),
      'Mobile elements must be fluid 100% width'
    );
  });

  await t.test('3. Touch targets meet WCAG mobile accessibility (min-height: 48px) (Pass Criteria)', () => {
    // Buttons and inputs must not be too small (Pass: min 48px height, Fail: small buttons)
    assert.ok(
      cssContent.includes('min-height: 48px'),
      'Action buttons and inputs must have at least 48px touch target height'
    );
    assert.ok(
      cssContent.includes('font-size: 16px !important'),
      'Form inputs must use 16px font on mobile to prevent iOS Safari auto-zoom'
    );
  });

  await t.test('4. Payment and credit card preview adapt fluidly without fixed overflow', () => {
    assert.ok(
      cssContent.includes('payment-card-layout'),
      'Payment layout must adapt fluidly on mobile'
    );
    assert.ok(
      jsxContent.includes('payment-card-layout'),
      'Checkout JSX must apply mobile payment card layout class'
    );
  });

  await t.test('5. Single-column action flow on mobile (full width thumb-friendly buttons)', () => {
    assert.ok(
      cssContent.includes('flex-direction: column-reverse') || cssContent.includes('flex-direction: column'),
      'Action buttons must stack vertically for easy mobile thumb reach'
    );
    assert.ok(
      cssContent.includes('width: 100% !important') || cssContent.includes('width: 100%'),
      'Mobile checkout buttons must span full width'
    );
  });
});
