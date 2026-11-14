import { enumerateWeeks, inRange, todayIst } from "./dates";
import { splitMainPool, splitShortPool, splitWeeklyReserve } from "./prizes";
import type {
  Activity,
  Athlete,
  Challenge,
  ChallengeId,
  ChallengeStatus,
  Payment,
  RankedRow,
  Snapshot,
  WeeklyBoard,
} from "./types";

export function challengeStatus(
  challenge: Challenge,
  today = todayIst(),
): ChallengeStatus {
  if (challenge.finalized) return "final";
  if (today < challenge.startsOn) return "upcoming";
  if (today > challenge.endsOn) return "ended-provisional";
  return "live";
}

export function statusLabel(status: ChallengeStatus): string {
  if (status === "upcoming") return "Upcoming";
  if (status === "live") return "Live · provisional";
  if (status === "ended-provisional") return "Ended · provisional";
  return "Final";
}

function paymentFor(
  payments: Payment[],
  athleteId: string,
  challengeId: ChallengeId,
) {
  return payments.find(
    (p) => p.athleteId === athleteId && p.challengeId === challengeId,
  );
}

export function rankAthletes(args: {
  athletes: Athlete[];
  activities: Activity[];
  payments: Payment[];
  challenge: Challenge;
  eligibleAthleteIds?: string[] | null;
}): RankedRow[] {
  const { athletes, activities, payments, challenge, eligibleAthleteIds } =
    args;
  const eligible = athletes.filter((athlete) => {
    if (eligibleAthleteIds) return eligibleAthleteIds.includes(athlete.id);
    return true;
  });

  const rows = eligible.map((athlete) => {
    const relevant = activities.filter(
      (activity) =>
        activity.athleteId === athlete.id &&
        activity.status === "approved" &&
        inRange(activity.activityDate, challenge.startsOn, challenge.endsOn),
    );
    const pay = paymentFor(payments, athlete.id, challenge.id);
    return {
      athlete,
      totalSeconds: relevant.reduce(
        (sum, activity) => sum + activity.durationSeconds,
        0,
      ),
      activityCount: relevant.length,
      rank: 0,
      displayOrder: 0,
      paid: pay?.status === "paid",
      entered: Boolean(pay),
      tiedWithPrevious: false,
    };
  });

  rows.sort((a, b) => {
    if (b.totalSeconds !== a.totalSeconds)
      return b.totalSeconds - a.totalSeconds;
    return a.athlete.name.localeCompare(b.athlete.name);
  });

  rows.forEach((row, index) => {
    row.displayOrder = index + 1;
    if (index === 0) {
      row.rank = 1;
      return;
    }
    const prev = rows[index - 1];
    if (row.totalSeconds === prev.totalSeconds) {
      row.rank = prev.rank;
      row.tiedWithPrevious = true;
    } else {
      row.rank = index + 1;
    }
  });

  return rows;
}

export function findDuplicateActivity(
  activities: Activity[],
  candidate: Pick<
    Activity,
    "athleteId" | "activityDate" | "activityType" | "durationSeconds"
  > & {
    id?: string;
  },
): Activity | undefined {
  return activities.find(
    (activity) =>
      activity.id !== candidate.id &&
      activity.athleteId === candidate.athleteId &&
      activity.activityDate === candidate.activityDate &&
      activity.activityType === candidate.activityType &&
      activity.durationSeconds === candidate.durationSeconds,
  );
}

export function weeklyBoards(
  snapshot: Snapshot,
  challenge: Challenge,
): WeeklyBoard[] {
  const weeks = enumerateWeeks(challenge.startsOn, challenge.endsOn);
  const paidIds = snapshot.payments
    .filter((p) => p.challengeId === challenge.id && p.status === "paid")
    .map((p) => p.athleteId);
  const paidCount = paidIds.length;
  const mainSplit = splitMainPool(paidCount, challenge.entryAmountInr);
  const reserve = mainSplit.amounts["Weekly reserve (20%)"] ?? 0;
  const weekKeys = weeks.map((week) => week.label);
  const weeklySplit = splitWeeklyReserve(reserve, weekKeys);

  const previousWinners: string[] = [];
  return weeks.map((week) => {
    const saved = snapshot.weeklyPrizes.find(
      (prize) =>
        prize.challengeId === challenge.id && prize.weekIndex === week.index,
    );
    const windowChallenge: Challenge = {
      ...challenge,
      startsOn: week.startDate,
      endsOn: week.endDate,
    };
    const eligible = snapshot.settings.allowMultipleWeeklyWins
      ? paidIds
      : paidIds.filter((id) => !previousWinners.includes(id));
    const rows = rankAthletes({
      athletes: snapshot.athletes,
      activities: snapshot.activities,
      payments: snapshot.payments,
      challenge: windowChallenge,
      eligibleAthleteIds: eligible,
    }).filter((row) => row.totalSeconds > 0);
    const top = rows[0];
    const timeLeaders =
      top && top.totalSeconds > 0 ? rows.filter((row) => row.rank === 1) : [];
    const roundingNote =
      weeklySplit.notes.find((note) => note.includes(week.label)) ?? "";
    const officialWinnerId =
      saved?.winnerAthleteId ??
      (timeLeaders.length === 1 ? timeLeaders[0].athlete.id : null);
    if (officialWinnerId && (saved?.recorded || timeLeaders.length === 1))
      previousWinners.push(officialWinnerId);

    return {
      week,
      prizeAmountInr: weeklySplit.amounts[week.label] ?? 0,
      roundingNote,
      rows,
      timeLeaders,
      officialWinnerId,
      recorded: saved?.recorded ?? false,
      adminDecisionNote: saved?.adminDecisionNote ?? "",
      tieRule: saved?.tieRule || snapshot.settings.weeklyTieRule,
    };
  });
}

export function weeklyWinsByAthlete(
  boards: WeeklyBoard[],
): Record<string, number> {
  const wins: Record<string, number> = {};
  for (const board of boards) {
    if (!board.officialWinnerId || board.timeLeaders.length === 0) continue;
    if (board.timeLeaders.length > 1 && !board.recorded) continue;
    wins[board.officialWinnerId] = (wins[board.officialWinnerId] ?? 0) + 1;
  }
  return wins;
}

export function poolSummary(challenge: Challenge, payments: Payment[]) {
  const paidCount = payments.filter(
    (p) => p.challengeId === challenge.id && p.status === "paid",
  ).length;
  const pendingCount = payments.filter(
    (p) => p.challengeId === challenge.id && p.status === "pending",
  ).length;
  const total = paidCount * challenge.entryAmountInr;
  if (challenge.id === "short") {
    return {
      paidCount,
      pendingCount,
      total,
      split: splitShortPool(paidCount, challenge.entryAmountInr),
    };
  }
  return {
    paidCount,
    pendingCount,
    total,
    split: splitMainPool(paidCount, challenge.entryAmountInr),
  };
}

export function athleteActivities(
  activities: Activity[],
  athleteId: string,
): Activity[] {
  return [...activities]
    .filter((activity) => activity.athleteId === athleteId)
    .sort((a, b) => {
      if (a.activityDate !== b.activityDate)
        return b.activityDate.localeCompare(a.activityDate);
      return b.createdAt.localeCompare(a.createdAt);
    });
}
