'use strict';

// ── Team name aliases ─────────────────────────────────────────────────────────
// Maps common names, abbreviations, and alternate spellings to a standard keyword.
// This makes matching flexible — user can type "INDIA", "IND", "india" and it all works.
const TEAM_ALIASES = {
  // India
  ind: 'india',
  india: 'india',
  'team india': 'india',
  bharat: 'india',

  // Australia
  aus: 'australia',
  australia: 'australia',
  aussies: 'australia',

  // England
  eng: 'england',
  england: 'england',

  // Pakistan
  pak: 'pakistan',
  pakistan: 'pakistan',

  // South Africa
  sa: 'south africa',
  'south africa': 'south africa',
  proteas: 'south africa',
  rsa: 'south africa',

  // New Zealand
  nz: 'new zealand',
  'new zealand': 'new zealand',
  nzl: 'new zealand',
  'black caps': 'new zealand',

  // Sri Lanka
  sl: 'sri lanka',
  'sri lanka': 'sri lanka',
  slc: 'sri lanka',

  // West Indies
  wi: 'west indies',
  'west indies': 'west indies',
  windies: 'west indies',

  // Bangladesh
  ban: 'bangladesh',
  bangladesh: 'bangladesh',

  // Afghanistan
  afg: 'afghanistan',
  afghanistan: 'afghanistan',

  // Zimbabwe
  zim: 'zimbabwe',
  zimbabwe: 'zimbabwe',

  // Ireland
  ire: 'ireland',
  ireland: 'ireland',
};

// ── Keywords that mean "show me all live matches" ─────────────────────────────
const SCORE_KEYWORDS = [
  'score', 'scores', 'live', 'live score', 'live scores',
  'match', 'matches', 'cricket', 'what\'s the score',
  'whats the score', 'current score', 'today', 'today\'s match',
  'todays match', 'ongoing', 'playing', 'scorecard',
];

/**
 * parseUserMessage — Takes raw user input and returns a structured intent object.
 *
 * Returns one of:
 *   { type: 'all_live' }                          — user wants all live scores
 *   { type: 'specific_match', teams: ['india', 'australia'] }  — wants a specific match
 *   { type: 'unknown', original: 'whatever they typed' }       — couldn't understand
 */
function parseUserMessage(rawText) {
  // Normalize: lowercase, trim whitespace, remove extra spaces
  const text = rawText.toLowerCase().trim().replace(/\s+/g, ' ');

  // ── Check if user wants all live scores ──────────────────────────────────
  if (SCORE_KEYWORDS.includes(text)) {
    return { type: 'all_live' };
  }

  // ── Check for "team VS team" pattern ─────────────────────────────────────
  // Handles: "IND VS AUS", "INDIA v AUSTRALIA", "ind-aus", "IND AUS", etc.
  const vsPattern = /\bvs\.?\b|\bv\.?\b|versus|\-/i;
  const parts = text.split(vsPattern).map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const team1Resolved = resolveTeam(parts[0]);
    const team2Resolved = resolveTeam(parts[1]);

    if (team1Resolved && team2Resolved) {
      return {
        type: 'specific_match',
        teams: [team1Resolved, team2Resolved],
      };
    }

    // Partial match — at least one team recognized
    if (team1Resolved || team2Resolved) {
      return {
        type: 'specific_match',
        teams: [team1Resolved || parts[0], team2Resolved || parts[1]],
      };
    }
  }

  // ── Check if user typed a single team name ────────────────────────────────
  // e.g., "INDIA" or "AUSTRALIA" — show their current match
  const singleTeam = resolveTeam(text);
  if (singleTeam) {
    return { type: 'specific_match', teams: [singleTeam] };
  }

  // ── Check for partial keyword match (e.g., "live cricket score today") ───
  if (SCORE_KEYWORDS.some((kw) => text.includes(kw))) {
    return { type: 'all_live' };
  }

  // ── Couldn't understand ───────────────────────────────────────────────────
  return { type: 'unknown', original: rawText };
}

/**
 * resolveTeam — Maps a string to a known team name, or returns null.
 */
function resolveTeam(str) {
  if (!str) return null;
  const normalized = str.toLowerCase().trim();
  return TEAM_ALIASES[normalized] || null;
}

module.exports = { parseUserMessage, resolveTeam };
