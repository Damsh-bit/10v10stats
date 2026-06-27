import type { PlayerStats } from './mockData'

export type RatedPlayer = PlayerStats & { rating: number }

export function computePlayerRating(players: PlayerStats[]): RatedPlayer[] {
  if (players.length === 0) return []

  // Extract raw values for min/max calculation
  const rawData = players.map(p => {
    const wr = p.matches > 0 ? p.wins / p.matches : 0;
    const pr = p.matches > 0 ? p.positiveGames / p.matches : 0;
    const mr = p.matches > 0 ? p.mvps / p.matches : 0;
    
    return {
      kda: p.kda,
      adm: p.adm,
      wr,
      hsPct: p.hsPct,
      pr,
      mr
    }
  });

  const getMinMax = (key: keyof typeof rawData[0]) => {
    const values = rawData.map(d => d[key]);
    return { min: Math.min(...values), max: Math.max(...values) };
  };

  const bounds = {
    kda: getMinMax('kda'),
    adm: getMinMax('adm'),
    wr: getMinMax('wr'),
    hsPct: getMinMax('hsPct'),
    pr: getMinMax('pr'),
    mr: getMinMax('mr'),
  };

  const normalize = (val: number, { min, max }: { min: number, max: number }) => {
    if (max === min) return 0.5; // Avoid division by zero, return middle ground if all same
    return (val - min) / (max - min);
  };

  return players.map(p => {
    const wr = p.matches > 0 ? p.wins / p.matches : 0;
    const pr = p.matches > 0 ? p.positiveGames / p.matches : 0;
    const mr = p.matches > 0 ? p.mvps / p.matches : 0;

    const nKda = normalize(p.kda, bounds.kda);
    const nAdm = normalize(p.adm, bounds.adm);
    const nWr = normalize(wr, bounds.wr);
    const nHsPct = normalize(p.hsPct, bounds.hsPct);
    const nPr = normalize(pr, bounds.pr);
    const nMr = normalize(mr, bounds.mr);

    // Weights: KDA 30, ADM 25, WR 20, PR 10, HS 10, MR 5
    const rating = (
      nKda * 30 +
      nAdm * 25 +
      nWr * 20 +
      nHsPct * 10 +
      nPr * 10 +
      nMr * 5
    );

    return { ...p, rating: Number(rating.toFixed(1)) };
  });
}

export function sumRating(team: RatedPlayer[]) {
  return team.reduce((sum, p) => sum + p.rating, 0);
}

export function balanceTeams(players: RatedPlayer[]): [RatedPlayer[], RatedPlayer[]] {
  // 1. Sort by rating descending
  const sorted = [...players].sort((a, b) => b.rating - a.rating);

  // 2. Snake draft: T1 gets 0, 3, 4, 7, 8. T2 gets 1, 2, 5, 6, 9
  const t1Indices = [0, 3, 4, 7, 8];
  const team1 = t1Indices.map(i => sorted[i]).filter(Boolean);
  const team2 = sorted.filter((_, i) => !t1Indices.includes(i));

  return optimizeTeams(team1, team2);
}

export function regenerateTeams(players: RatedPlayer[]): [RatedPlayer[], RatedPlayer[]] {
  if (players.length < 2) return balanceTeams(players);

  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  
  // Perturbation: swap random adjacent players to create a different starting condition.
  // This changes the greedy local search path slightly.
  const swapIdx = Math.floor(Math.random() * (sorted.length - 1));
  const temp = sorted[swapIdx];
  sorted[swapIdx] = sorted[swapIdx + 1];
  sorted[swapIdx + 1] = temp;

  // Snake draft with perturbed sorting
  const t1Indices = [0, 3, 4, 7, 8];
  const team1 = t1Indices.map(i => sorted[i]).filter(Boolean);
  const team2 = sorted.filter((_, i) => !t1Indices.includes(i));

  return optimizeTeams(team1, team2);
}

function optimizeTeams(initialTeam1: RatedPlayer[], initialTeam2: RatedPlayer[]): [RatedPlayer[], RatedPlayer[]] {
  const team1 = [...initialTeam1];
  const team2 = [...initialTeam2];

  let improved = true;
  while (improved) {
    improved = false;
    let bestDiff = Math.abs(sumRating(team1) - sumRating(team2));
    let bestSwap: [number, number] | null = null; // [t1Index, t2Index]

    for (let i = 0; i < team1.length; i++) {
      for (let j = 0; j < team2.length; j++) {
        const sum1 = sumRating(team1) - team1[i].rating + team2[j].rating;
        const sum2 = sumRating(team2) - team2[j].rating + team1[i].rating;
        const diff = Math.abs(sum1 - sum2);

        if (diff < bestDiff - 0.01) { // 0.01 buffer for float precision
          bestDiff = diff;
          bestSwap = [i, j];
        }
      }
    }

    if (bestSwap) {
      const [i, j] = bestSwap;
      const p1 = team1[i];
      const p2 = team2[j];
      team1[i] = p2;
      team2[j] = p1;
      improved = true;
    }
  }

  return [
    team1.sort((a, b) => b.rating - a.rating), 
    team2.sort((a, b) => b.rating - a.rating)
  ];
}
