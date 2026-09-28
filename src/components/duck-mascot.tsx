import { Image } from "expo-image";
import { useId, useState, type ReactNode } from "react";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { MASCOT_IMAGES } from "@/components/mascot/images.generated";
import {
  mascotShapes,
  MOODS,
  randomSpecies,
  SPECIES,
  type GradientStop,
  type Mood,
  type Shape,
  type Species,
} from "@/components/mascot/shapes";
import { fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export type DuckMood = Mood;

type DuckMascotProps = {
  mood?: DuckMood;
  size?: number;
  /** Leave unset for a random bird (picked once per appearance). */
  species?: Species;
};

/** Characters with every mood drawn — once any exist, random picks stay among them. */
const FULLY_DRAWN = SPECIES.map((s) => s.value).filter((value) => MOODS.every((m) => MASCOT_IMAGES[value]?.[m]));

/**
 * The app's mascot: a random goose or duckling acting out a mood. Uses the drawn image from
 * assets/mascots/ when there is one, otherwise the vector drawing.
 */
export function DuckMascot({ mood = "reading", size = 120, species }: DuckMascotProps) {
  const { colors } = useTheme();
  const [randomPick] = useState(() => randomSpecies(Math.random, FULLY_DRAWN));
  const idPrefix = useSvgIdPrefix();
  const bird = species ?? randomPick;
  const label = SPECIES.find((s) => s.value === bird)?.label ?? "duck";
  const drawn = MASCOT_IMAGES[bird]?.[mood];

  if (drawn) {
    return (
      <Image
        source={drawn}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={0}
        accessibilityLabel={`Cute ${label}, ${mood}`}
      />
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel={`Cute ${label}, ${mood}`}>
      <Shapes shapes={mascotShapes(bird, mood, colors, idPrefix)} />
    </Svg>
  );
}

/** A per-instance prefix for gradient/clip ids (SVG ids can't contain React's ":" characters). */
export function useSvgIdPrefix(): string {
  return `s${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

/** Renders a mascot shape list with react-native-svg: definitions first, then the drawing. */
export function Shapes({ shapes }: { shapes: Shape[] }) {
  const defs: ReactNode[] = [];
  const drawing = shapes.map((shape, i) => renderShape(shape, `${i}`, defs));
  return (
    <>
      <Defs>{defs}</Defs>
      {drawing}
    </>
  );
}

function renderStops(stops: GradientStop[]) {
  return stops.map((s, i) => <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />);
}

function renderShape(s: Shape, key: string, defs: ReactNode[]): ReactNode {
  switch (s.kind) {
    case "linearGradient":
      defs.push(
        <LinearGradient key={s.id} id={s.id} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}>
          {renderStops(s.stops)}
        </LinearGradient>,
      );
      return null;
    case "radialGradient":
      defs.push(
        <RadialGradient key={s.id} id={s.id} cx={s.cx} cy={s.cy} r={s.r} fx={s.fx ?? s.cx} fy={s.fy ?? s.cy}>
          {renderStops(s.stops)}
        </RadialGradient>,
      );
      return null;
    case "clipPath":
      defs.push(
        <ClipPath key={s.id} id={s.id}>
          {s.children.map((child, i) => renderShape(child, `${key}.${i}`, defs))}
        </ClipPath>,
      );
      return null;
    case "group":
      return (
        <G
          key={key}
          transform={s.transform}
          opacity={s.opacity}
          clipPath={s.clipPath ? `url(#${s.clipPath})` : undefined}
        >
          {s.children.map((child, i) => renderShape(child, `${key}.${i}`, defs))}
        </G>
      );
  }

  const paint = {
    fill: s.fill ?? "none",
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    opacity: s.opacity,
    transform: s.transform,
  };
  switch (s.kind) {
    case "path":
      return <Path key={key} d={s.d} {...paint} />;
    case "circle":
      return <Circle key={key} cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
    case "ellipse":
      return <Ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...paint} />;
    case "rect":
      return <Rect key={key} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} {...paint} />;
    case "text":
      return (
        <SvgText
          key={key}
          x={s.x}
          y={s.y}
          fontSize={s.size}
          fontFamily={s.weight === "bold" ? fonts.sansBold : fonts.sans}
          {...paint}
        >
          {s.text}
        </SvgText>
      );
  }
}
