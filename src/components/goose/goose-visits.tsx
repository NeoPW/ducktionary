import { usePathname } from "expo-router";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { AccessibilityInfo, AppState, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { AppText } from "@/components/app-text";
import {
  OPTIONAL_PEEK_POSES,
  PEEK_LOOKS,
  PEEK_POSES,
  SPECIES,
  WALK_FRAMES,
  type PeekLook,
  type PeekPose,
  type Species,
  type WalkFrame,
} from "@/components/mascot/art";
import {
  anyVisitor,
  pickPartner,
  pickVisitor,
  VISITORS,
  parseVisitorSettings,
  type PopupAct,
  type Visitor,
  type VisitorId,
  type VisitorSettings,
} from "@/components/goose/visitors";
import { PEEK_IMAGES, WALK_IMAGES } from "@/components/mascot/images.generated";
import { SETTING_KEYS } from "@/storage/keys";
import { readSetting, writeSetting } from "@/storage/settings";
import { fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type GooseContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** Who may visit, and how often. */
  visitors: VisitorSettings;
  setVisitors: (visitors: VisitorSettings) => void;
  /** False when every visitor is switched off. */
  canVisit: boolean;
  /** Bring a visitor over right now: the given one, or one picked by the user's chances. */
  summon: (visitor?: Visitor) => void;
  /** Re-reads the saved setting (after a backup was restored). */
  reloadFromStorage: () => void;
};

const GooseContext = createContext<GooseContextValue>({
  enabled: true,
  setEnabled: () => {},
  visitors: parseVisitorSettings(null),
  setVisitors: () => {},
  canVisit: true,
  summon: () => {},
  reloadFromStorage: () => {},
});

export function useGoose(): GooseContextValue {
  return use(GooseContext);
}

function loadEnabled(): boolean {
  return readSetting(SETTING_KEYS.gooseEnabled) !== "false";
}

const loadVisitors = () => parseVisitorSettings(readSetting(SETTING_KEYS.gooseVisitors));

/** Provides the goose settings and renders the goose that now and then pops up or waddles through. */
export function GooseProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(loadEnabled);
  const [visitors, setVisitorsState] = useState(loadVisitors);
  const peek = useRef<GooseHandle>(null);

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    writeSetting(SETTING_KEYS.gooseEnabled, String(value));
  };
  const setVisitors = (value: VisitorSettings) => {
    setVisitorsState(value);
    writeSetting(SETTING_KEYS.gooseVisitors, JSON.stringify(value));
  };

  return (
    <GooseContext
      value={{
        enabled,
        setEnabled,
        visitors,
        setVisitors,
        canVisit: anyVisitor(visitors, AVAILABLE_VISITORS),
        summon: (visitor) => peek.current?.summon(visitor),
        reloadFromStorage: () => {
          setEnabledState(loadEnabled());
          setVisitorsState(loadVisitors());
        },
      }}
    >
      {children}
      <GooseVisits enabled={enabled} visitors={visitors} ref={peek} />
    </GooseContext>
  );
}


// ─── The visits ─────────────────────────────────────────────────────────────

type GooseHandle = { summon: (visitor?: Visitor) => void };

/** Pop-up acts: the goose rises from a screen edge, does its thing and ducks away again. */
type Edge = "bottom" | "top" | "left" | "right";
/** One character popping up; a pop-up visit has one or, now and then, two. */
type PopupActor = {
  key: string;
  species: Species;
  /** Which of the character's pop-up sets (the duckling has two). */
  look: PeekLook;
  act: PopupAct | "flee";
  edge: Edge;
  along: number;
  mirrored: boolean;
};
type Visit =
  | { id: number; kind: "popup"; actors: PopupActor[] }
  | { id: number; kind: "waddle"; species: Species; act: "waddle" | "flee"; fromLeft: boolean; bottom: number };

/** The bottom is the classic windowsill, so it comes up a little more often. */
const EDGES: readonly Edge[] = ["bottom", "bottom", "top", "left", "right"];

/**
 * The pop-up drawings have their cut at the bottom; for the other edges the drawing is turned so the cut lies on
 * that edge. `out` points from the goose out of the screen; `head` is where the head points along the edge
 * (−1 = left/up, +1 = right/down) when the drawing isn't mirrored — it looks left before turning.
 */
const EDGE_GEOMETRY: Record<Edge, { angle: number; out: [number, number]; head: number }> = {
  bottom: { angle: 0, out: [0, 1], head: -1 },
  top: { angle: 180, out: [0, -1], head: 1 },
  left: { angle: 90, out: [-1, 0], head: -1 },
  right: { angle: -90, out: [1, 0], head: 1 },
};
const FIRST_VISIT_MS: [number, number] = [25_000, 60_000];
const NEXT_VISIT_MS: [number, number] = [90_000, 240_000];
/** Walking speed in points per second, and how often the feet alternate. */
const WALK_SPEED = 75;
const STEP_MS = 170;

/**
 * Who can visit at all: visitors whose pop-up or walk set is complete, so a visit never shows a missing pose.
 * Which of them come, and how often, is the user's choice (see visitors.ts).
 */
const POP_UP_LOOKS = PEEK_LOOKS.filter(({ look }) => PEEK_POSES.every((pose) => PEEK_IMAGES[look]?.[pose]));
/** Every pose a set may have, mounted together so switching never flickers. */
const ALL_PEEK_POSES: readonly PeekPose[] = [...PEEK_POSES, ...OPTIONAL_PEEK_POSES];
const WADDLE_SPECIES = SPECIES.filter((sp) => WALK_FRAMES.every((frame) => WALK_IMAGES[sp]?.[frame]));
export const AVAILABLE_VISITORS: ReadonlySet<VisitorId> = new Set(
  VISITORS.filter((v) =>
    v.kind === "popup"
      ? POP_UP_LOOKS.some((l) => l.look === v.look) && PEEK_IMAGES[v.look]?.[v.pose] != null
      : WADDLE_SPECIES.includes(v.species),
  ).map((v) => v.id),
);

/** What each character shouts. */
const SOUND: Record<Species, { loud: string; soft: string }> = {
  goose: { loud: "HONK!", soft: "honk" },
  duckling: { loud: "QUACK!", soft: "quack" },
};

const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

function GooseVisits({
  enabled,
  visitors,
  ref,
}: {
  enabled: boolean;
  visitors: VisitorSettings;
  ref: Ref<GooseHandle>;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [retries, setRetries] = useState(0);
  const visitsSoFar = useRef(0);
  const finished = useRef(new Set<string>());

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  const canVisit = anyVisitor(visitors, AVAILABLE_VISITORS);

  const start = (chosen?: Visitor) => {
    visitsSoFar.current += 1;
    const id = Date.now();
    const visitor = chosen ?? pickVisitor(visitors, AVAILABLE_VISITORS);
    if (!visitor) return;
    if (visitor.kind === "waddle") {
      // Any height between just above the bottom edge and just below the header.
      const lowest = insets.bottom + 4;
      const highest = height - insets.top - 56 - walkSize(width);
      const bottom = lowest + Math.random() * Math.max(0, highest - lowest);
      const species = visitor.species;
      setVisit({ id, kind: "waddle", species, act: "waddle", fromLeft: Math.random() < 0.5, bottom });
      return;
    }
    // Now and then a goose and a duckling pop up together.
    const partner = chosen ? null : pickPartner(visitors, AVAILABLE_VISITORS, visitor);
    const cast = partner?.kind === "popup" ? [visitor, partner] : [visitor];
    // A pair comes from two different edges, so they never overlap.
    const edges = shuffle(EDGES.filter((e, i) => EDGES.indexOf(e) === i));
    const first = pick(EDGES);
    const actors = cast.map(({ species, look, act }, i) => {
      const edge = i === 0 ? first : edges.find((e) => e !== first)!;
      const place = placeOnEdge(edge, peekSize(width), width, height);
      return { key: species, species, look, act, edge, ...place };
    });
    setVisit({ id, kind: "popup", actors });
  };

  // "Summon the goose" in Settings calls this directly; the visitors page summons one particular visitor.
  useImperativeHandle(ref, () => ({
    summon: (chosen) => {
      if (visit) return;
      if (chosen ? AVAILABLE_VISITORS.has(chosen.id) : canVisit) start(chosen);
    },
  }));

  // A due visit is skipped while the camera is open or the app is in the background.
  const tryVisit = useEffectEvent(() => {
    if (pathname === "/scan" || AppState.currentState !== "active") {
      visitsSoFar.current += 1;
      setRetries((n) => n + 1);
      return;
    }
    start();
  });

  // Schedule the next surprise visit whenever the goose is away.
  useEffect(() => {
    if (!enabled || reduceMotion || visit || !canVisit) return;
    const delay = between(visitsSoFar.current === 0 ? FIRST_VISIT_MS : NEXT_VISIT_MS);
    const timer = setTimeout(tryVisit, delay);
    return () => clearTimeout(timer);
  }, [enabled, reduceMotion, visit, retries, canVisit]);

  if (!visit) return null;

  // Poke a visitor and it honks and runs (a pair runs together).
  const flee = () => {
    if (visit.kind === "waddle") {
      if (visit.act !== "flee") setVisit({ ...visit, id: Date.now(), act: "flee" });
    } else if (visit.actors.some((a) => a.act !== "flee")) {
      setVisit({ ...visit, id: Date.now(), actors: visit.actors.map((a) => ({ ...a, act: "flee" })) });
    }
  };
  // The visit is over once every visitor has left.
  const done = (key: string) => {
    finished.current.add(`${visit.id}:${key}`);
    if (visit.kind === "waddle" || visit.actors.every((a) => finished.current.has(`${visit.id}:${a.key}`))) {
      setVisit(null);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {visit.kind === "popup" ? (
        visit.actors.map((actor) => (
          <PopUp
            key={actor.key}
            actor={actor}
            visitId={visit.id}
            size={peekSize(width)}
            onPoke={flee}
            onDone={() => done(actor.key)}
          />
        ))
      ) : (
        <Waddle visit={visit} size={walkSize(width)} screenWidth={width} onPoke={flee} onDone={() => done("walker")} />
      )}
    </View>
  );
}

/** Somewhere along the edge, clear of the corners (and the header and tab bar on the sides), facing the middle. */
function placeOnEdge(edge: Edge, size: number, width: number, height: number) {
  const horizontal = edge === "bottom" || edge === "top";
  const along = horizontal
    ? 12 + Math.random() * Math.max(0, width - size - 24)
    : height * 0.15 + Math.random() * Math.max(0, height * 0.6 - size);
  const towardsMiddle = Math.sign((horizontal ? width : height) / 2 - (along + size / 2)) || 1;
  return { along, mirrored: towardsMiddle !== EDGE_GEOMETRY[edge].head };
}

const shuffle = <T,>(items: readonly T[]) => [...items].sort(() => Math.random() - 0.5);

const peekSize = (screenWidth: number) => Math.min(170, screenWidth * 0.42);
const walkSize = (screenWidth: number) => Math.min(130, screenWidth * 0.34);

/** Runs an async script of timed steps; everything stops when the effect is cleaned up. */
function useScript(run: (step: (ms: number) => Promise<boolean>) => Promise<void>, deps: unknown[]) {
  const script = useEffectEvent(run);
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const step = (ms: number) =>
      new Promise<boolean>((resolve) => timers.push(setTimeout(() => resolve(!cancelled), ms)));
    script(step);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the script re-runs per visit, by design
  }, deps);
}

// ─── Pop-up: the upper body rises from a screen edge ────────────────────────

function PopUp({
  actor,
  visitId,
  size,
  onPoke,
  onDone,
}: {
  actor: PopupActor;
  visitId: number;
  size: number;
  onPoke: () => void;
  onDone: () => void;
}) {
  const [pose, setPose] = useState<PeekPose>(actor.act === "steal" ? "steal" : "rest");
  const [mirrored, setMirrored] = useState(actor.mirrored);
  const { angle, out } = EDGE_GEOMETRY[actor.edge];
  const [bubble, setBubble] = useState<string | null>(null);

  const rise = useSharedValue(0); // 0 hidden beyond the edge … 1 fully in
  const dip = useSharedValue(0); // px back towards the edge, for pecks
  const tilt = useSharedValue(0); // degrees, around the middle of the cut

  // Rising and dipping move straight out of the edge; the tilt happens inside the turned drawing.
  const slideStyle = useAnimatedStyle(() => {
    const offset = (1 - rise.value) * (size + 8) + dip.value;
    return { transform: [{ translateX: out[0] * offset }, { translateY: out[1] * offset }] };
  });
  const tiltStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));

  useScript(
    async (step) => {
      const up = (to = 1, duration = 520) => {
        rise.set(withTiming(to, { duration, easing: Easing.out(Easing.back(1.4)) }));
      };
      const down = (duration = 380) => {
        rise.set(withTiming(0, { duration, easing: Easing.in(Easing.cubic) }));
      };
      const shake = () => {
        tilt.set(
          withSequence(
            withTiming(-6, { duration: 70 }),
            withRepeat(withTiming(6, { duration: 140 }), 4, true),
            withTiming(0, { duration: 70 }),
          ),
        );
      };
      const say = (text: string | null) => setBubble(text);

      switch (actor.act) {
        case "honk":
          up();
          if (!(await step(700))) return;
          setPose("honk");
          say(SOUND[actor.species].loud);
          shake();
          if (!(await step(1000))) return;
          setPose("rest");
          say(null);
          if (!(await step(500))) return;
          break;
        case "look":
          up();
          if (!(await step(800))) return;
          setMirrored((m) => !m);
          if (!(await step(800))) return;
          setMirrored((m) => !m);
          say("?");
          if (!(await step(700))) return;
          setPose("blink");
          if (!(await step(160))) return;
          setPose("rest");
          say(null);
          if (!(await step(400))) return;
          break;
        case "peck":
          up();
          if (!(await step(650))) return;
          for (let i = 0; i < 3; i++) {
            setPose("honk");
            dip.set(withSequence(withTiming(14, { duration: 110 }), withTiming(0, { duration: 170 })));
            if (!(await step(170))) return;
            setPose("rest");
            if (!(await step(240))) return;
          }
          say("tap tap");
          if (!(await step(900))) return;
          say(null);
          break;
        case "suspicious":
          // Only up to the eyes, slowly.
          setPose("suspicious");
          up(0.5, 1200);
          if (!(await step(1250))) return;
          say("…");
          if (!(await step(1800))) return;
          say(null);
          down(240);
          if (!(await step(260))) return;
          break;
        case "wink":
          up();
          if (!(await step(700))) return;
          setPose("wink");
          say("♥");
          if (!(await step(1100))) return;
          setPose("rest");
          say(null);
          if (!(await step(300))) return;
          break;
        case "wave":
          up();
          if (!(await step(650))) return;
          setPose("wave");
          say("hi!");
          if (!(await step(1300))) return;
          setPose("rest");
          say(null);
          if (!(await step(300))) return;
          break;
        case "steal":
          up();
          if (!(await step(700))) return;
          say("mine now");
          if (!(await step(1200))) return;
          say(null);
          down(260);
          if (!(await step(280))) return;
          break;
        case "flee":
          setPose("honk");
          say(SOUND[actor.species].loud);
          shake();
          if (!(await step(450))) return;
          say(null);
          down(220);
          if (!(await step(240))) return;
          break;
      }
      down();
      if (!(await step(420))) return;
      onDone();
    },
    [visitId],
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.popup, { width: size, height: size }, EDGE_POSITION[actor.edge](actor.along), slideStyle]}
    >
      <View pointerEvents="box-none" style={{ width: size, height: size, transform: [{ rotate: `${angle}deg` }] }}>
        <Animated.View
          pointerEvents="box-none"
          style={[{ width: size, height: size, transformOrigin: "50% 100%" }, tiltStyle]}
        >
          <Pressable onPress={onPoke} style={[{ width: size, height: size }, mirrored && styles.mirrored]}>
            {/* All poses stay mounted and only the current one shows, so switching never flickers. */}
            {ALL_PEEK_POSES.filter((name) => PEEK_IMAGES[actor.look]?.[name]).map((name) => (
              <Image
                key={name}
                source={PEEK_IMAGES[actor.look]?.[name]}
                style={[StyleSheet.absoluteFill, { opacity: name === pose ? 1 : 0 }]}
                contentFit="contain"
                transition={0}
              />
            ))}
          </Pressable>
        </Animated.View>
      </View>
      {/* The bubble stays upright, on the screen side of the goose. */}
      {bubble && <Bubble text={bubble} style={[BUBBLE_POSITION[actor.edge](size)]} />}
    </Animated.View>
  );
}

// ─── Waddle: the whole goose marches across the screen ──────────────────────

function Waddle({
  visit,
  size,
  screenWidth,
  onPoke,
  onDone,
}: {
  visit: Extract<Visit, { kind: "waddle" }>;
  size: number;
  screenWidth: number;
  onPoke: () => void;
  onDone: () => void;
}) {
  const [frame, setFrame] = useState<WalkFrame>("step-1");
  const [walking, setWalking] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);

  const from = visit.fromLeft ? -size : screenWidth;
  const to = visit.fromLeft ? screenWidth : -size;
  const x = useSharedValue(from);
  const hop = useSharedValue(0); // px up
  const wobble = useSharedValue(0); // degrees

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: -hop.value }, { rotate: `${wobble.value}deg` }],
  }));

  // Feet alternate and the body bobs while walking; standing still shows the first step.
  useEffect(() => {
    if (!walking) {
      cancelAnimation(hop);
      cancelAnimation(wobble);
      hop.set(withTiming(0, { duration: 120 }));
      wobble.set(withTiming(0, { duration: 120 }));
      return;
    }
    const half = { duration: STEP_MS / 2 };
    hop.set(withRepeat(withSequence(withTiming(4, half), withTiming(0, half)), -1));
    const full = { duration: STEP_MS };
    wobble.set(withRepeat(withSequence(withTiming(3, full), withTiming(-3, full)), -1, true));
    const timer = setInterval(() => setFrame((f) => (f === "step-1" ? "step-2" : "step-1")), STEP_MS);
    return () => clearInterval(timer);
  }, [walking, hop, wobble]);

  useScript(
    async (step) => {
      const walkTo = (target: number, speed = WALK_SPEED) => {
        const ms = (Math.abs(target - x.get()) / speed) * 1000;
        x.set(withTiming(target, { duration: ms, easing: Easing.linear }));
        return ms;
      };
      if (visit.act === "flee") {
        setBubble(SOUND[visit.species].loud);
        setWalking(true);
        if (!(await step(walkTo(to, WALK_SPEED * 4)))) return;
        onDone();
        return;
      }
      // Walk to the middle, stop for a honk, carry on and leave.
      setWalking(true);
      if (!(await step(walkTo((screenWidth - size) / 2)))) return;
      setWalking(false);
      setFrame("step-1");
      if (!(await step(350))) return;
      setBubble(SOUND[visit.species].soft);
      if (!(await step(900))) return;
      setBubble(null);
      setWalking(true);
      if (!(await step(walkTo(to)))) return;
      onDone();
    },
    [visit.id],
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.waddle, { bottom: visit.bottom, width: size, height: size }, animatedStyle]}
    >
      <Pressable onPress={onPoke} style={[{ width: size, height: size }, visit.fromLeft && styles.mirrored]}>
        {WALK_FRAMES.map((name) => (
          <Image
            key={name}
            source={WALK_IMAGES[visit.species]?.[name]}
            style={[StyleSheet.absoluteFill, { opacity: name === frame ? 1 : 0 }]}
            contentFit="contain"
            transition={0}
          />
        ))}
      </Pressable>
      {bubble && (
        <Bubble text={bubble} style={[{ bottom: size * 0.9 }, visit.fromLeft ? { right: -8 } : { left: -8 }]} />
      )}
    </Animated.View>
  );
}

function Bubble({ text, style }: { text: string; style: object[] }) {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.text }, ...style]}
    >
      <AppText style={styles.bubbleText}>{text}</AppText>
    </View>
  );
}

/** Where the pop-up box sits: flush with its edge, `along` points from the edge's start. */
const EDGE_POSITION: Record<Edge, (along: number) => object> = {
  bottom: (along) => ({ bottom: 0, left: along }),
  top: (along) => ({ top: 0, left: along }),
  left: (along) => ({ left: 0, top: along }),
  right: (along) => ({ right: 0, top: along }),
};

const BUBBLE_POSITION: Record<Edge, (size: number) => object> = {
  bottom: (size) => ({ bottom: size * 0.86, left: size * 0.1 }),
  top: (size) => ({ top: size * 0.86, left: size * 0.1 }),
  left: (size) => ({ left: size * 0.86, top: size * 0.1 }),
  right: (size) => ({ right: size * 0.86, top: size * 0.1 }),
};

const styles = StyleSheet.create({
  popup: { position: "absolute" },
  waddle: { position: "absolute", left: 0 },
  mirrored: { transform: [{ scaleX: -1 }] },
  bubble: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
  },
  bubbleText: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 20 },
});
