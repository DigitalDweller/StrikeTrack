import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import type { PerformanceSummary, StatRank } from '@/lib/batteryPerformanceStats';
import {
  formatChargeLossHeadline,
  formatCoolingHeadline,
  formatOhmsHeadline,
} from '@/lib/batteryPerformanceStats';
import { SPACE } from '@/lib/constants';

const Z = {
  900: '#18181b',
  800: '#27272a',
  500: '#71717a',
  400: '#a1a1aa',
  100: '#f4f4f5',
};

const EMERALD = { label: '#34d399' };
const RED = { label: '#f87171' };

function matchPhrase(n: number): string {
  return `${n} match${n === 1 ? '' : 'es'}`;
}

type RankEntryProps = {
  rank: StatRank;
  headline: string;
  variant: 'good' | 'bad';
  tierIndex: number;
  isLast: boolean;
};

function RankEntry({ rank, headline, variant, tierIndex, isLast }: RankEntryProps) {
  const color = variant === 'good' ? EMERALD.label : RED.label;

  return (
    <View style={[styles.rankSection, !isLast && styles.rankSectionSpaced]}>
      <View style={styles.rankTitleRow}>
        <Text style={[styles.tierBadge, { color }]}>#{tierIndex + 1}</Text>
        <Text style={styles.rankName} numberOfLines={1}>
          {rank.batteryName}
        </Text>
      </View>
      <Text style={styles.rankValue}>{headline}</Text>
      <Text style={styles.rankMeta}>{matchPhrase(rank.matchCount)}</Text>
    </View>
  );
}

type MetricCardProps = {
  title: string;
  bestThree: StatRank[];
  worstThree: StatRank[];
  formatHeadline?: (avg: number) => string;
  formatRank?: (rank: StatRank) => string;
};

function headlineForRank(
  rank: StatRank,
  formatHeadline?: (avg: number) => string,
  formatRank?: (rank: StatRank) => string
): string {
  if (formatRank) return formatRank(rank);
  if (formatHeadline) return formatHeadline(rank.avgValue);
  return String(rank.avgValue);
}

function MetricTopBottomCard({
  title,
  bestThree,
  worstThree,
  formatHeadline,
  formatRank,
}: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {bestThree.length > 0 ? (
        <>
          {bestThree.map((rank, i) => (
            <RankEntry
              key={rank.batteryId}
              rank={rank}
              headline={headlineForRank(rank, formatHeadline, formatRank)}
              variant="good"
              tierIndex={i}
              isLast={i === bestThree.length - 1}
            />
          ))}
        </>
      ) : null}
      {worstThree.length > 0 ? (
        <>
          <View style={styles.divider} />
          {worstThree.map((rank, i) => (
            <RankEntry
              key={rank.batteryId}
              rank={rank}
              headline={headlineForRank(rank, formatHeadline, formatRank)}
              variant="bad"
              tierIndex={i}
              isLast={i === worstThree.length - 1}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

export type StatsTabPanelProps = {
  perf: PerformanceSummary | null;
  refreshing: boolean;
  onRefresh: () => void;
  paddingTop: number;
  paddingBottom: number;
};

export function StatsTabPanel({
  perf,
  refreshing,
  onRefresh,
  paddingTop,
  paddingBottom,
}: StatsTabPanelProps) {
  const hasCharge =
    perf?.chargeLoss.hasData === true &&
    (perf.chargeLoss.bestThree.length > 0 || perf.chargeLoss.worstThree.length > 0);
  const hasOhms =
    perf?.ohmsDelta.hasData === true &&
    (perf.ohmsDelta.bestThree.length > 0 || perf.ohmsDelta.worstThree.length > 0);
  const hasCooling =
    perf?.cooling.hasData === true &&
    (perf.cooling.bestThree.length > 0 || perf.cooling.worstThree.length > 0);

  const hasAnyMetric = hasCharge || hasOhms || hasCooling;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.list,
        { paddingTop, paddingBottom },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {!perf || !hasAnyMetric ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stats</Text>
          {!hasAnyMetric && perf ? (
            <Text style={styles.emptyHint}>Record match flows to see fleet insights.</Text>
          ) : null}
        </View>
      ) : (
        <>
          {hasCharge && perf ? (
            <MetricTopBottomCard
              title="Charge loss (avg)"
              bestThree={perf.chargeLoss.bestThree}
              worstThree={perf.chargeLoss.worstThree}
              formatHeadline={formatChargeLossHeadline}
            />
          ) : null}

          {hasOhms && perf ? (
            <View style={hasCharge ? styles.cardSpacer : null}>
              <MetricTopBottomCard
                title="Ohms (avg)"
                bestThree={perf.ohmsDelta.bestThree}
                worstThree={perf.ohmsDelta.worstThree}
                formatHeadline={formatOhmsHeadline}
              />
            </View>
          ) : null}

          {hasCooling && perf ? (
            <View
              style={
                hasCharge || hasOhms ? styles.cardSpacer : null
              }
            >
              <MetricTopBottomCard
                title="Cooling → charger (avg)"
                bestThree={perf.cooling.bestThree}
                worstThree={perf.cooling.worstThree}
                formatRank={formatCoolingHeadline}
              />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: SPACE.screen,
  },
  card: {
    backgroundColor: Z[900],
    borderWidth: 1,
    borderColor: Z[800],
    borderRadius: 16,
    padding: 20,
  },
  cardSpacer: {
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Z[400],
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  rankSection: {
    gap: 3,
  },
  rankSectionSpaced: {
    marginBottom: 8,
  },
  rankTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 3,
  },
  tierBadge: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginRight: 5,
  },
  rankName: {
    flex: 1,
    minWidth: 80,
    fontSize: 18,
    fontWeight: '600',
    color: Z[100],
  },
  rankValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Z[100],
    marginTop: 0,
  },
  rankMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: Z[500],
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: Z[800],
    marginVertical: 8,
  },
  emptyHint: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    color: Z[500],
  },
});
