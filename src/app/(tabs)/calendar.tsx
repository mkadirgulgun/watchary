import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { CalItem, FUTURE_DAYS, loadCalendar, PAST_DAYS, ShowStatus } from "@/lib/calendar";
import {
  addDays,
  dayLong,
  dayShort,
  daysBetween,
  formatShortDate,
  monthLong,
  parseISO,
  todayISO,
} from "@/lib/format";
import { openMedia } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";
import { useAsync } from "@/lib/use-async";

type Tab = "schedule" | "alerts";

const DAY_WIDTH = 56;
const DAY_GAP = 6;

export default function CalendarScreen() {
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const reminders = useStore((s) => s.reminders);
  const toggleReminder = useStore((s) => s.toggleReminder);
  const toggleEpisode = useStore((s) => s.toggleEpisode);

  const today = todayISO();
  const [tab, setTab] = useState<Tab>("schedule");
  const [selected, setSelected] = useState(today);

  const tracked = useMemo(
    () =>
      Object.values(entries)
        .filter(
          (e) =>
            e.ref.type === "tv" &&
            (e.watchlist || Object.keys(episodes[e.ref.key] ?? {}).length > 0),
        )
        .map((e) => e.ref),
    [entries, episodes],
  );
  const trackedSig = tracked.map((t) => t.key).join("|");

  const { data, loading, error, reload } = useAsync(
    () => loadCalendar(tracked),
    [trackedSig],
  );
  const items = data?.items ?? [];
  // Sadece yeni bölümü olan diziler gösterilir.
  const shows = (data?.shows ?? []).filter((s) => s.next);

  const days = useMemo(
    () =>
      Array.from({ length: PAST_DAYS + FUTURE_DAYS + 1 }, (_, i) => addDays(today, i - PAST_DAYS)),
    [today],
  );
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of data?.items ?? []) map[i.date] = (map[i.date] ?? 0) + 1;
    return map;
  }, [data]);
  const stripRef = useRef<FlatList<string>>(null);
  const jumpToToday = () => {
    setSelected(today);
    stripRef.current?.scrollToIndex({ index: PAST_DAYS, animated: true, viewPosition: 0.15 });
  };

  const onDay = items.filter((i) => i.date === selected);
  const later = items.filter((i) => i.date > selected).slice(0, 12);
  const alerts = items.filter((i) => reminders[i.id]);
  const selectedDate = parseISO(selected);

  const dayTitle =
    selected === today
      ? `Bugün — ${dayLong(selected)}, ${selectedDate.getDate()} ${monthLong(selected)}`
      : `${dayLong(selected)}, ${selectedDate.getDate()} ${monthLong(selected)}`;

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.inline}>
            <Ionicons name="calendar" size={22} color={colors.primary} />
            <AppText variant="display">Bölüm Radarı</AppText>
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === "schedule" && styles.tabOn]} onPress={() => setTab("schedule")}>
            <AppText variant="label" color={tab === "schedule" ? colors.onPrimary : colors.textSecondary}>
              Yaklaşan Program
            </AppText>
          </Pressable>
          <Pressable style={[styles.tab, tab === "alerts" && styles.tabOn]} onPress={() => setTab("alerts")}>
            <AppText variant="label" color={tab === "alerts" ? colors.onPrimary : colors.textSecondary}>
              Hatırlatıcılar ({alerts.length})
            </AppText>
          </Pressable>
        </View>

        {loading && !data && <Loading />}
        {error && <ErrorState message={error} onRetry={reload} />}

        {tab === "schedule" && (
          <>
            <View style={styles.monthRow}>
              <AppText variant="headline">
                {monthLong(selected)} {selectedDate.getFullYear()}
              </AppText>
              {selected !== today && (
                <Pressable style={styles.todayBtn} onPress={jumpToToday}>
                  <Ionicons name="return-down-back" size={14} color={colors.primary} />
                  <AppText variant="caption" color={colors.primary}>
                    Bugüne dön
                  </AppText>
                </Pressable>
              )}
            </View>
            <FlatList
              ref={stripRef}
              data={days}
              keyExtractor={(d) => d}
              extraData={`${selected}|${data ? "ok" : ""}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={PAST_DAYS}
              getItemLayout={(_, index) => ({
                length: DAY_WIDTH + DAY_GAP,
                offset: (DAY_WIDTH + DAY_GAP) * index,
                index,
              })}
              style={styles.stripList}
              renderItem={({ item: d }) => {
                const on = d === selected;
                const count = countByDate[d] ?? 0;
                const firstOfMonth = parseISO(d).getDate() === 1;
                return (
                  <Pressable style={[styles.day, on && styles.dayOn]} onPress={() => setSelected(d)}>
                    <AppText variant="overline" color={on ? colors.onPrimary : colors.textTertiary}>
                      {d === today ? "Bugün" : firstOfMonth ? monthLong(d).slice(0, 3) : dayShort(d)}
                    </AppText>
                    <AppText variant="headline" color={on ? colors.onPrimary : colors.text}>
                      {parseISO(d).getDate()}
                    </AppText>
                    <View style={styles.dots}>
                      {count > 0 && (
                        <View style={[styles.dot, { backgroundColor: on ? colors.onPrimary : colors.primary }]} />
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />

            {tracked.length === 0 && (
              <View style={styles.hint}>
                <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                <AppText variant="bodySmall" style={{ flex: 1 }}>
                  Dizileri “Takip Et” dediğinde yeni bölüm tarihleri burada belirir. Şimdilik
                  yaklaşan filmleri görüyorsun.
                </AppText>
              </View>
            )}

            {shows.length > 0 && (
              <View style={styles.showsBox}>
                <View style={styles.inline}>
                  <Ionicons name="tv-outline" size={18} color={colors.primary} />
                  <AppText variant="headline" style={{ flex: 1 }}>
                    Dizilerim: Yeni Bölümler
                  </AppText>
                </View>
                {shows.map((s) => (
                  <ShowRow
                    key={s.ref.key}
                    show={s}
                    today={today}
                    reminder={!!(s.next && reminders[s.next.id])}
                    onReminder={() => s.next && toggleReminder(s.next.id)}
                  />
                ))}
              </View>
            )}

            <View style={styles.sectionHead}>
              <AppText variant="headline" style={{ flex: 1 }}>
                {dayTitle}
              </AppText>
              <AppText variant="caption" color={colors.primary}>
                {onDay.length} yayın
              </AppText>
            </View>

            {data && onDay.length === 0 && (
              <EmptyState icon="calendar-clear-outline" title="Bu gün için yayın yok" />
            )}
            {onDay.map((i) => (
              <BigCard
                key={i.id}
                item={i}
                today={today}
                reminder={!!reminders[i.id]}
                onReminder={() => toggleReminder(i.id)}
                onMark={
                  i.episode && i.date <= today
                    ? () =>
                        toggleEpisode(i.ref, i.episode!.season, i.episode!.number, i.runtime)
                    : undefined
                }
              />
            ))}

            {later.length > 0 && (
              <>
                <View style={styles.sectionHead}>
                  <AppText variant="headline" style={{ flex: 1 }}>
                    Sonraki Yayınlar
                  </AppText>
                </View>
                {later.map((i) => (
                  <SmallRow
                    key={i.id}
                    item={i}
                    reminder={!!reminders[i.id]}
                    onReminder={() => toggleReminder(i.id)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {tab === "alerts" && (
          <>
            <View style={styles.hint}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <AppText variant="bodySmall" style={{ flex: 1 }}>
                Hatırlatıcılar şimdilik uygulama içinde listelenir. Telefon bildirimi için sonraki
                aşamada bildirim servisi bağlanacak.
              </AppText>
            </View>
            {alerts.length === 0 && (
              <EmptyState
                icon="notifications-off-outline"
                title="Hatırlatıcı yok"
                message="Bir yayının yanındaki zil simgesine dokunarak ekleyebilirsin."
              />
            )}
            {alerts.map((i) => (
              <SmallRow key={i.id} item={i} reminder onReminder={() => toggleReminder(i.id)} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ShowRow({
  show,
  today,
  reminder,
  onReminder,
}: {
  show: ShowStatus;
  today: string;
  reminder: boolean;
  onReminder: () => void;
}) {
  const { ref, next } = show;
  // Bu bileşene sadece yeni bölümü olan diziler gelir.
  if (!next) return null;
  const days = daysBetween(today, next.date);
  const line = `${next.subtitle.split(" • ")[0]} • ${formatShortDate(next.date)}`;

  return (
    <Pressable style={styles.small} onPress={() => openMedia("tv", ref.id)}>
      <View style={styles.smallPoster}>
        {ref.posterUrl && (
          <Image
            source={{ uri: sized(ref.posterUrl, "w154") ?? ref.posterUrl }}
            style={styles.fill}
            contentFit="cover"
          />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="title" numberOfLines={1}>
          {ref.title}
        </AppText>
        <AppText variant="caption" color={colors.primaryLight}>
          {line}
        </AppText>
      </View>
      <View style={styles.showSide}>
        <View style={styles.daysPill}>
          <AppText variant="caption" color={colors.primaryLight}>
            {days === 0 ? "Bugün" : days > 0 ? `${days} gün` : `${-days} gün önce`}
          </AppText>
        </View>
        <Pressable onPress={onReminder} hitSlop={10}>
          <Ionicons
            name={reminder ? "notifications" : "notifications-outline"}
            size={20}
            color={reminder ? colors.primary : colors.textSecondary}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

function BigCard({
  item,
  today,
  reminder,
  onReminder,
  onMark,
}: {
  item: CalItem;
  today: string;
  reminder: boolean;
  onReminder: () => void;
  onMark?: () => void;
}) {
  const days = daysBetween(today, item.date);
  return (
    <View style={styles.big}>
      <Pressable style={styles.bigImage} onPress={() => openMedia(item.ref.type, item.ref.id)}>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        )}
        <LinearGradient
          colors={["transparent", "rgba(18,19,26,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bigBadges}>
          <View style={styles.live}>
            <AppText variant="overline" color={colors.text}>
              {days === 0 ? "Bugün" : days > 0 ? `${days} gün sonra` : `${-days} gün önce`}
            </AppText>
          </View>
          {!!item.network && (
            <View style={styles.live}>
              <AppText variant="overline" color={colors.text}>
                {item.network}
              </AppText>
            </View>
          )}
        </View>
      </Pressable>
      <View style={styles.bigBody}>
        <AppText variant="headline">{item.title}</AppText>
        <AppText variant="label" color={colors.primaryLight}>
          {item.subtitle}
        </AppText>
        {!!item.overview && (
          <AppText variant="bodySmall" numberOfLines={3}>
            {item.overview}
          </AppText>
        )}
        <View style={styles.bigActions}>
          {onMark ? (
            <Button style={{ flex: 1 }} icon="checkmark-circle-outline" label="İzlendi İşaretle" onPress={onMark} />
          ) : (
            <Button
              style={{ flex: 1 }}
              icon={reminder ? "notifications" : "notifications-outline"}
              label={reminder ? "Hatırlatıcı Açık" : "Hatırlatıcı Kur"}
              onPress={onReminder}
            />
          )}
          <Button
            variant="secondary"
            icon="open-outline"
            onPress={() => openMedia(item.ref.type, item.ref.id)}
          />
        </View>
      </View>
    </View>
  );
}

function SmallRow({
  item,
  reminder,
  onReminder,
}: {
  item: CalItem;
  reminder: boolean;
  onReminder: () => void;
}) {
  return (
    <Pressable style={styles.small} onPress={() => openMedia(item.ref.type, item.ref.id)}>
      <View style={styles.smallPoster}>
        {item.ref.posterUrl && (
          <Image source={{ uri: sized(item.ref.posterUrl, "w154") ?? item.ref.posterUrl }} style={styles.fill} contentFit="cover" />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="caption" color={colors.primaryLight}>
          {dayLong(item.date)} • {formatShortDate(item.date)}
          {item.network ? ` • ${item.network}` : ""}
        </AppText>
        <AppText variant="title" numberOfLines={1}>
          {item.title}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {item.subtitle}
        </AppText>
      </View>
      <Pressable onPress={onReminder} hitSlop={10}>
        <Ionicons
          name={reminder ? "notifications" : "notifications-outline"}
          size={20}
          color={reminder ? colors.primary : colors.textSecondary}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: spacing.sm + 2, alignItems: "center", borderRadius: radius.md },
  tabOn: { backgroundColor: colors.primary },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  stripList: { flexGrow: 0, marginHorizontal: -spacing.lg, paddingLeft: spacing.lg },
  day: {
    width: DAY_WIDTH,
    marginRight: DAY_GAP,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dots: { height: 6, justifyContent: "center" },
  dot: { width: 5, height: 5, borderRadius: radius.full },
  hint: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionHead: { flexDirection: "row", alignItems: "center" },
  showsBox: { gap: spacing.md },
  showSide: { alignItems: "flex-end", gap: spacing.sm },
  daysPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  big: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  bigImage: { height: 170, backgroundColor: colors.surfaceHigh, justifyContent: "flex-start" },
  bigBadges: { flexDirection: "row", justifyContent: "space-between", padding: spacing.md },
  live: {
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  bigBody: { padding: spacing.lg, gap: spacing.sm },
  bigActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  small: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  smallPoster: {
    width: 44,
    height: 66,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
  fill: { width: "100%", height: "100%" },
});
