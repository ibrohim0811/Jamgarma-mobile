import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Ellipse,
  Path,
  G,
} from 'react-native-svg';

/* ------------------------------------------------------------------ */
/*  Yordamchilar                                                        */
/* ------------------------------------------------------------------ */

/** Deterministik "tasodifiy" son (0..1) */
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const archPath = (x: number, yb: number, wd: number, closed = false) =>
  `M ${x} ${yb} L ${x} ${yb - wd * 0.9} A ${wd / 2} ${wd / 2} 0 0 1 ${x + wd} ${yb - wd * 0.9} L ${x + wd} ${yb}${closed ? ' Z' : ''}`;

const flamePath = (cx: number, cy: number, s: number) =>
  `M ${cx} ${cy - s} C ${cx + s * 0.9} ${cy - s * 0.1}, ${cx + s * 0.7} ${cy + s * 0.8}, ${cx} ${cy + s * 0.8} ` +
  `C ${cx - s * 0.7} ${cy + s * 0.8}, ${cx - s * 0.9} ${cy - s * 0.1}, ${cx} ${cy - s} Z`;

/* ------------------------------------------------------------------ */
/*  12 ta dizayn (hammasi kod bilan chizilgan, original)                 */
/* ------------------------------------------------------------------ */

export type CardDesign = {
  key: string;
  name: string;
  colors: [string, string]; // fon gradienti
  fg: string; // matn rangi
  accent: string; // ekran orqa foni uchun urg'u rangi
  art: (w: number, h: number) => React.ReactNode;
};

const blackArt = (w: number, h: number) => (
  <>
    <Path d={`M0 ${h * 0.75} L${w * 0.55} 0 L${w * 0.8} 0 L0 ${h} Z`} fill="rgba(255,255,255,0.035)" />
    <Rect x={10} y={10} width={w - 20} height={h - 20} rx={14} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
  </>
);

const mandalaArt = (w: number, h: number) => {
  const cx = w * 0.78;
  const cy = h * 0.72;
  const r = h * 0.62;
  return (
    <>
      {[0, 1].map((ring) =>
        Array.from({ length: 12 }).map((_, i) => (
          <G key={`${ring}-${i}`} rotation={i * 30 + ring * 15} origin={`${cx}, ${cy}`}>
            <Ellipse
              cx={cx}
              cy={cy - r * (ring ? 0.38 : 0.58)}
              rx={r * (ring ? 0.12 : 0.16)}
              ry={r * (ring ? 0.3 : 0.42)}
              fill={ring ? '#FFFFFF' : '#F6B8C9'}
              opacity={ring ? 0.85 : 0.9}
            />
          </G>
        ))
      )}
      <Circle cx={cx} cy={cy} r={r * 0.7} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={r * 0.12} fill="#F5C451" />
    </>
  );
};

const eye = (cx: number, cy: number, s: number, k: number) => (
  <G key={k}>
    <Ellipse cx={cx} cy={cy} rx={s * 0.55} ry={s} fill="#0EA5A4" opacity={0.9} />
    <Ellipse cx={cx} cy={cy} rx={s * 0.38} ry={s * 0.72} fill="#1D4ED8" />
    <Ellipse cx={cx} cy={cy} rx={s * 0.22} ry={s * 0.42} fill="#F5C451" />
    <Ellipse cx={cx} cy={cy} rx={s * 0.1} ry={s * 0.2} fill="#0B1B4D" />
  </G>
);

const peacockArt = (w: number, h: number) => (
  <>
    <Path d={`M ${w * 0.95} ${h} C ${w * 0.7} ${h * 0.8}, ${w * 0.75} ${h * 0.4}, ${w * 0.5} ${h * 0.15}`} stroke="#7CC4FF" strokeOpacity={0.5} strokeWidth={1.4} fill="none" />
    <Path d={`M ${w * 0.8} ${h} C ${w * 0.6} ${h * 0.7}, ${w * 0.9} ${h * 0.5}, ${w * 0.72} ${h * 0.12}`} stroke="#7CC4FF" strokeOpacity={0.4} strokeWidth={1.2} fill="none" />
    {[
      [0.82, 0.3, 0.2],
      [0.62, 0.52, 0.16],
      [0.92, 0.7, 0.17],
      [0.5, 0.2, 0.1],
      [0.72, 0.82, 0.1],
    ].map(([x, y, s], i) => eye(w * x, h * y, h * s, i))}
  </>
);

const goldWavesArt = (w: number, h: number) => (
  <>
    {Array.from({ length: 7 }).map((_, i) => (
      <Path
        key={i}
        d={`M -10 ${h * (0.25 + i * 0.1)} C ${w * 0.3} ${h * (0.05 + i * 0.1)}, ${w * 0.6} ${h * (0.6 + i * 0.1)}, ${w + 10} ${h * (0.3 + i * 0.1)}`}
        fill="none"
        stroke="#C9A24B"
        strokeOpacity={0.75 - i * 0.05}
        strokeWidth={1.2}
      />
    ))}
  </>
);

const ikatArt = (w: number, h: number) => {
  const cols = 6;
  const cs = w / cols;
  const rows = Math.ceil(h / (cs / 2)) + 1;
  const tones = ['#C9A8FF', '#7C4DDB', '#F0E6FF'];
  const out: React.ReactNode[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const cx = c * cs + (r % 2 ? cs / 2 : 0);
      const cy = r * (cs / 2);
      const d = cs * 0.42;
      out.push(
        <G key={`${r}-${c}`}>
          <Path d={`M ${cx} ${cy - d} L ${cx + d} ${cy} L ${cx} ${cy + d} L ${cx - d} ${cy} Z`} fill={tones[(r + c) % 3]} opacity={0.32} />
          <Path d={`M ${cx} ${cy - d * 0.45} L ${cx + d * 0.45} ${cy} L ${cx} ${cy + d * 0.45} L ${cx - d * 0.45} ${cy} Z`} fill="#24094A" opacity={0.5} />
        </G>
      );
    }
  }
  return <>{out}</>;
};

const pearlsArt = (w: number, h: number) => (
  <>
    <Defs>
      <RadialGradient id="pearl" cx="35%" cy="30%" r="70%">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
        <Stop offset="1" stopColor="#6B7280" stopOpacity={0.55} />
      </RadialGradient>
    </Defs>
    {Array.from({ length: 17 }).map((_, i) => (
      <Circle key={i} cx={rnd(i) * w} cy={rnd(i, 1) * h} r={6 + rnd(i, 2) * 18} fill="url(#pearl)" opacity={0.5 + rnd(i, 3) * 0.5} />
    ))}
  </>
);

const flameArt = (w: number, h: number) => (
  <>
    <Path d={flamePath(w * 0.5, h * 0.55, h * 0.7)} fill="#F06AA6" opacity={0.45} />
    <Path d={flamePath(w * 0.5, h * 0.6, h * 0.5)} fill="#FFB3D1" opacity={0.6} />
    <Path d={flamePath(w * 0.5, h * 0.66, h * 0.3)} fill="#FF5E7E" opacity={0.85} />
    <Path d={flamePath(w * 0.5, h * 0.72, h * 0.14)} fill="#FFE3EE" opacity={0.9} />
  </>
);

const archesArt = (w: number, h: number) => {
  const colors = ['#9CB3FF', '#6C8CFF', '#B79CFF', '#EAE4FF'];
  return (
    <>
      {[0, 1, 2].map((col) => {
        const x0 = w * (0.08 + col * 0.32);
        const wd = w * 0.26;
        return Array.from({ length: 4 }).map((_, k) => (
          <Path
            key={`${col}-${k}`}
            d={archPath(x0 + k * wd * 0.1, h * 1.02, wd * (1 - 0.2 * k))}
            fill="none"
            stroke={colors[k]}
            strokeOpacity={0.7}
            strokeWidth={2}
          />
        ));
      })}
    </>
  );
};

const geoArt = (w: number, h: number) => {
  const cs = h / 3;
  const cols = Math.ceil(w / cs) + 1;
  const sq = cs * 0.32;
  const out: React.ReactNode[] = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * cs + cs / 2;
      const cy = r * cs + cs / 2;
      out.push(
        <G key={`${r}-${c}`}>
          <Rect x={cx - sq} y={cy - sq} width={sq * 2} height={sq * 2} fill="none" stroke="#5A4114" strokeOpacity={0.35} strokeWidth={1} />
          <G rotation={45} origin={`${cx}, ${cy}`}>
            <Rect x={cx - sq} y={cy - sq} width={sq * 2} height={sq * 2} fill="none" stroke="#5A4114" strokeOpacity={0.35} strokeWidth={1} />
          </G>
          <Circle cx={cx} cy={cy} r={sq * 0.25} fill="#5A4114" opacity={0.3} />
        </G>
      );
    }
  }
  return <>{out}</>;
};

const rainbowArchesArt = (w: number, h: number) => {
  const fills = ['#7C83FD', '#F2C879', '#9BE7C4', '#F59DC8'];
  return (
    <>
      {fills.map((f, i) => (
        <Path key={i} d={archPath(w * (0.06 + i * 0.22), h * 1.05, w * 0.3, true)} fill={f} opacity={0.5} />
      ))}
    </>
  );
};

const wheatArt = (w: number, h: number) => {
  const stalks = [
    { x: w * 0.5, t: 10 },
    { x: w * 0.62, t: -8 },
    { x: w * 0.74, t: 6 },
    { x: w * 0.86, t: -4 },
  ];
  return (
    <>
      {stalks.map((st, k) => {
        const tx = st.x + st.t;
        return (
          <G key={k}>
            <Path d={`M ${st.x} ${h * 1.05} Q ${st.x + st.t * 0.3} ${h * 0.6} ${tx} ${h * 0.3}`} stroke="#8A6A2B" strokeOpacity={0.7} strokeWidth={1.6} fill="none" />
            {Array.from({ length: 6 }).map((_, i) => {
              const ey = h * 0.32 - i * h * 0.05;
              return (
                <G key={i}>
                  <Ellipse cx={tx - 4} cy={ey} rx={3} ry={7} fill="#8A6A2B" opacity={0.65} rotation={-30} origin={`${tx - 4}, ${ey}`} />
                  <Ellipse cx={tx + 4} cy={ey} rx={3} ry={7} fill="#8A6A2B" opacity={0.65} rotation={30} origin={`${tx + 4}, ${ey}`} />
                </G>
              );
            })}
          </G>
        );
      })}
    </>
  );
};

const swirlArt = (w: number, h: number) => (
  <>
    {Array.from({ length: 9 }).map((_, i) => (
      <Circle key={`a${i}`} cx={w * 0.05} cy={h * 1.15} r={h * (0.25 + i * 0.18)} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1.2} />
    ))}
    {Array.from({ length: 7 }).map((_, i) => (
      <Circle key={`b${i}`} cx={w * 0.95} cy={-h * 0.1} r={h * (0.3 + i * 0.2)} fill="none" stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={1.2} />
    ))}
  </>
);

export const DESIGNS: CardDesign[] = [
  { key: 'black', name: 'Qora', colors: ['#050505', '#161616'], fg: '#FFFFFF', accent: '#6B7280', art: blackArt },
  { key: 'mandala', name: 'Mandala', colors: ['#3A0A10', '#A11D25'], fg: '#FFFFFF', accent: '#E04B55', art: mandalaArt },
  { key: 'peacock', name: 'Feruza', colors: ['#08143A', '#1A55D6'], fg: '#FFFFFF', accent: '#2F7BFF', art: peacockArt },
  { key: 'goldwaves', name: "Oltin to'lqin", colors: ['#050505', '#1A1408'], fg: '#F3E3B3', accent: '#C9A24B', art: goldWavesArt },
  { key: 'ikat', name: 'Ikat', colors: ['#24094A', '#6A2FB8'], fg: '#FFFFFF', accent: '#9B6CFF', art: ikatArt },
  { key: 'pearls', name: 'Marvarid', colors: ['#060606', '#1A1A1A'], fg: '#FFFFFF', accent: '#9CA3AF', art: pearlsArt },
  { key: 'flame', name: 'Alanga', colors: ['#2A0830', '#D04A86'], fg: '#FFFFFF', accent: '#F06AA6', art: flameArt },
  { key: 'arches', name: "Ko'k arklar", colors: ['#0A1A52', '#7B67D8'], fg: '#FFFFFF', accent: '#7B8CFF', art: archesArt },
  { key: 'geo', name: 'Oltin naqsh', colors: ['#EAD9A8', '#B8964F'], fg: '#3B2A0A', accent: '#D6B25E', art: geoArt },
  { key: 'rainbow', name: 'Rangli arklar', colors: ['#C7D2FA', '#F1C7E3'], fg: '#1E2A4A', accent: '#8F9BFF', art: rainbowArchesArt },
  { key: 'wheat', name: "Bug'doy", colors: ['#EFE3C0', '#C9A862'], fg: '#3B2A0A', accent: '#D2AE5C', art: wheatArt },
  { key: 'swirl', name: 'Girdob', colors: ['#0B49D1', '#78C0FF'], fg: '#FFFFFF', accent: '#4DA3FF', art: swirlArt },
];

/* ------------------------------------------------------------------ */
/*  Karta yuzi                                                          */
/* ------------------------------------------------------------------ */

export function CardFace({
  design,
  width,
  number,
  holder,
}: {
  design: CardDesign;
  width: number;
  number?: number;
  holder?: string;
}) {
  const height = width / 1.586;
  const fg = design.fg;
  const grouped = number ? String(number).replace(/(\d{4})(?=\d)/g, '$1 ') : '•••• •••• •••• ••••';
  const gid = `bg-${design.key}`;

  return (
    <View style={[s.card, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={design.colors[0]} />
            <Stop offset="1" stopColor={design.colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${gid})`} />
        {design.art(width, height)}
      </Svg>

      <View style={s.top}>
        <Text style={[s.brand, { color: fg }]}>jamgarma</Text>
        <Text style={[s.logo, { color: fg }]}>iCard</Text>
      </View>

      <View style={s.chip}>
        <View style={s.chipLine} />
        <View style={[s.chipLine, { top: 13 }]} />
      </View>

      <View style={s.bottom}>
        <Text style={[s.number, { color: fg, fontSize: Math.max(14, width * 0.05) }]} numberOfLines={1} adjustsFontSizeToFit>
          {grouped}
        </Text>
        {holder ? (
          <Text style={[s.holder, { color: fg }]} numberOfLines={1}>
            {holder.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  top: {
    position: 'absolute',
    top: 16,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2, opacity: 0.9 },
  logo: { fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  chip: {
    position: 'absolute',
    left: 18,
    top: '38%',
    width: 36,
    height: 27,
    borderRadius: 6,
    backgroundColor: '#D9B65A',
    opacity: 0.92,
    overflow: 'hidden',
  },
  chipLine: { position: 'absolute', left: 0, right: 0, top: 6, height: 1, backgroundColor: 'rgba(60,40,0,0.35)' },
  bottom: { position: 'absolute', left: 18, right: 18, bottom: 16 },
  number: { fontWeight: '700', letterSpacing: 1.6 },
  holder: { marginTop: 6, fontSize: 11, fontWeight: '600', letterSpacing: 1, opacity: 0.85 },
});