'use strict';

const axios = require('axios');

const CRICKET_API_BASE = 'https://api.cricapi.com/v1';
const API_KEY = process.env.CRICKET_API_KEY;

// Cache to avoid hammering the API — store results for 30 seconds
const cache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * fetchAllLiveMatches — Fetches all currently live matches from the API.
 * Uses a short cache to avoid rate-limiting on rapid requests.
 */
async function fetchAllLiveMatches() {
  const now = Date.now();

  // Return cached data if still fresh
  if (cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    console.log('📦 Using cached match data');
    return cache.data;
  }

  const response = await axios.get(`${CRICKET_API_BASE}/currentMatches`, {
    params: { apikey: API_KEY, offset: 0 },
    timeout: 10000, // 10 second timeout
  });

  if (!response.data || response.data.status !== 'success') {
    throw new Error(`Cricket API error: ${response.data?.status || 'Unknown error'}`);
  }

  // Save to cache
  cache.data = response.data.data || [];
  cache.timestamp = now;

  return cache.data;
}

/**
 * getLiveScore — Main function called by the webhook.
 * Accepts an intent object from messageParser and returns a formatted string.
 */
async function getLiveScore(intent) {
  try {
    const matches = await fetchAllLiveMatches();

    // ── Handle "show me everything live" ─────────────────────────────────
    if (intent.type === 'all_live') {
      return formatAllMatches(matches);
    }

    // ── Handle specific match / team search ───────────────────────────────
    if (intent.type === 'specific_match') {
      const found = findMatchByTeams(matches, intent.teams);
      if (found) {
        return formatSingleMatch(found);
      }

      // No live match found — tell user
      const teamStr = intent.teams.join(' vs ').toUpperCase();
      return (
        `🔍 No live match found for *${teamStr}*.\n\n` +
        `The match may not have started yet, or may have ended.\n\n` +
        `Send *SCORE* to see all currently live matches.`
      );
    }

    // ── Handle unknown intent ────────────────────────────────────────────
    return (
      `🤷 I didn't understand that.\n\n` +
      `Here's what you can send me:\n` +
      `• *SCORE* — All live matches right now\n` +
      `• *IND VS AUS* — India vs Australia score\n` +
      `• *ENG VS PAK* — England vs Pakistan score\n` +
      `• Any two team names separated by VS\n\n` +
      `Supported teams: IND, AUS, ENG, PAK, SA, NZ, SL, WI, BAN, AFG, ZIM, IRE`
    );
  } catch (error) {
    console.error('❌ Cricket API failed:', error.message);

    // Give a friendly, helpful error message
    if (error.code === 'ECONNABORTED') {
      return '⏱️ The cricket API is taking too long to respond. Please try again in a moment.';
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return '🔑 Cricket API key issue. Please contact the bot administrator.';
    }
    if (error.response?.status === 429) {
      return '⚡ Too many requests! Please wait 1 minute and try again.';
    }
    return '😔 Could not fetch live scores right now. Please try again in a moment.';
  }
}

/**
 * findMatchByTeams — Searches the matches list for a match involving the given teams.
 */
function findMatchByTeams(matches, teams) {
  return matches.find((match) => {
    const matchName = (match.name || '').toLowerCase();
    const team1 = (match.teamInfo?.[0]?.name || '').toLowerCase();
    const team2 = (match.teamInfo?.[1]?.name || '').toLowerCase();
    const combined = `${matchName} ${team1} ${team2}`;

    // Check if all specified teams appear in this match
    return teams.every((team) => combined.includes(team.toLowerCase()));
  });
}

/**
 * formatAllMatches — Turns a list of matches into a readable WhatsApp message.
 */
function formatAllMatches(matches) {
  if (!matches || matches.length === 0) {
    return (
      '🏏 *No live matches right now!*\n\n' +
      'Check back later when a match is in progress.\n\n' +
      '_Tip: ICC fixtures are at https://www.icc-cricket.com_'
    );
  }

  const lines = ['🏏 *LIVE CRICKET SCORES*\n'];

  matches.forEach((match, index) => {
    lines.push(formatSingleMatchBlock(match, index + 1));
  });

  lines.push('\n_Scores update every 30 seconds. Send the match name for details._');

  return lines.join('\n');
}

/**
 * formatSingleMatch — Formats one specific match in detail.
 */
function formatSingleMatch(match) {
  const block = formatSingleMatchBlock(match);
  return `🏏 *LIVE SCORE*\n\n${block}\n\n_Send SCORE for all live matches_`;
}

/**
 * formatSingleMatchBlock — Formats one match into a clean readable block.
 */
function formatSingleMatchBlock(match, number) {
  const prefix = number ? `*Match ${number}*\n` : '';
  const name = match.name || 'Unknown Match';
  const status = match.status || 'Status unknown';
  const matchType = (match.matchType || '').toUpperCase();
  const venue = match.venue ? `📍 ${match.venue}` : '';

  // Extract scores from the score array
  let scoreLines = [];
  if (match.score && match.score.length > 0) {
    match.score.forEach((innings) => {
      const inningName = innings.inning || '';
      const runs = innings.r ?? '—';
      const wickets = innings.w ?? '—';
      const overs = innings.o ?? '—';
      scoreLines.push(`  ${inningName}: ${runs}/${wickets} (${overs} ov)`);
    });
  }

  const scoreText =
    scoreLines.length > 0 ? scoreLines.join('\n') : '  Innings not started yet';

  const parts = [
    `${prefix}🏟️ *${name}*`,
    matchType ? `📋 Format: ${matchType}` : null,
    venue || null,
    `\n📊 *Score:*\n${scoreText}`,
    `\n🔴 *Status:* ${status}`,
    '━━━━━━━━━━━━━━━━━━━━',
  ];

  return parts.filter(Boolean).join('\n');
}

module.exports = { getLiveScore };
