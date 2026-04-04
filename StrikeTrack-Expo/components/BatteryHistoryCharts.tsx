import { useCallback, useMemo, useState } from 'react';
import { View, Text, useWindowDimensions, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { chargeHistoryFromReadings, ohmsHistoryFromReadings } from '@/lib/batteryChartData';
import { COLORS, FONT, SPACE } from '@/lib/constants';
import type { BatteryReading } from '@/lib/database';
import { MiniLineChart } from './MiniLineChart';

const CHART_HEIGHT = 168;

type Props = {
  readings: BatteryReading[];
  /** From all batteries’ readings — shared chart ceiling for comparability. */
  globalChargePercentMax: number | null;
  globalOhmsMax: number | null;
};

export function BatteryHistoryCharts({
  readings,
  globalChargePercentMax,
  globalOhmsMax,
}: Props) {
  const { width: winW } = useWindowDimensions();
  /** Inner width inside card padding; avoids SVG wider than the pill (window-based math missed card padding). */
  const [chartSlotW, setChartSlotW] = useState(() =>
    Math.max(200, Math.floor(winW - SPACE.screen * 2 - 32))
  );

  const onChartSlotLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0) setChartSlotW((prev) => (prev === w ? prev : w));
  }, []);

  const chargeSeries = useMemo(() => chargeHistoryFromReadings(readings), [readings]);
  const ohmsSeries = useMemo(() => ohmsHistoryFromReadings(readings), [readings]);

  return (
    <View style={styles.card}>
      <View style={styles.chartSlot} onLayout={onChartSlotLayout}>
        <Text style={styles.sectionTitle}>Charge %</Text>
        {chargeSeries.length === 0 ? (
          <Text style={styles.muted}>—</Text>
        ) : (
          <MiniLineChart
            series={chargeSeries}
            width={chartSlotW}
            height={CHART_HEIGHT}
            stroke="#60a5fa"
            formatTick={(v) => `${Math.round(v)}%`}
            compareYDomain={
              globalChargePercentMax != null ? { min: 0, max: globalChargePercentMax } : undefined
            }
            softYDomain={
              globalChargePercentMax == null ? { min: 0, max: 100 } : undefined
            }
          />
        )}

        <Text style={[styles.sectionTitle, styles.sectionSpacer]}>Ohms</Text>
        {ohmsSeries.length === 0 ? (
          <Text style={styles.muted}>—</Text>
        ) : (
          <MiniLineChart
            series={ohmsSeries}
            width={chartSlotW}
            height={CHART_HEIGHT}
            stroke="#34d399"
            formatTick={(v) => (Math.abs(v) < 0.0001 ? '0' : v.toFixed(3))}
            compareYDomain={
              globalOhmsMax != null ? { min: 0, max: globalOhmsMax } : undefined
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    overflow: 'hidden',
  },
  chartSlot: {
    width: '100%',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: FONT.meta,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  sectionSpacer: {
    marginTop: 18,
  },
  muted: {
    color: '#52525b',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 24,
    textAlign: 'center',
  },
});
