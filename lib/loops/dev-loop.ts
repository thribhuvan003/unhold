import 'server-only';

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Claude Code implementer harness — DEV LOOP runner.
 * Complements type-only agent-harness.ts with executable gate loops.
 * @see docs/BUILD_SPEC_LOOPS.md §4, §11.2
 */

export type DevLoopPhase = 'plan' | 'implement' | 'test' | 'review' | 'fix';

export type DevLoopGate = {
  name: string;
  command: string;
  required: boolean;
};

export type DevLoopSlice = {
  id: string;
  description: string;
  allowed_files: string[];
  forbidden_patterns: RegExp[];
  gates: DevLoopGate[];
  max_iterations: number;
};

export type DevLoopIteration = {
  iteration: number;
  phase: DevLoopPhase;
  started_at: string;
  ended_at?: string;
  gates: Array<{ name: string; passed: boolean; output?: string }>;
  files_touched: string[];
  success: boolean;
};

export type DevLoopResult = {
  slice_id: string;
  success: boolean;
  iterations: DevLoopIteration[];
  failure_reason?: string;
};

const DEFAULT_GATES: DevLoopGate[] = [
  { name: 'typecheck', command: 'pnpm typecheck', required: true },
  { name: 'no-auto-send', command: 'bash scripts/verify-no-auto-send.sh', required: true },
];

function repoRoot(): string {
  return process.env.LIENLIBERATOR_ROOT ?? process.cwd();
}

function assertAllowedFiles(slice: DevLoopSlice, touchedFiles: string[]): void {
  for (const f of touchedFiles) {
    const normalized = f.replace(/^\//, '');
    const allowed = slice.allowed_files.some(
      (a) => normalized === a || normalized.startsWith(a.replace(/\*$/, '')),
    );
    if (!allowed) {
      throw new Error(`dev_loop_guard: file not in slice allowlist: ${normalized}`);
    }
  }
}

function scanForbiddenPatterns(slice: DevLoopSlice, files: string[]): string[] {
  const violations: string[] = [];
  const root = repoRoot();
  for (const rel of files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    for (const pattern of slice.forbidden_patterns) {
      if (pattern.test(content)) {
        violations.push(`${rel} matches ${pattern}`);
      }
    }
  }
  return violations;
}

function runGate(gate: DevLoopGate): { passed: boolean; output: string } {
  try {
    const output = execSync(gate.command, {
      cwd: repoRoot(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300_000,
    });
    return { passed: true, output: output.slice(0, 4000) };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    return {
      passed: false,
      output: [e.stdout, e.stderr].filter(Boolean).join('\n').slice(0, 4000),
    };
  }
}

export async function runDevLoop(
  slice: DevLoopSlice,
  implementFn: (ctx: {
    iteration: number;
    phase: DevLoopPhase;
    priorFailures: string[];
  }) => Promise<{ files_touched: string[]; notes?: string }>,
): Promise<DevLoopResult> {
  const iterations: DevLoopIteration[] = [];
  const gates = [...DEFAULT_GATES, ...slice.gates];
  const priorFailures: string[] = [];

  for (let i = 1; i <= slice.max_iterations; i++) {
    const startedAt = new Date().toISOString();

    const impl = await implementFn({
      iteration: i,
      phase: i === 1 ? 'plan' : 'fix',
      priorFailures,
    });

    assertAllowedFiles(slice, impl.files_touched);

    const patternViolations = scanForbiddenPatterns(slice, impl.files_touched);
    if (patternViolations.length > 0) {
      priorFailures.push(...patternViolations);
      iterations.push({
        iteration: i,
        phase: 'review',
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        gates: [
          { name: 'forbidden_pattern', passed: false, output: patternViolations.join('\n') },
        ],
        files_touched: impl.files_touched,
        success: false,
      });
      continue;
    }

    const gateResults = gates.map((g) => {
      const r = runGate(g);
      return { name: g.name, passed: r.passed, output: r.output };
    });

    const requiredFailed = gateResults.filter((r, idx) => gates[idx].required && !r.passed);
    const success = requiredFailed.length === 0;

    iterations.push({
      iteration: i,
      phase: success ? 'review' : 'fix',
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      gates: gateResults,
      files_touched: impl.files_touched,
      success,
    });

    if (success) {
      return { slice_id: slice.id, success: true, iterations };
    }

    priorFailures.push(...requiredFailed.map((f) => `${f.name}:\n${f.output ?? ''}`));
  }

  return {
    slice_id: slice.id,
    success: false,
    iterations,
    failure_reason: `max_iterations (${slice.max_iterations}) exceeded`,
  };
}

/** Reference slice config — cron tick loop (slice-09) */
export const SLICE_09_CRON_TICK: DevLoopSlice = {
  id: 'slice-09-cron-tick',
  description: 'Cron tick + case inner loop + lead router',
  allowed_files: [
    'lib/loops/case-tick.ts',
    'lib/loops/scheduling.ts',
    'lib/loops/locks.ts',
    'lib/loops/termination.ts',
    'lib/agents/router.ts',
    'lib/jobs/enqueue.ts',
    'app/api/v1/internal/cron/tick/route.ts',
    'tests/unit/loops/case-tick.test.ts',
    'tests/unit/agents/router.test.ts',
  ],
  forbidden_patterns: [
    /send_email|send_sms|file_rbi|mark_escalation_sent/,
    /update_case_status_unguarded/,
  ],
  gates: [
    {
      name: 'case-tick-unit',
      command: 'pnpm vitest run tests/unit/loops/case-tick.test.ts',
      required: false,
    },
  ],
  max_iterations: 8,
};