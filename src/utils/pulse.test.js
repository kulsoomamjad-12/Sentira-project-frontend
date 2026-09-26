import { describe, it, expect } from 'vitest';
import { buildPulseMessage } from './pulse';

// buildPulseMessage picks one headline sentence out of a priority list:
// 1. no feedback at all
// 2. a critical/high urgency review from the last 24h
// 3. a meaningful week-over-week change in the top trending topic
// 4. the % of recent feedback that's positive
// 5. a generic "still collecting data" fallback
// Each test isolates exactly one rung of that ladder.

const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

describe('buildPulseMessage', () => {
  it('returns the empty-state message when there is no feedback yet', () => {
    const result = buildPulseMessage([], [], null);
    expect(result.icon).toBe('👋');
    expect(result.text).toMatch(/No feedback yet/);
  });

  it('flags a critical review from the last 24 hours as the top priority', () => {
    const feedback = [
      {
        createdAt: hoursAgo(2),
        comment: 'Everything is on fire',
        aiAnalysis: { urgency: 'critical', summary: 'Checkout is completely broken' },
      },
    ];
    const result = buildPulseMessage(feedback, [], null);
    expect(result.icon).toBe('⚠️');
    expect(result.text).toBe('Critical alert: "Checkout is completely broken"');
  });

  it('flags a high-urgency review from the last 24 hours, distinct from critical', () => {
    const feedback = [
      {
        createdAt: hoursAgo(1),
        comment: 'This needs fixing soon',
        aiAnalysis: { urgency: 'high', summary: null },
      },
    ];
    const result = buildPulseMessage(feedback, [], null);
    expect(result.icon).toBe('🚨');
    expect(result.text).toBe('Urgent — needs fixing: "This needs fixing soon"');
  });

  it('ignores a critical review older than 24 hours', () => {
    const feedback = [
      { createdAt: hoursAgo(48), comment: 'Old issue', aiAnalysis: { urgency: 'critical', summary: 'Old issue' } },
    ];
    // Falls through every other rung with nothing to show, landing on the
    // generic fallback rather than the stale critical alert.
    const result = buildPulseMessage(feedback, [], null);
    expect(result.text).not.toMatch(/Critical alert/);
  });

  it('prefers the most urgent of several recent flagged reviews, then the most recent', () => {
    const feedback = [
      { createdAt: hoursAgo(5), comment: 'high one', aiAnalysis: { urgency: 'high', summary: 'high one' } },
      { createdAt: hoursAgo(1), comment: 'critical one', aiAnalysis: { urgency: 'critical', summary: 'critical one' } },
    ];
    const result = buildPulseMessage(feedback, [], null);
    expect(result.text).toBe('Critical alert: "critical one"');
  });

  it('reports an upward trend when the top tag rose week over week', () => {
    const feedback = [{ createdAt: hoursAgo(200), comment: 'fine', aiAnalysis: { urgency: 'low' } }];
    const trends = [
      {
        _id: 'Checkout Bug',
        weeklyCounts: [
          { week: '2026-01-01', count: 4 },
          { week: '2026-01-08', count: 8 },
        ],
      },
    ];
    const result = buildPulseMessage(feedback, trends, null);
    expect(result.icon).toBe('📈');
    expect(result.text).toBe('"Checkout Bug" mentions are up 100% vs last week.');
  });

  it('reports a downward trend when the top tag fell week over week', () => {
    const feedback = [{ createdAt: hoursAgo(200), comment: 'fine', aiAnalysis: { urgency: 'low' } }];
    const trends = [
      {
        _id: 'Pricing',
        weeklyCounts: [
          { week: '2026-01-01', count: 10 },
          { week: '2026-01-08', count: 5 },
        ],
      },
    ];
    const result = buildPulseMessage(feedback, trends, null);
    expect(result.icon).toBe('📉');
    expect(result.text).toBe('"Pricing" mentions are down 50% vs last week.');
  });

  it('skips the trend rung when there is only one week of data', () => {
    const feedback = [{ createdAt: hoursAgo(200), comment: 'fine', aiAnalysis: { urgency: 'low' } }];
    const trends = [{ _id: 'Pricing', weeklyCounts: [{ week: '2026-01-01', count: 10 }] }];
    const summary = { breakdown: [{ sentiment: 'Positive', percentage: 80 }] };
    const result = buildPulseMessage(feedback, trends, summary);
    expect(result.icon).toBe('✅');
  });

  it('skips the trend rung when the previous week had zero mentions (avoids divide-by-zero)', () => {
    const feedback = [{ createdAt: hoursAgo(200), comment: 'fine', aiAnalysis: { urgency: 'low' } }];
    const trends = [
      {
        _id: 'New Topic',
        weeklyCounts: [
          { week: '2026-01-01', count: 0 },
          { week: '2026-01-08', count: 3 },
        ],
      },
    ];
    const summary = { breakdown: [{ sentiment: 'Positive', percentage: 70 }] };
    const result = buildPulseMessage(feedback, trends, summary);
    expect(result.icon).toBe('✅');
  });

  it('skips the trend rung when the week-over-week change is exactly 0%', () => {
    const feedback = [{ createdAt: hoursAgo(200), comment: 'fine', aiAnalysis: { urgency: 'low' } }];
    const trends = [
      {
        _id: 'Steady Topic',
        weeklyCounts: [
          { week: '2026-01-01', count: 5 },
          { week: '2026-01-08', count: 5 },
        ],
      },
    ];
    const summary = { breakdown: [{ sentiment: 'Positive', percentage: 65 }] };
    const result = buildPulseMessage(feedback, trends, summary);
    expect(result.icon).toBe('✅');
    expect(result.text).toMatch(/65%/);
  });

  it('falls back to the positive-percentage message when there is no trend data', () => {
    const feedback = [{ createdAt: hoursAgo(200), comment: 'fine', aiAnalysis: { urgency: 'low' } }];
    const summary = { breakdown: [{ sentiment: 'Positive', percentage: 42 }] };
    const result = buildPulseMessage(feedback, [], summary);
    expect(result.icon).toBe('✅');
    expect(result.text).toBe('No critical issues right now — 42% of recent feedback is positive.');
  });

  it('falls back to the generic message when nothing else applies', () => {
    const feedback = [{ createdAt: hoursAgo(200), comment: 'fine', aiAnalysis: { urgency: 'low' } }];
    const result = buildPulseMessage(feedback, [], { breakdown: [] });
    expect(result.icon).toBe('ℹ️');
    expect(result.text).toMatch(/check back soon/);
  });
});
