import { Image } from "expo-image";
import { Fragment } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { GradientSlider } from "@/components/color/gradient-slider";
import { AVAILABLE_VISITORS, useGoose } from "@/components/goose/goose-visits";
import {
  DEFAULT_VISITOR_SETTINGS,
  MAX_PAIR_SHARE,
  VISITOR_GROUPS,
  VISITORS,
  visitorShares,
  type Visitor,
  type VisitorChoice,
  type VisitorId,
  type VisitorSettings,
} from "@/components/goose/visitors";
import { PEEK_IMAGES, WALK_IMAGES } from "@/components/mascot/images.generated";
import { Screen } from "@/components/screen";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const percent = (share: number) => (share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`);
const previewOf = (visitor: Visitor) =>
  visitor.kind === "popup" ? PEEK_IMAGES[visitor.look]?.[visitor.pose] : WALK_IMAGES[visitor.species]?.["step-1"];

/** Every single visitor — each look doing each act, and the waddlers — with its own switch and chance. */
export default function VisitorsScreen() {
  const { colors } = useTheme();
  const goose = useGoose();
  const settings = goose.visitors;
  const shares = visitorShares(settings, AVAILABLE_VISITORS);
  const stops = [colors.border, colors.primary];
  const switchColors = { trackColor: { true: colors.primary, false: colors.border }, thumbColor: colors.surface };
  const available = VISITORS.filter((v) => AVAILABLE_VISITORS.has(v.id));
  // A pair is a goose and a duckling, so both need a pop-up that may come.
  const popUpSpecies = new Set(available.filter((v) => v.kind === "popup" && shares[v.id] > 0).map((v) => v.species));
  const pairsPossible = popUpSpecies.size > 1;

  const set = (next: VisitorSettings) => goose.setVisitors(next);
  const change = (ids: VisitorId[], update: (choice: VisitorChoice) => VisitorChoice) =>
    set({
      ...settings,
      visitors: { ...settings.visitors, ...Object.fromEntries(ids.map((id) => [id, update(settings.visitors[id])])) },
    });
  // Switching on a visitor whose slider sits at zero gives it a middling chance, so it really comes.
  const turn = (ids: VisitorId[], on: boolean) =>
    change(ids, (choice) => ({ on, weight: on && choice.weight === 0 ? 20 : choice.weight }));

  return (
    <Screen>
      <AppText color="muted">
        Choose exactly who may visit and how often. Tap a picture to see that visit right now.
      </AppText>

      {VISITOR_GROUPS.map((group) => {
        const members = available.filter((v) => v.group === group.id);
        if (members.length === 0) return null;
        const ids = members.map((v) => v.id);
        const anyOn = members.some((v) => settings.visitors[v.id].on);
        const groupShare = members.reduce((sum, v) => sum + shares[v.id], 0);
        return (
          <View key={group.id} style={styles.section}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <AppText variant="heading">{group.title}</AppText>
                <AppText variant="caption" color="muted">
                  {groupShare > 0 ? `≈ ${percent(groupShare)} of visits together` : "None of these come"}
                </AppText>
              </View>
              <Switch
                value={anyOn}
                onValueChange={(on) => turn(ids, on)}
                accessibilityLabel={`All of: ${group.title}`}
                {...switchColors}
              />
            </View>
            <Card style={styles.card}>
              {members.map((visitor, i) => {
                const choice = settings.visitors[visitor.id];
                const preview = previewOf(visitor);
                return (
                  <Fragment key={visitor.id}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    <View style={styles.visitor}>
                      <View style={styles.row}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Show: ${visitor.label}`}
                          onPress={() => goose.summon(visitor)}
                          style={[styles.preview, { backgroundColor: colors.background, opacity: choice.on ? 1 : 0.45 }]}
                        >
                          {preview != null && <Image source={preview} style={styles.image} contentFit="contain" />}
                        </Pressable>
                        <View style={styles.flex}>
                          <AppText variant="label">{visitor.label}</AppText>
                          <AppText variant="caption" color="muted">
                            {shares[visitor.id] > 0 ? `≈ ${percent(shares[visitor.id])} of visits` : "Stays away"}
                          </AppText>
                        </View>
                        <Switch
                          value={choice.on}
                          onValueChange={(on) => turn([visitor.id], on)}
                          accessibilityLabel={`${group.title}: ${visitor.label}`}
                          {...switchColors}
                        />
                      </View>
                      {choice.on && (
                        <GradientSlider
                          value={choice.weight / 100}
                          onChange={(value) => change([visitor.id], (c) => ({ ...c, weight: Math.round(value * 100) }))}
                          stops={stops}
                          label={`How often: ${group.title}, ${visitor.label}`}
                          valueText={`${percent(shares[visitor.id])} of visits`}
                        />
                      )}
                    </View>
                  </Fragment>
                );
              })}
            </Card>
          </View>
        );
      })}

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="heading">Two at once</AppText>
            <AppText variant="caption" color="muted">
              {!pairsPossible
                ? "Needs a goose and a duckling that pop up"
                : settings.pairs.on
                  ? `A goose and a duckling pop up together in ${percent(settings.pairs.share)} of pop-ups`
                  : "Never together"}
            </AppText>
          </View>
          <Switch
            value={settings.pairs.on}
            onValueChange={(on) => set({ ...settings, pairs: { ...settings.pairs, on } })}
            accessibilityLabel="Two at once"
            {...switchColors}
          />
        </View>
        {settings.pairs.on && pairsPossible && (
          <GradientSlider
            value={settings.pairs.share / MAX_PAIR_SHARE}
            onChange={(value) =>
              set({ ...settings, pairs: { ...settings.pairs, share: Math.round(value * MAX_PAIR_SHARE * 100) / 100 } })
            }
            stops={stops}
            label="How often two pop up at once"
            valueText={`${percent(settings.pairs.share)} of pop-ups`}
          />
        )}
      </View>

      <View style={styles.actions}>
        <Button title="Summon one now" variant="secondary" disabled={!goose.canVisit} onPress={() => goose.summon()} />
        <Button title="Reset to default" variant="ghost" onPress={() => set(DEFAULT_VISITOR_SETTINGS)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  visitor: { gap: spacing.sm, paddingVertical: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  preview: { width: 52, height: 52, borderRadius: radii.card, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  actions: { gap: spacing.sm },
});
