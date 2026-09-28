import { usePathname } from "expo-router";
import Storage from "expo-sqlite/kv-store";
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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import Svg from "react-native-svg";

import { AppText } from "@/components/app-text";
import { Shapes, useSvgIdPrefix } from "@/components/duck-mascot";
import { PEEK_POSES, peekPoseFor } from "@/components/mascot/art";
import { PEEK_IMAGES } from "@/components/mascot/images.generated";
import { GOOSE_PEEK_SIZE, goosePeekShapes, type GoosePose } from "@/components/mascot/shapes";
import { fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type GooseContextValue = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** Bring the goose over right now. */
  summon: () => void;
  /** Re-reads the saved setting (after a backup was restored). */
  reloadFromStorage: () => void;
};

const STORAGE_KEY = "goose.enabled";
const GooseContext = createContext<GooseContextValue>({
  enabled: true,
  setEnabled: () => {},
  summon: () => {},
  reloadFromStorage: () => {},
});

export function useGoose(): GooseContextValue {
  return use(GooseContext);
}

function loadEnabled(): boolean {
  try {
    return Storage.getItemSync(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

/** Provides the goose settings and renders the goose that now and then pokes its head in. */
export function GooseProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(loadEnabled);
  const peek = useRef<GooseHandle>(null);

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    try {
      Storage.setItemSync(STORAGE_KEY, String(value));
    } catch {
      // Not critical.
    }
  };

  return (
    <GooseContext
      value={{ enabled, setEnabled, summon: () => peek.current?.summon(), reloadFromStorage: () => setEnabledState(loadEnabled()) }}
    >
      {children}
      <GoosePeek enabled={enabled} ref={peek} />
    </GooseContext>
  );
}

// ─── The visit ──────────────────────────────────────────────────────────────

type GooseHandle = { summon: () => void };

type Act = "honk" | "look" | "peck" | "suspicious" | "wink" | "steal" | "flee";
type Visit = { id: number; side: "left" | "right"; top: number; act: Act };

const ACTS: readonly Act[] = ["honk", "honk", "look", "peck", "suspicious", "wink", "steal"];
const FIRST_VISIT_MS: [number, number] = [25_000, 60_000];
const NEXT_VISIT_MS: [number, number] = [90_000, 240_000];
const REST: GoosePose = { eye: "open", look: 1, beakOpen: false, holdingBook: false };

/** Drawn head poses are used only as a complete set, so one visit never mixes drawn and vector heads. */
const PEEK_DRAWN = PEEK_POSES.every((pose) => PEEK_IMAGES[pose]);

const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);

function GoosePeek({ enabled, ref }: { enabled: boolean; ref: Ref<GooseHandle> }) {
  const { colors } = useTheme();
  const idPrefix = useSvgIdPrefix();
  const { height } = useWindowDimensions();
  const pathname = usePathname();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [pose, setPose] = useState<GoosePose>(REST);
  const [bubble, setBubble] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [retries, setRetries] = useState(0);
  const visitsSoFar = useRef(0);

  const slide = useSharedValue(0); // 0 hidden … 1 fully in
  const bob = useSharedValue(0); // px towards the screen centre
  const tilt = useSharedValue(0); // degrees

  const { width: W, height: H } = GOOSE_PEEK_SIZE;
  const sign = visit?.side === "left" ? -1 : 1;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: sign * ((1 - slide.value) * (W + 10) - bob.value) },
      { rotate: `${sign * tilt.value}deg` },
    ],
  }));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  const start = (act?: Act) => {
    visitsSoFar.current += 1;
    setPose(REST);
    setBubble(null);
    setVisit({
      id: Date.now(),
      side: Math.random() < 0.5 ? "left" : "right",
      top: height * (0.18 + Math.random() * 0.45),
      act: act ?? ACTS[Math.floor(Math.random() * ACTS.length)],
    });
  };

  // "Summon the goose" in Settings calls this directly.
  useImperativeHandle(ref, () => ({ summon: () => !visit && start() }));

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
    if (!enabled || reduceMotion || visit) return;
    const delay = between(visitsSoFar.current === 0 ? FIRST_VISIT_MS : NEXT_VISIT_MS);
    const timer = setTimeout(tryVisit, delay);
    return () => clearTimeout(timer);
  }, [enabled, reduceMotion, visit, retries]);

  // Play the act.
  useEffect(() => {
    if (!visit) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));
    const enter = (to = 1, duration = 450) => {
      slide.value = withTiming(to, { duration, easing: Easing.out(Easing.back(1.3)) });
    };
    const leave = (duration = 380) => {
      slide.value = withTiming(0, { duration, easing: Easing.in(Easing.cubic) });
    };
    const shake = () => {
      tilt.value = withSequence(
        withTiming(-7, { duration: 70 }),
        withRepeat(withTiming(7, { duration: 140 }), 4, true),
        withTiming(0, { duration: 70 }),
      );
    };
    const peck = () => {
      bob.value = withSequence(withTiming(16, { duration: 110 }), withTiming(0, { duration: 170 }));
    };

    const perform = async () => {
      const step = async (ms: number) => {
        await wait(ms);
        return !cancelled;
      };
      switch (visit.act) {
        case "honk":
          enter();
          if (!(await step(650))) return;
          setPose({ ...REST, beakOpen: true, eye: "wide" });
          setBubble("HONK!");
          shake();
          if (!(await step(1000))) return;
          setPose(REST);
          setBubble(null);
          if (!(await step(450))) return;
          break;
        case "look":
          enter();
          if (!(await step(600))) return;
          setPose({ ...REST, look: -1 });
          if (!(await step(700))) return;
          setPose({ ...REST, look: 1 });
          tilt.value = withTiming(12, { duration: 250 });
          setBubble("?");
          if (!(await step(900))) return;
          setPose({ ...REST, eye: "closed" });
          if (!(await step(160))) return;
          setPose(REST);
          setBubble(null);
          tilt.value = withTiming(0, { duration: 200 });
          if (!(await step(400))) return;
          break;
        case "peck":
          enter();
          if (!(await step(550))) return;
          for (let i = 0; i < 3; i++) {
            setPose({ ...REST, beakOpen: true });
            peck();
            if (!(await step(170))) return;
            setPose(REST);
            if (!(await step(240))) return;
          }
          setBubble("tap tap");
          if (!(await step(900))) return;
          setBubble(null);
          break;
        case "suspicious":
          enter(0.62, 1100);
          if (!(await step(1150))) return;
          setPose({ ...REST, eye: "narrow" });
          setBubble("…");
          if (!(await step(1800))) return;
          setBubble(null);
          leave(240);
          if (!(await step(260))) return;
          break;
        case "wink":
          enter();
          if (!(await step(600))) return;
          setPose({ ...REST, eye: "wink" });
          setBubble("♥");
          if (!(await step(1100))) return;
          setPose(REST);
          setBubble(null);
          if (!(await step(300))) return;
          break;
        case "steal":
          setPose({ ...REST, holdingBook: true, eye: "wide" });
          enter();
          if (!(await step(600))) return;
          setBubble("mine now");
          if (!(await step(1200))) return;
          setBubble(null);
          leave(260);
          if (!(await step(280))) return;
          break;
        case "flee":
          setPose({ ...REST, beakOpen: true, eye: "wide" });
          setBubble("HONK!");
          shake();
          if (!(await step(450))) return;
          setBubble(null);
          leave(220);
          if (!(await step(240))) return;
          break;
      }
      leave();
      if (!(await step(420))) return;
      setBubble(null);
      setPose(REST);
      setVisit(null);
    };
    perform();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [visit, slide, bob, tilt]);

  if (!visit) return null;

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.goose,
          { top: visit.top, width: W, height: H, transformOrigin: sign > 0 ? "100% 70%" : "0% 70%" },
          sign > 0 ? { right: 0 } : { left: 0 },
          animatedStyle,
        ]}
      >
        {/* Poke the goose and it honks and runs. */}
        <Pressable
          onPress={() => visit.act !== "flee" && setVisit({ ...visit, id: Date.now(), act: "flee" })}
          style={sign < 0 && styles.mirrored}
        >
          {PEEK_DRAWN ? (
            // All poses stay mounted and only the current one shows, so switching never flickers.
            <View style={{ width: W, height: H }}>
              {PEEK_POSES.map((name) => (
                <Image
                  key={name}
                  source={PEEK_IMAGES[name]}
                  style={[StyleSheet.absoluteFill, { opacity: name === peekPoseFor(pose) ? 1 : 0 }]}
                  contentFit="contain"
                  transition={0}
                />
              ))}
            </View>
          ) : (
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Shapes shapes={goosePeekShapes(pose, colors.secondary, idPrefix)} />
            </Svg>
          )}
        </Pressable>
        {bubble && (
          <View
            pointerEvents="none"
            style={[
              styles.bubble,
              { backgroundColor: colors.surface, borderColor: colors.text },
              sign > 0 ? { right: W - 44 } : { left: W - 44 },
            ]}
          >
            <AppText style={styles.bubbleText}>{bubble}</AppText>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  goose: { position: "absolute" },
  mirrored: { transform: [{ scaleX: -1 }] },
  bubble: {
    position: "absolute",
    bottom: GOOSE_PEEK_SIZE.height - 38,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
  },
  bubbleText: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 20 },
});
