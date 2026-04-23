'use strict';

const pty = require('@homebridge/node-pty-prebuilt-multiarch');

const SILENCE_IDLE  = 45_000;
const HARD_TIMEOUT  = 600_000;
const START_TIMEOUT = 12_000;
const PROMPT_DELAY  = 4_000;

const STRIP_LINE_PATTERNS = [
  /^Welcome back .+!$/,
  /^Claude Code v\d/,
  /^Welcome to (Opus|Sonnet|Haiku)/i,
  /Tips for getting started/,
  /^Run \/init/,
  /Voice mode is now/,
  /^(Recent|No recent) activity$/i,
  /^\s*>\s*$/,
  /^[▐▛▜▝▞▟█▘▙╭╮╰╯│▌▗▖▘▝─═╔╗╚╝╠╣╦╩╬]+/,
  /^\│/,
  /^─{3,}$|^={3,}$|^-{3,}$/,
  /^[◐◑◒◓⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s/,
  /AppData.+Programs.+(VSCode|Microsoft)/i,
  /^#\s*Context\s*$/,
  /^##\s*(Workspace|File|Selection|Language)\s*/,
  /^\[Pasted text #\d+/i,
  /^(ctrl\+|esc |shift\+tab) to /i,
  /^⏵+bypass/i,
  /^·\s*\/\w+/,
  /^>\s*---/,
  /^▎/,
  /Claude Code has switched/i,
  /Run `claude install`/i,
  /docs\.anthropic\.com/i,
  /Here is your rewritten prompt/i,
  /Credit balance/i,
  /^paste again to expand/i,
  /^Visual Studio Code disconnected/i,
  /^(Pondering|Misting|Musing|Thinking|Thundering|Cogitating|Ruminating|Deliberating|Meditating|Simmering|Baking|Crunching|Puttering|Channeling|Marinating|Schlepping|Bloviating|Theorizing|Perambulating|Sautéing|Flibbertigibbeting|Calculating|Percolating|Noodling|Stewing|Brewing|Conjuring|Mulling|Contemplating|Waffling|Dithering|Finagling|Machinating|Finagling|Postulating|Hypothesizing|Extrapolating|Interpolating|Synthesizing)…/i,
  /^⎿\s+Tip:/i,
  /^Tip:\s+Use\s+\//i,
  /↓\s*\d+\s*tokens?/i,
  /\(\s*\d+s\s*·/,
  /thought for \d+s/i,
  /\d+m\s*\d+s\b/,
  /Tip:\s+Use\s+\//i,
  /lukhwaren/i,
  /claude\.ai|anthropic\.com/i,
  // spinner-only lines (decoration chars only)
  /^[✶✻✽✸✼✾●✢·✦✧✩✪✫✬✭✮✯✰✱✲✳✴✵✺✹▸▹►▻◂◃◄◅◆◇◈◉◊◌◍◎◐◑◒◓◔◕↓↑←→⏵⏶⏷⏸⏹⏺*\s\d.,]+$/,
  // thinking-repetition line
  /(\bthinking\b.*){3,}/i,
];

const DECORATION_RE = /[✶✻✽✸✼✾●✢·✦✧✩✪✫✬✭✮✯✰✱✲✳✴✵✺✹▸▹►▻◂◃◄◅◆◇◈◉◊◌◍◎◐◑◒◓◔◕⏵⏶⏷]/g;

function stripAnsi(raw) {
  let s = raw
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')    // CSI (cursor, colour, erase …)
    .replace(/\x1B\][^\x07]*\x07/g, '')         // OSC
    .replace(/\x1B[@-_][0-?]*[ -/]*[@-~]/g, '') // other ESC sequences
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // non-printable control chars

  // Normalise Windows \r\n → \n FIRST so we don't accidentally discard real content.
  // Only STANDALONE \r (spinner animation "go to start of line") should trigger
  // the "keep last frame" logic below.
  s = s.replace(/\r\n/g, '\n');

  // Standalone \r = overwrite current line from the start.
  // Keep only the last thing written to each logical line.
  s = s.split('\n').map(line => {
    const parts = line.split('\r');
    return parts[parts.length - 1];
  }).join('\n');

  return s;
}

// The entire context prompt is echoed back by the PTY because we write it to
// the terminal input. Our prompt always ends with:
//   "Question from team member: <question>"
// The AI reply starts on the line after that echo.
function extractResponse(raw) {
  let text = stripAnsi(raw);

  const MARKER = 'Question from team member:';
  const idx = text.lastIndexOf(MARKER);
  if (idx !== -1) {
    const after = text.slice(idx);
    const nl = after.indexOf('\n');
    if (nl !== -1) text = after.slice(nl + 1);
  }

  // Scrub inline timing / token annotations
  text = text.replace(/\(\s*\d+s\s*·[^)]*\)/g, '');
  text = text.replace(/↓\s*\d+\s*tokens?[^\n]*/gi, '');
  text = text.replace(/thought for \d+s[^\n]*/gi, '');
  text = text.replace(/\(\s*\d+[ms]+[^)]*\)/g, '');
  text = text.replace(/\d+m\s*\d+s\b/g, '');
  // Remove decoration chars that leak into response lines
  text = text.replace(DECORATION_RE, '');
  // Remove credit balance mentions
  text = text.replace(/Credit balance[^\n]*/gi, '');

  return text
    .split('\n')
    .filter(line => {
      const l = line.trim();
      if (!l || l.length < 2) return false;
      if (STRIP_LINE_PATTERNS.some(p => p.test(l))) return false;
      // Drop lines that are mostly non-letter content (raw terminal chrome)
      const letters = (l.match(/[a-zA-Z]/g) ?? []).length;
      const total   = l.replace(/\s/g, '').length;
      if (total > 8 && letters / total < 0.3) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function runClaude(prompt) {
  const isWindows = process.platform === 'win32';
  const claudeArgs = ['--dangerously-skip-permissions'];
  const file = isWindows ? 'cmd.exe' : 'claude';
  const args = isWindows ? ['/c', 'claude', ...claudeArgs] : claudeArgs;

  let term;
  try {
    term = pty.spawn(file, args, {
      name: 'xterm-color',
      cols: 220,
      rows: 50,
      cwd: process.cwd(),
      env: process.env,
    });
  } catch (err) {
    process.stderr.write(`Failed to spawn claude: ${err.message}\n`);
    process.exit(1);
  }

  let rawOutput = '';
  let finished = false;
  let firstDataReceived = false;
  let promptSent = false;
  let trustConfirmed = false;
  let bypassConfirmed = 0;
  let silenceTimer = null;

  function finish() {
    if (finished) return;
    finished = true;
    if (silenceTimer) clearTimeout(silenceTimer);
    try { term.kill(); } catch {}
    const output = extractResponse(rawOutput);
    process.stdout.write(output + '\n');
    process.exit(0);
  }

  function resetSilence() {
    if (!promptSent) return;
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(finish, SILENCE_IDLE);
  }

  term.onData(data => {
    rawOutput += data;
    const flat = stripAnsi(rawOutput).replace(/\s/g, '').toLowerCase();

    resetSilence();

    if (!trustConfirmed && (flat.includes('trustthisfolder') || flat.includes('quicksafetycheck'))) {
      trustConfirmed = true;
      setTimeout(() => term.write('\r'), 300);
    }

    const bypassCount = (flat.match(/bypasspermissions/g) || []).length;
    if (bypassCount > bypassConfirmed) {
      bypassConfirmed = bypassCount;
      setTimeout(() => {
        term.write('\x1B[B');
        setTimeout(() => term.write('\r'), 150);
      }, 400);
    }

    if (!firstDataReceived) {
      firstDataReceived = true;
      setTimeout(() => {
        if (finished) return;
        promptSent = true;
        term.write(prompt + '\r');
        resetSilence();
      }, PROMPT_DELAY);
    }
  });

  term.onExit(() => { if (!finished) finish(); });

  setTimeout(() => finish(), HARD_TIMEOUT);

  setTimeout(() => {
    if (!firstDataReceived && !finished) {
      finished = true;
      try { term.kill(); } catch {}
      process.stderr.write('Claude did not start — ensure it is installed and run `claude auth login`.\n');
      process.exit(1);
    }
  }, START_TIMEOUT);
}

let prompt = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { prompt += chunk; });
process.stdin.on('end', () => {
  const trimmed = prompt.trim();
  if (!trimmed) {
    process.stderr.write('No prompt provided.\n');
    process.exit(1);
  }
  runClaude(trimmed);
});
