// Shared helper to produce ESPN MLB team logo URLs from various team codes
// Normalizes MLB/our internal codes to ESPN's expected codes

const CODE_MAP = {
  // Common MLB codes
  AZ: 'ari', ARI: 'ari',
  ATL: 'atl', BAL: 'bal', BOS: 'bos',
  CHC: 'chc', CWS: 'chw', CHW: 'chw',
  CIN: 'cin', CLE: 'cle', COL: 'col', DET: 'det',
  HOU: 'hou',
  KC: 'kc', KCR: 'kc',
  LAA: 'laa', LAD: 'lad',
  MIA: 'mia', MIL: 'mil', MIN: 'min',
  NYM: 'nym', NYY: 'nyy',
  OAK: 'oak', ATH: 'oak',
  PHI: 'phi', PIT: 'pit',
  SD: 'sd', SDP: 'sd',
  SEA: 'sea',
  SF: 'sf', SFG: 'sf',
  STL: 'stl',
  TB: 'tb', TBR: 'tb', TBD: 'tb',
  TEX: 'tex', TOR: 'tor',
  WSH: 'wsh', WSN: 'wsh'
};

export function getEspnTeamLogoUrl(teamCode, size = 500) {
  if (!teamCode) return null;
  const code = String(teamCode).toUpperCase();
  const espnCode = CODE_MAP[code] || code.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/mlb/${size}/${espnCode}.png`;
}

export function getTeamLogoUrl(teamCode, size = 500) {
  return getEspnTeamLogoUrl(teamCode, size);
}
