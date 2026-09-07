import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Data ─────────────────────────────────────────────────────────────────────

const WORD_DIGIT_PAIRS = [
  { word: "négyezer-hétszázharminckettő", num: 4732 },
  { word: "nyolcezer-ötvenkilenc", num: 8059 },
  { word: "hétezer-kilencszáztizennégy", num: 7914 },
  { word: "hétezer-kétszáznegyvenhárom", num: 7243 },
  { word: "nyolcezer-tizenegy", num: 8011 },
  { word: "négyezer-nyolcszázötvenkilenc", num: 4859 },
  { word: "kilencezer-kétszázötvenhét", num: 9257 },
  { word: "hétezer-nyolcvankilenc", num: 7089 },
  { word: "ötezer-hétszáztizennégy", num: 5714 },
  { word: "háromezer-nyolcszázhatvan", num: 3860 },
];

const ROUNDING_DATA = [
  { num: 3487, rounded: 3500 },
  { num: 5124, rounded: 5100 },
  { num: 7968, rounded: 8000 },
  { num: 2748, rounded: 2700 },
  { num: 6512, rounded: 6500 },
  { num: 8396, rounded: 8400 },
  { num: 3478, rounded: 3500 },
  { num: 5896, rounded: 5900 },
  { num: 8421, rounded: 8400 },
];

const SEQ1_DATA = [
  { start: 1250, diff: 50 },
  { start: 1400, diff: 50 },
  { start: 2000, diff: 100 },
  { start: 3100, diff: 25 },
];

const SEQ2_DATA = [
  { start: 8400, diff: -200 },
  { start: 9600, diff: -300 },
  { start: 7800, diff: -200 },
  { start: 6500, diff: -150 },
];

const TF_STATEMENTS = [
  { text: "Két páratlan szám összege mindig páros.", answer: true },
  { text: "A kivonás eredménye mindig kisebb, mint a kisebbítendő.", answer: true },
  { text: "Két szám szorzata mindig nagyobb mindkét tényezőnél.", answer: false },
  { text: "Két páros szám összege mindig páros.", answer: true },
  { text: "Ha egy számot 100-zal növelek, a százasokra kerekített értéke biztosan nő.", answer: false },
  { text: "Két páratlan szám szorzata mindig páratlan.", answer: true },
  { text: "Ha egy számot 100-zal növelek, a százasokra kerekített értéke mindig változik.", answer: false },
  { text: "Minden négyzet téglalap is egyben.", answer: true },
];

const STORY_PROBLEMS = [
  {
    total: 9840,
    items: [{ name: "könyvet", price: 2750 }, { name: "tollkészletet", price: 1280 }, { name: "füzetet", price: 690 }],
    correct: 5120,
  },
  {
    total: 9900,
    items: [{ name: "táskát", price: 4850 }, { name: "sálat", price: 1290 }, { name: "sapkát", price: 760 }],
    correct: 3000,
  },
  {
    total: 10000,
    items: [{ name: "cipőt", price: 4850 }, { name: "nadrágot", price: 3290 }, { name: "zoknit", price: 760 }],
    correct: 1100,
  },
  {
    total: 8500,
    items: [{ name: "könyvet", price: 2340 }, { name: "füzetet", price: 1560 }, { name: "tollat", price: 890 }],
    correct: 3710,
  },
  {
    total: 9200,
    items: [{ name: "játékot", price: 3120 }, { name: "könyvet", price: 890 }, { name: "festéket", price: 1450 }],
    correct: 3740,
  },
];

const OPERATIONS = [
  { display: "347 + 286 = ?", correct: 633, range: 100 },
  { display: "9 000 − 4 578 = ?", correct: 4422, range: 500 },
  { display: "248 × 3 = ?", correct: 744, range: 150 },
  { display: "936 ÷ 4 = ?", correct: 234, range: 80 },
];

const EQUATIONS = [
  { display: "4 800 + □ = 6 500", correct: 1700, hint: "6 500 – 4 800 = ?" },
  { display: "□ − 1 700 = 2 900", correct: 4600, hint: "2 900 + 1 700 = ?" },
  { display: "6 × □ = 2 400", correct: 400, hint: "2 400 ÷ 6 = ?" },
  { display: "8 400 ÷ □ = 700", correct: 12, hint: "8 400 ÷ 700 = ?" },
  { display: "□ + 3 750 = 9 000", correct: 5250, hint: "9 000 – 3 750 = ?" },
  { display: "9 × □ = 5 400", correct: 600, hint: "5 400 ÷ 9 = ?" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateOptions(correct: number, count = 4, range = 400): number[] {
  const opts = new Set<number>([correct]);
  let att = 0;
  while (opts.size < count && att < 120) {
    const candidate = correct + rand(-range, range);
    if (candidate > 0 && candidate !== correct) opts.add(candidate);
    att++;
  }
  return shuffle([...opts]);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

type FeedbackState = "idle" | "correct" | "wrong";

function Feedback({ state, correctVal }: { state: FeedbackState; correctVal?: string | number }) {
  if (state === "idle") return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 text-center font-bold rounded-xl px-4 py-2 text-sm ${
        state === "correct"
          ? "bg-green-100 text-green-800 border-2 border-green-300"
          : "bg-red-100 text-red-800 border-2 border-red-300"
      }`}
    >
      {state === "correct" ? "✅ Helyes! Ügyes vagy!" : `❌ Nem jó. Helyes válasz: ${correctVal}`}
    </motion.div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 p-4 rounded-2xl bg-yellow-50 border-2 border-yellow-200">
      <p className="text-gray-700 text-sm leading-relaxed"><strong>💡 Tipp:</strong> {children}</p>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function RefreshBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all"
    >
      🔄 Új feladat
    </button>
  );
}

interface PickerProps {
  options: number[];
  correct: number;
  resetKey: number;
  onAnswer: (val: number) => void;
}

function NumberPicker({ options, correct, resetKey, onAnswer }: PickerProps) {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => { setSelected(null); }, [resetKey]);

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-3">
      {options.map((opt) => {
        const isCorrect = opt === correct;
        const isSelected = selected === opt;
        const answered = selected !== null;
        return (
          <button
            key={opt}
            onClick={() => { if (!answered) { setSelected(opt); onAnswer(opt); } }}
            className={`
              min-w-[60px] px-4 py-2 rounded-xl font-bold text-base border-2 transition-all
              ${!answered ? "bg-white border-indigo-400 hover:bg-indigo-50 hover:scale-105 cursor-pointer" : "cursor-default"}
              ${answered && isCorrect ? "bg-green-500 border-green-600 text-white" : ""}
              ${answered && isSelected && !isCorrect ? "bg-red-400 border-red-500 text-white" : ""}
              ${answered && !isSelected && !isCorrect ? "bg-gray-100 border-gray-200 text-gray-400" : ""}
            `}
          >
            {opt.toLocaleString("hu-HU")}
          </button>
        );
      })}
    </div>
  );
}

// ─── Tab 1: Számok írása ─────────────────────────────────────────────────────

function NumbersTab() {
  const [w2dIdx, setW2dIdx] = useState(() => rand(0, WORD_DIGIT_PAIRS.length - 1));
  const [d2wIdx, setD2wIdx] = useState(() => rand(0, WORD_DIGIT_PAIRS.length - 1));
  const [w2dKey, setW2dKey] = useState(0);
  const [d2wKey, setD2wKey] = useState(0);
  const [w2dFb, setW2dFb] = useState<FeedbackState>("idle");
  const [d2wFb, setD2wFb] = useState<FeedbackState>("idle");
  const [d2wSelected, setD2wSelected] = useState<string | null>(null);

  const w2d = WORD_DIGIT_PAIRS[w2dIdx];
  const d2w = WORD_DIGIT_PAIRS[d2wIdx];

  const w2dOptions = useMemo(() => generateOptions(w2d.num, 4, 300), [w2dKey]);
  const d2wOptions = useMemo(() => {
    const opts = new Set<string>([d2w.word]);
    let att = 0;
    while (opts.size < 4 && att < 50) {
      opts.add(WORD_DIGIT_PAIRS[rand(0, WORD_DIGIT_PAIRS.length - 1)].word);
      att++;
    }
    return shuffle([...opts]);
  }, [d2wKey]);

  return (
    <div>
      <h2 className="text-xl font-black text-purple-700 mb-4">🔢 Számok írása számjegyekkel és betűkkel</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-indigo-700 mb-3">📝 Írd le számjegyekkel!</h3>
          <div className="text-lg font-semibold text-center bg-white rounded-xl p-3 border border-indigo-200 leading-relaxed">
            {w2d.word}
          </div>
          <NumberPicker
            options={w2dOptions}
            correct={w2d.num}
            resetKey={w2dKey}
            onAnswer={(v) => setW2dFb(v === w2d.num ? "correct" : "wrong")}
          />
          <Feedback state={w2dFb} correctVal={w2d.num.toLocaleString("hu-HU")} />
          <RefreshBtn onClick={() => { setW2dIdx(rand(0, WORD_DIGIT_PAIRS.length - 1)); setW2dKey(k => k + 1); setW2dFb("idle"); }} />
        </Card>

        <Card>
          <h3 className="font-bold text-indigo-700 mb-3">✏️ Írd le betűkkel!</h3>
          <div className="text-3xl font-black text-center bg-white rounded-xl p-3 border border-indigo-200">
            {d2w.num.toLocaleString("hu-HU")}
          </div>
          <div className="flex flex-col gap-2 mt-3">
            {d2wOptions.map((opt) => {
              const isCorrect = opt === d2w.word;
              const isSelected = d2wSelected === opt;
              const answered = d2wSelected !== null;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    if (answered) return;
                    setD2wSelected(opt);
                    setD2wFb(isCorrect ? "correct" : "wrong");
                  }}
                  className={`
                    px-4 py-2 rounded-xl font-semibold text-sm border-2 transition-all text-left
                    ${!answered ? "bg-white border-indigo-300 hover:bg-indigo-50 cursor-pointer" : "cursor-default"}
                    ${answered && isCorrect ? "bg-green-500 border-green-600 text-white" : ""}
                    ${answered && isSelected && !isCorrect ? "bg-red-400 border-red-500 text-white" : ""}
                    ${answered && !isSelected && !isCorrect ? "bg-gray-100 border-gray-200 text-gray-400" : ""}
                  `}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <Feedback state={d2wFb} correctVal={d2w.word} />
          <RefreshBtn onClick={() => { setD2wIdx(rand(0, WORD_DIGIT_PAIRS.length - 1)); setD2wKey(k => k + 1); setD2wFb("idle"); setD2wSelected(null); }} />
        </Card>
      </div>
      <TipBox>A számok írásánál figyelj a helyiértékekre! Ha betűkkel írsz, a „‑" kötőjelet használd az ezres után (pl. háromezer‑ötszáz). A tízes+egyes rész összevonódhat: huszonhárom, negyvenöt.</TipBox>
    </div>
  );
}

// ─── Tab 2: Kerekítés ─────────────────────────────────────────────────────────

function RoundingTab() {
  const [idx, setIdx] = useState(() => rand(0, ROUNDING_DATA.length - 1));
  const [key, setKey] = useState(0);
  const [fb, setFb] = useState<FeedbackState>("idle");
  const [sliderVal, setSliderVal] = useState(3487);

  const item = ROUNDING_DATA[idx];
  const sliderRounded = Math.round(sliderVal / 100) * 100;

  const options = useMemo(() => {
    const correct = item.rounded;
    const base = Math.floor(correct / 100) * 100;
    const opts = new Set<number>([correct]);
    let att = 0;
    while (opts.size < 4 && att < 40) {
      const candidate = base + rand(-3, 3) * 100;
      if (candidate >= 0 && candidate <= 10000 && candidate !== correct) opts.add(candidate);
      att++;
    }
    return shuffle([...opts]);
  }, [key]);

  const barMax = 10000;
  const barH = (v: number) => Math.round((v / barMax) * 140);

  return (
    <div>
      <h2 className="text-xl font-black text-purple-700 mb-4">🎯 Kerekítés százasokra</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-indigo-700 mb-3">Kerekítsd százasokra!</h3>
          <div className="text-4xl font-black text-center bg-white rounded-xl p-4 border border-indigo-200">
            {item.num.toLocaleString("hu-HU")}
          </div>
          <NumberPicker
            options={options}
            correct={item.rounded}
            resetKey={key}
            onAnswer={(v) => setFb(v === item.rounded ? "correct" : "wrong")}
          />
          <Feedback state={fb} correctVal={item.rounded.toLocaleString("hu-HU")} />
          <RefreshBtn onClick={() => { setIdx(rand(0, ROUNDING_DATA.length - 1)); setKey(k => k + 1); setFb("idle"); }} />
        </Card>

        <Card>
          <h3 className="font-bold text-indigo-700 mb-3">📊 Szám a százasok között</h3>
          <div className="flex items-end justify-center gap-8 h-40 mb-2">
            {[{ label: "Eredeti", val: sliderVal, color: "#6366f1" }, { label: "Kerekítve", val: sliderRounded, color: "#7c3aed" }].map(({ label, val, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="text-xs font-bold" style={{ color }}>{val.toLocaleString("hu-HU")}</div>
                <div
                  className="w-14 rounded-t-xl transition-all duration-300"
                  style={{ height: barH(val), backgroundColor: color + "cc", border: `2px solid ${color}` }}
                />
                <div className="text-xs text-gray-500 font-semibold">{label}</div>
              </div>
            ))}
          </div>
          <input
            type="range" min="1000" max="9999" value={sliderVal}
            onChange={(e) => setSliderVal(Number(e.target.value))}
            className="w-full accent-indigo-600 mt-1"
          />
          <div className="flex justify-between text-sm mt-1 text-gray-600">
            <span>{sliderVal.toLocaleString("hu-HU")}</span>
            <span className="font-bold text-purple-700">→ {sliderRounded.toLocaleString("hu-HU")}</span>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">Húzd a csúszkát és figyeld a kerekítést!</p>
        </Card>
      </div>
      <TipBox>Ha a szám utolsó két számjegye 50 vagy annál nagyobb, felfelé kerekítünk (pl. 3 487 → 3 500). Ha kisebb, lefelé (pl. 3 420 → 3 400).</TipBox>
    </div>
  );
}

// ─── Tab 3: Nyitott mondatok ──────────────────────────────────────────────────

function EquationsTab() {
  const [picked, setPicked] = useState<(number | null)[]>(() => Array(3).fill(null));
  const [keys, setKeys] = useState([0, 0, 0]);
  const [idxs] = useState(() => [
    rand(0, EQUATIONS.length - 1),
    rand(0, EQUATIONS.length - 1),
    rand(0, EQUATIONS.length - 1),
  ]);

  const eqs = idxs.map(i => EQUATIONS[i]);

  const optionsList = useMemo(() =>
    eqs.map(eq => generateOptions(eq.correct, 4, Math.max(100, Math.round(eq.correct * 0.4)))),
    [keys]
  );

  const reset = (i: number) => {
    setPicked(p => { const n = [...p]; n[i] = null; return n; });
    setKeys(k => { const n = [...k]; n[i]++; return n; });
  };

  return (
    <div>
      <h2 className="text-xl font-black text-purple-700 mb-4">🧩 Nyitott mondatok – tedd igazzá!</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {eqs.map((eq, i) => {
          const ans = picked[i];
          const fb: FeedbackState = ans === null ? "idle" : ans === eq.correct ? "correct" : "wrong";
          return (
            <Card key={i} className="text-center">
              <div className="text-xl font-black mb-3 text-gray-800">
                {eq.display.split("□").map((part, j) => (
                  <span key={j}>
                    {part}
                    {j < eq.display.split("□").length - 1 && (
                      <span className="text-purple-600 text-2xl">□</span>
                    )}
                  </span>
                ))}
              </div>
              <NumberPicker
                options={optionsList[i]}
                correct={eq.correct}
                resetKey={keys[i]}
                onAnswer={(v) => setPicked(p => { const n = [...p]; n[i] = v; return n; })}
              />
              <Feedback state={fb} correctVal={eq.correct.toLocaleString("hu-HU")} />
              {fb !== "idle" && (
                <p className="text-xs text-gray-500 mt-2 font-medium">Tipp: {eq.hint}</p>
              )}
              <RefreshBtn onClick={() => reset(i)} />
            </Card>
          );
        })}
      </div>
      <TipBox>Ha hiányzik egy tag az összeadásnál, kivonással pótold. Ha a kivonandó hiányzik, add össze a másik két számot. Szorzásnál ossz el — és fordítva!</TipBox>
    </div>
  );
}

// ─── Tab 4: Sorozatok ─────────────────────────────────────────────────────────

function SequencesTab() {
  const [s1Idx, setS1Idx] = useState(() => rand(0, SEQ1_DATA.length - 1));
  const [s2Idx, setS2Idx] = useState(() => rand(0, SEQ2_DATA.length - 1));
  const [s1Key, setS1Key] = useState(0);
  const [s2Key, setS2Key] = useState(0);
  const [s1Fb, setS1Fb] = useState<FeedbackState>("idle");
  const [s2Fb, setS2Fb] = useState<FeedbackState>("idle");

  const s1 = SEQ1_DATA[s1Idx];
  const s2 = SEQ2_DATA[s2Idx];

  const s1Terms = Array.from({ length: 4 }, (_, i) => s1.start + i * s1.diff);
  const s2Terms = Array.from({ length: 4 }, (_, i) => s2.start + i * s2.diff);
  const s1Next = s1Terms[3] + s1.diff;
  const s2Next = s2Terms[3] + s2.diff;

  const s1Opts = useMemo(() => generateOptions(s1Next, 4, Math.abs(s1.diff) * 3), [s1Key]);
  const s2Opts = useMemo(() => generateOptions(s2Next, 4, Math.abs(s2.diff) * 3), [s2Key]);

  return (
    <div>
      <h2 className="text-xl font-black text-purple-700 mb-4">📈 Sorozatok – mi jön ezután?</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-indigo-700 mb-2">1. sorozat</h3>
          <div className="text-xl font-mono font-bold text-center bg-white rounded-xl p-3 border border-indigo-200">
            {s1Terms.join(", ")}, <span className="text-purple-500">?</span>
          </div>
          <NumberPicker options={s1Opts} correct={s1Next} resetKey={s1Key}
            onAnswer={(v) => setS1Fb(v === s1Next ? "correct" : "wrong")} />
          <Feedback state={s1Fb} correctVal={s1Next.toLocaleString("hu-HU")} />
          {s1Fb !== "idle" && (
            <p className="text-xs text-gray-500 mt-2 text-center">A lépés: {s1.diff > 0 ? "+" : ""}{s1.diff}</p>
          )}
          <RefreshBtn onClick={() => { setS1Idx(rand(0, SEQ1_DATA.length - 1)); setS1Key(k => k + 1); setS1Fb("idle"); }} />
        </Card>

        <Card>
          <h3 className="font-bold text-indigo-700 mb-2">2. sorozat</h3>
          <div className="text-xl font-mono font-bold text-center bg-white rounded-xl p-3 border border-indigo-200">
            {s2Terms.join(", ")}, <span className="text-purple-500">?</span>
          </div>
          <NumberPicker options={s2Opts} correct={s2Next} resetKey={s2Key}
            onAnswer={(v) => setS2Fb(v === s2Next ? "correct" : "wrong")} />
          <Feedback state={s2Fb} correctVal={s2Next.toLocaleString("hu-HU")} />
          {s2Fb !== "idle" && (
            <p className="text-xs text-gray-500 mt-2 text-center">A lépés: {s2.diff > 0 ? "+" : ""}{s2.diff}</p>
          )}
          <RefreshBtn onClick={() => { setS2Idx(rand(0, SEQ2_DATA.length - 1)); setS2Key(k => k + 1); setS2Fb("idle"); }} />
        </Card>
      </div>
      <TipBox>Figyeld a különbséget a számok között! Ha mindig ugyanannyit adsz hozzá / vonsz ki, az a sorozat differenciája. Ezt alkalmazd az utolsó tagra a következő kiszámításához.</TipBox>
    </div>
  );
}

// ─── Tab 5: Számolj! ──────────────────────────────────────────────────────────

function OperationsTab() {
  const [keys, setKeys] = useState([0, 0, 0, 0]);
  const [feedbacks, setFeedbacks] = useState<FeedbackState[]>(["idle", "idle", "idle", "idle"]);

  const optionsList = useMemo(() =>
    OPERATIONS.map(op => generateOptions(op.correct, 4, op.range)),
    [keys]
  );

  return (
    <div>
      <h2 className="text-xl font-black text-purple-700 mb-4">🧮 Számolj! – Írásbeli műveletek</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {OPERATIONS.map((op, i) => (
          <Card key={i} className="text-center">
            <div className="text-2xl font-black mb-1 text-gray-800">{op.display}</div>
            <NumberPicker
              options={optionsList[i]}
              correct={op.correct}
              resetKey={keys[i]}
              onAnswer={(v) => setFeedbacks(f => { const n = [...f] as FeedbackState[]; n[i] = v === op.correct ? "correct" : "wrong"; return n; })}
            />
            <Feedback state={feedbacks[i]} correctVal={op.correct.toLocaleString("hu-HU")} />
          </Card>
        ))}
      </div>
      <TipBox>Írásbeli összeadásnál ügyelj a helyiértékekre! Kivonásnál ha a felső szám kisebb, „kölcsönkérsz". Szorzásnál a szorzótábla segít, osztásnál a szorzás fordítottja.</TipBox>
    </div>
  );
}

// ─── Tab 6: Igaz / Hamis ─────────────────────────────────────────────────────

function TrueFalseTab() {
  const [idx, setIdx] = useState(() => rand(0, TF_STATEMENTS.length - 1));
  const [answered, setAnswered] = useState(false);
  const [fb, setFb] = useState<FeedbackState>("idle");
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);

  const stmt = TF_STATEMENTS[idx];

  const check = (answer: boolean) => {
    if (answered) return;
    setAnswered(true);
    if (answer === stmt.answer) {
      setFb("correct");
      setCorrect(c => c + 1);
    } else {
      setFb("wrong");
      setWrong(w => w + 1);
    }
  };

  const next = () => {
    setIdx(rand(0, TF_STATEMENTS.length - 1));
    setAnswered(false);
    setFb("idle");
  };

  return (
    <div>
      <h2 className="text-xl font-black text-purple-700 mb-4">✅ Igaz vagy hamis?</h2>
      <div className="max-w-xl mx-auto">
        <Card>
          <div className="text-lg font-semibold text-center bg-white rounded-xl p-4 border border-purple-200 mb-5 leading-relaxed min-h-[80px] flex items-center justify-center">
            {stmt.text}
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => check(true)}
              disabled={answered}
              className={`px-8 py-3 rounded-full font-black text-lg transition-all active:scale-95
                ${answered ? "opacity-60 cursor-default" : "hover:scale-105 cursor-pointer"}
                bg-green-500 hover:bg-green-600 text-white shadow-lg`}
            >
              ✅ Igaz
            </button>
            <button
              onClick={() => check(false)}
              disabled={answered}
              className={`px-8 py-3 rounded-full font-black text-lg transition-all active:scale-95
                ${answered ? "opacity-60 cursor-default" : "hover:scale-105 cursor-pointer"}
                bg-red-500 hover:bg-red-600 text-white shadow-lg`}
            >
              ❌ Hamis
            </button>
          </div>
          <AnimatePresence>
            {fb !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 text-center font-bold rounded-xl px-4 py-3 text-base ${
                  fb === "correct"
                    ? "bg-green-100 text-green-800 border-2 border-green-300"
                    : "bg-red-100 text-red-800 border-2 border-red-300"
                }`}
              >
                {fb === "correct" ? "✅ Helyes! Nagyon ügyes vagy!" : `❌ Hmm, a helyes válasz: ${stmt.answer ? "Igaz" : "Hamis"}`}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex justify-between items-center mt-5">
            <div className="text-sm text-gray-500">
              ✅ Helyes: <strong className="text-green-600">{correct}</strong> &nbsp;|&nbsp; ❌ Hibás: <strong className="text-red-500">{wrong}</strong>
            </div>
            <button
              onClick={next}
              className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 transition"
            >
              🔄 Következő
            </button>
          </div>
        </Card>
      </div>
      <TipBox>Gondold végig, az állítás MINDIG igaz-e! Ha találsz egyetlen ellenpéldát, az állítás hamis. Pl. ha a szorzat lehet kisebb is (1 × 0,5), akkor nem mindig igaz.</TipBox>
    </div>
  );
}

// ─── Tab 7: Szöveges feladatok ────────────────────────────────────────────────

function StoryTab() {
  const [idx, setIdx] = useState(() => rand(0, STORY_PROBLEMS.length - 1));
  const [key, setKey] = useState(0);
  const [fb, setFb] = useState<FeedbackState>("idle");

  const prob = STORY_PROBLEMS[idx];
  const options = useMemo(() => generateOptions(prob.correct, 4, 600), [key]);

  const next = () => {
    setIdx(rand(0, STORY_PROBLEMS.length - 1));
    setKey(k => k + 1);
    setFb("idle");
  };

  return (
    <div>
      <h2 className="text-xl font-black text-purple-700 mb-4">📖 Szöveges feladatok</h2>
      <div className="max-w-xl mx-auto">
        <Card>
          <div className="text-base leading-relaxed mb-5 text-gray-800">
            Egy boltba <strong className="text-indigo-700">{prob.total.toLocaleString("hu-HU")} Ft-ot</strong> vittek.
            Vásároltak:{" "}
            {prob.items.map((item, i) => (
              <span key={i}>
                {i > 0 && ", "}
                <strong>{item.name}</strong> {item.price.toLocaleString("hu-HU")} Ft-ért
              </span>
            ))}.
            <br /><br />
            <strong className="text-purple-700 text-lg">Mennyi pénz maradt?</strong>
          </div>
          <NumberPicker options={options} correct={prob.correct} resetKey={key}
            onAnswer={(v) => setFb(v === prob.correct ? "correct" : "wrong")} />
          <Feedback state={fb} correctVal={prob.correct.toLocaleString("hu-HU")} />
          {fb !== "idle" && (
            <div className="mt-3 text-sm text-gray-600 text-center">
              {prob.total.toLocaleString("hu-HU")} −{" "}
              {prob.items.map(i => i.price.toLocaleString("hu-HU")).join(" − ")} = <strong>{prob.correct.toLocaleString("hu-HU")} Ft</strong>
            </div>
          )}
          <RefreshBtn onClick={next} />
        </Card>
      </div>
      <TipBox>Olvasd el figyelmesen a feladatot! Írd fel, mi az összeg (amennyi pénzt vittek), majd vond ki belőle sorban a költéseket. A maradék a válasz.</TipBox>
    </div>
  );
}

// ─── Tab 8: Geometria ─────────────────────────────────────────────────────────

function GeoTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [geoFb, setGeoFb] = useState("Kattints 4 pontot a vászonra, hogy négyszöget alkoss!");
  const [shapeFb, setShapeFb] = useState<string | null>(null);
  const [shapeFbType, setShapeFbType] = useState<"correct" | "wrong" | null>(null);

  const drawCanvas = useCallback((pts: { x: number; y: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    if (pts.length === 4) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = "rgba(99,102,241,0.15)";
      ctx.fill();
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Points
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#6366f1";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), p.x, p.y);
    });
  }, []);

  useEffect(() => { drawCanvas(points); }, [points, drawCanvas]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (points.length >= 4) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const newPts = [...points, { x, y }];
    setPoints(newPts);
    if (newPts.length === 4) {
      const hasRight = checkRightAngle(newPts);
      setGeoFb(hasRight
        ? "🎉 Van derékszög! Ügyes vagy!"
        : "🤔 Nincs derékszög. Próbálj meg jobban koordinálni az oldalakat!");
    } else {
      setGeoFb(`Még ${4 - newPts.length} pontot kattints!`);
    }
  };

  const clear = () => {
    setPoints([]);
    setGeoFb("Kattints 4 pontot a vászonra, hogy négyszöget alkoss!");
  };

  const showExample = () => {
    const pts = [{ x: 80, y: 200 }, { x: 80, y: 80 }, { x: 280, y: 80 }, { x: 320, y: 200 }];
    setPoints(pts);
    setGeoFb("📐 Példa: ennek a négyszögnek van derékszöge (bal felső sarokban)!");
  };

  const checkGeoShape = (shape: string) => {
    const correctShapes = ["negyzet", "rombusz"];
    if (correctShapes.includes(shape)) {
      setShapeFb(`✅ Igen, a ${shape === "negyzet" ? "négyzet" : "rombusz"}nak lehet 4 egyenlő oldala!`);
      setShapeFbType("correct");
    } else {
      const name = shape === "teglalap" ? "téglalap" : "paralelogramma";
      setShapeFb(`❌ A ${name}nak nem feltétlenül van 4 egyenlő oldala. A négyzet és a rombusz az!`);
      setShapeFbType("wrong");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-black text-purple-700 mb-4">📐 Geometria – Sokszögek felfedezése</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-indigo-700 mb-3">🎨 Rajzolj derékszögű négyszöget!</h3>
          <canvas
            ref={canvasRef}
            width={400} height={260}
            onClick={handleCanvasClick}
            className="w-full border border-gray-300 rounded-xl bg-white cursor-crosshair"
            style={{ touchAction: "none" }}
          />
          <div className="flex gap-2 mt-2 justify-center">
            <button onClick={clear} className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold hover:bg-green-700">🧹 Törlés</button>
            <button onClick={showExample} className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold hover:bg-indigo-700">📐 Példa</button>
          </div>
          <p className={`text-sm text-center mt-2 font-semibold ${geoFb.startsWith("🎉") ? "text-green-700" : geoFb.startsWith("🤔") ? "text-red-600" : "text-gray-600"}`}>
            {geoFb}
          </p>
        </Card>

        <Card>
          <h3 className="font-bold text-indigo-700 mb-3">❓ Melyik alakzatnak lehet 4 egyenlő oldala?</h3>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {[{ id: "negyzet", label: "Négyzet" }, { id: "teglalap", label: "Téglalap" }, { id: "rombusz", label: "Rombusz" }, { id: "paralelogramma", label: "Paralelogramma" }].map(s => (
              <button key={s.id} onClick={() => checkGeoShape(s.id)}
                className="bg-white border-2 border-purple-400 rounded-xl px-5 py-3 font-bold hover:bg-purple-100 transition active:scale-95">
                {s.label}
              </button>
            ))}
          </div>
          {shapeFb && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 text-center font-bold rounded-xl px-4 py-3 text-sm ${
                shapeFbType === "correct"
                  ? "bg-green-100 text-green-800 border-2 border-green-300"
                  : "bg-red-100 text-red-800 border-2 border-red-300"
              }`}
            >
              {shapeFb}
            </motion.div>
          )}
        </Card>
      </div>
      <TipBox>A négyszög 4 oldallal és 4 csúccsal rendelkező sokszög. A derékszög = 90°. A négyzetnek és a rombusznak egyaránt lehet 4 egyenlő oldala, de a négyzetnek minden szöge derékszög is!</TipBox>
    </div>
  );
}

function checkRightAngle(pts: { x: number; y: number }[]): boolean {
  function angle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag = Math.sqrt((v1.x ** 2 + v1.y ** 2) * (v2.x ** 2 + v2.y ** 2));
    if (mag === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI);
  }
  const angles = [
    angle(pts[3], pts[0], pts[1]),
    angle(pts[0], pts[1], pts[2]),
    angle(pts[1], pts[2], pts[3]),
    angle(pts[2], pts[3], pts[0]),
  ];
  return angles.some(a => Math.abs(a - 90) < 12);
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "numbers",    label: "🔢 Számok írása",   Component: NumbersTab },
  { id: "rounding",  label: "🎯 Kerekítés",       Component: RoundingTab },
  { id: "equations", label: "🧩 Nyitott mondatok", Component: EquationsTab },
  { id: "sequences", label: "📈 Sorozatok",        Component: SequencesTab },
  { id: "operations",label: "🧮 Számolj!",         Component: OperationsTab },
  { id: "truefalse", label: "✅ Igaz/Hamis",       Component: TrueFalseTab },
  { id: "story",     label: "📖 Szöveges",         Component: StoryTab },
  { id: "geo",       label: "📐 Geometria",        Component: GeoTab },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function MathScreen({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState(0);
  const ActiveComponent = TABS[activeTab].Component;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(150deg, #e0e7ff 0%, #fdf4ff 50%, #fce7f3 100%)" }}
    >
      {/* Header */}
      <div className="pt-6 pb-3 px-4 text-center">
        <button
          onClick={onBack}
          className="absolute left-4 top-6 text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1 text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Vissza
        </button>
        <h1 className="text-2xl md:text-4xl font-extrabold text-indigo-700 drop-shadow-sm">
          🧮 4. osztályos matematika felfedező
        </h1>
        <p className="text-indigo-400 text-sm mt-1 font-semibold">Számkör 10 000-ig – játssz, fedezz fel, tanulj!</p>
      </div>

      {/* Tab bar */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2 justify-start md:justify-center min-w-max mx-auto">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              className={`
                px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all
                ${activeTab === i
                  ? "bg-indigo-500 text-white shadow-md"
                  : "bg-white/80 text-indigo-600 border border-indigo-200 hover:bg-indigo-50"}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8">
        <div
          className="max-w-4xl mx-auto rounded-3xl p-5 md:p-8"
          style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", boxShadow: "0 8px 40px rgba(99,102,241,0.12)", border: "1.5px solid rgba(199,210,254,0.7)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="text-center text-indigo-400 text-xs pb-4 font-semibold">
        🧠 4. osztályos matematika – fedezd fel a számok világát!
      </div>
    </div>
  );
}
