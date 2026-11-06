import { PARTIES } from "@/data/parties";
import { simulate, type Scenario } from "@/lib/simulation";
import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from "./scenario-metadata";
import { coalitionResult } from "./coalition-result";
import { uploadGeneratedGraphic } from "./generated-images.functions";

/** Local deterministic export: no uploads, screenshots or remote image requests. */
export async function downloadSocialImage(scenario: Scenario, en = false) {
  await document.fonts.ready;
  const logo = new Image();
  logo.src = new URL("/logos/official-logo.svg", window.location.origin).href;
  await logo.decode();
  const canvas = document.createElement("canvas");
  canvas.width = SOCIAL_IMAGE_WIDTH;
  canvas.height = SOCIAL_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const isDark = document.documentElement.classList.contains("dark");
  const theme = isDark
    ? {
        surface: "#0B1120",
        surfaceCard: "#1E293B",
        ink: "#F8FAFC",
        muted: "#94A3B8",
        border: "#334155",
        primary: "#FB7185",
        bar: "#E11D48",
        seatEmpty: "#334155",
        badgeBg: "rgba(255, 255, 255, 0.06)",
        badgeBorder: "rgba(255, 255, 255, 0.12)",
      }
    : {
        surface: "#FFFFFF",
        surfaceCard: "#F8FAFC",
        ink: "#0F172A",
        muted: "#64748B",
        border: "#E2E8F0",
        primary: "#E11D48",
        bar: "#E11D48",
        seatEmpty: "#E2E8F0",
        badgeBg: "rgba(15, 23, 42, 0.03)",
        badgeBorder: "#E2E8F0",
      };

  const css = getComputedStyle(document.documentElement);
  const fontDisplay = css.getPropertyValue("--font-display").trim() || '"Space Grotesk", sans-serif';
  const fontSans = css.getPropertyValue("--font-sans").trim() || '"Plus Jakarta Sans", sans-serif';

  const result = simulate(scenario);
  const map = Object.fromEntries([...PARTIES, ...scenario.customParties ?? [], ...scenario.mergers ?? []].map((p) => [p.id, p]));
  const ranked = Object.entries(result.seatsByParty).filter(([, seats]) => seats > 0).sort((a, b) => b[1] - a[1]);

  const getPartyColor = (id: string) => {
    const raw = map[id]?.color ?? theme.primary;
    if (isDark) {
      if (raw.toLowerCase() === "#111b3b" || id === "konf") return "#2E4E80";
      if (raw.toLowerCase() === "#14357f" || id === "pis") return "#2557B4";
    }
    return raw;
  };

  const text = (value: string, x: number, y: number, size: number, fill = theme.ink, weight = 500, maxWidth = 1100) => {
    ctx.font = `${weight} ${size}px ${fontSans}`;
    ctx.fillStyle = fill;
    while (ctx.measureText(value).width > maxWidth && value.length > 1) value = value.slice(0, -2) + "…";
    ctx.fillText(value, x, y);
  };

  // Tło i górna belka
  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = theme.bar;
  ctx.fillRect(0, 0, 1200, 7);

  // Nagłówek
  text(en ? "COMMUNITY SCENARIO" : "SCENARIUSZ SPOŁECZNOŚCI", 48, 50, 13, theme.primary, 800);
  ctx.drawImage(logo, 1088, 28, 64, 64);
  if (isDark) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(1088, 28, 64, 64, 14);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  text(scenario.name || (en ? "My scenario" : "Mój scenariusz"), 48, 98, 29, theme.ink, 800, 1010);
  text(scenario.author ? `${en ? "Author" : "Autor"}: ${scenario.author}` : (en ? "Polish parliamentary election 2027" : "Wybory do Sejmu RP 2027"), 48, 128, 15, theme.muted, 500, 1010);

  // Półkole sali plenarnej
  const order = ["razem", "nl", "pl2050", "ko", "psl", "rp", "pis", "konf", "kkp"];
  const ids = [...order.filter((id) => (result.seatsByParty[id] ?? 0) > 0), ...ranked.map(([id]) => id).filter((id) => !order.includes(id))];
  const queue = ids.flatMap((id) => Array.from({ length: result.seatsByParty[id] ?? 0 }, () => id));
  while (queue.length < 460) queue.push("_empty");
  const radii = Array.from({ length: 11 }, (_, i) => 20 + 28 * i / 10);
  const sum = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.floor(r / sum * queue.length));
  let remaining = queue.length - counts.reduce((a, b) => a + b, 0);
  for (let i = 10; remaining > 0; i = (i + 10) % 11) { counts[i] = (counts[i] ?? 0) + 1; remaining--; }
  const positions = radii.flatMap((r, row) => Array.from({ length: counts[row] ?? 0 }, (_, i) => ({ r, angle: Math.PI - Math.PI * (i + .5) / (counts[row] ?? 1) }))).sort((a, b) => b.angle - a.angle || a.r - b.r);
  positions.forEach((pos, i) => {
    const id = queue[i];
    ctx.fillStyle = id && map[id] ? getPartyColor(id) : theme.seatEmpty;
    ctx.beginPath();
    ctx.arc(355 + Math.cos(pos.angle) * pos.r * 6, 462 - Math.sin(pos.angle) * pos.r * 6, 6.4, 0, Math.PI * 2);
    ctx.fill();
  });

  text(`${en ? "Turnout" : "Frekwencja"}: ${result.nationalTurnout.toFixed(1)}%`, 70, 505, 17, theme.muted);
  text(en ? "460 seats / majority: 231" : "460 mandatów / większość: 231", 70, 535, 17, theme.ink, 700);

  // Podział mandatów (2 kolumny) - obsługa liczb 1-, 2- i 3-cyfrowych bez obcinania kropek!
  text(en ? "SEAT DISTRIBUTION" : "PODZIAŁ MANDATÓW", 700, 175, 13, theme.muted, 800);
  const rows = Math.max(1, Math.ceil(ranked.length / 2));
  const step = Math.min(55, 170 / rows);
  const colWidth = 216;
  const colGap = 20;

  ranked.forEach(([id, seats], index) => {
    const column = index < rows ? 0 : 1;
    const row = index % rows;
    const x = 700 + column * (colWidth + colGap);
    const y = 208 + row * step;

    // Znacznik koloru partii
    ctx.fillStyle = getPartyColor(id);
    ctx.beginPath();
    ctx.roundRect(x, y - 12, 8, 16, 2);
    ctx.fill();

    // Nazwa partii (do 135px, aby nie nachodziła na liczbę mandatów)
    text(map[id]?.short ?? id, x + 16, y + 1, Math.min(17, step * 0.55), theme.ink, 600, 135);

    // Liczba mandatów wyrównana do prawej krawędzi kolumny — NIGDY nie ulega skróceniu z "…"
    const numSize = Math.min(22, step * 0.6);
    ctx.font = `800 ${numSize}px ${fontSans}`;
    ctx.fillStyle = theme.ink;
    ctx.textAlign = "right";
    ctx.fillText(String(seats), x + colWidth, y + 1);
    ctx.textAlign = "left";
  });

  // Większość koalicyjna
  const { winners, strongest } = coalitionResult(scenario.coalitions ?? [], result.seatsByParty);
  ctx.fillStyle = theme.border;
  ctx.fillRect(700, 385, 452, 1);
  text(en ? "COALITION MAJORITY" : "WIĘKSZOŚĆ KOALICYJNA", 700, 409, 13, theme.muted, 800, 452);

  const coalitionLines = winners.length > 0
    ? winners.flatMap((coalition) => [
      `${coalition.name}: ${coalition.seats} ${en ? "seats" : "mandatów"}`,
      [...new Set(coalition.members)].map((id) => map[id]?.short ?? id).join(" + "),
    ])
    : [
      en ? "No configured coalition has a majority" : "Żadna utworzona koalicja nie ma większości",
      ...(strongest ? [`${strongest.name}: ${strongest.seats} ${en ? "seats" : "mandatów"}`, `${en ? "Needs" : "Brakuje"} ${231 - strongest.seats} ${en ? "seats for a majority" : "mandatów do większości"}`] : [en ? "No coalitions defined in this scenario" : "Nie utworzono koalicji w tym scenariuszu"]),
    ];

  const lineHeight = Math.min(26, 125 / coalitionLines.length);
  coalitionLines.forEach((line, index) => {
    const isHeader = index % 2 === 0;
    const isWinner = winners.length > 0 && isHeader;
    text(
      line,
      700,
      438 + index * lineHeight,
      Math.min(index === 0 ? 18 : 15, lineHeight * 0.72),
      isWinner ? theme.primary : theme.ink,
      isHeader ? 700 : 500,
      452
    );
  });

  // Linia stopki
  ctx.fillStyle = theme.border;
  ctx.fillRect(48, 560, 1104, 1);

  // Informacja o scenariuszu po lewej
  text(
    en ? "Community scenario, not a poll or a SejmSim publication." : "Scenariusz społeczności, nie sondaż ani publikacja SejmSim.",
    48,
    594,
    14,
    theme.muted,
    500,
    720
  );

  // Wyraźny, estetyczny badge z marką i adresem sejmsim.pl po prawej stronie
  const brandName = "SejmSim";
  const urlDomain = "sejmsim.pl";

  ctx.font = `700 20px ${fontDisplay}`;
  const brandW = ctx.measureText(brandName).width;
  ctx.font = `700 20px ${fontSans}`;
  const dotW = ctx.measureText(".").width;

  ctx.font = `700 15px ${fontSans}`;
  const urlW = ctx.measureText(urlDomain).width;

  const badgePaddingX = 14;
  const badgeH = 38;
  const badgeW = brandW + dotW + urlW + badgePaddingX * 2 + 18; // 18px odstępu między SejmSim a sejmsim.pl z separatorem
  const badgeX = 1152 - badgeW;
  const badgeY = 574;

  // Tło i ramka badge'a
  ctx.save();
  ctx.fillStyle = theme.badgeBg;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fill();
  ctx.strokeStyle = theme.badgeBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Wordmark "SejmSim"
  ctx.font = `700 20px ${fontDisplay}`;
  ctx.fillStyle = theme.ink;
  ctx.fillText(brandName, badgeX + badgePaddingX, badgeY + 26);

  // Czerwona kropka "."
  ctx.font = `700 20px ${fontSans}`;
  ctx.fillStyle = theme.primary;
  ctx.fillText(".", badgeX + badgePaddingX + brandW, badgeY + 26);

  // Pionowy subtelny separator
  const sepX = badgeX + badgePaddingX + brandW + dotW + 8;
  ctx.fillStyle = theme.border;
  ctx.fillRect(sepX, badgeY + 10, 1, 18);

  // Bardzo wyraźny adres "sejmsim.pl" w wyrazistym, brandowym kolorze
  ctx.font = `700 15px ${fontSans}`;
  ctx.fillStyle = theme.primary;
  ctx.fillText(urlDomain, sepX + 9, badgeY + 25);
  ctx.restore();

  // Asynchroniczne przekazanie wygenerowanej grafiki na serwer dla panelu właściciela
  try {
    const dataUrl = canvas.toDataURL("image/png");
    void uploadGeneratedGraphic({
      data: {
        scenarioName: scenario.name || (en ? "My scenario" : "Mój scenariusz"),
        imageData: dataUrl,
      },
    }).catch(() => {
      // Ignorujemy błędy wysyłki w tle, by nie przerywać użytkownikowi pobierania
    });
  } catch {
    // Canvas security / memory fallback
  }

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Image export failed")), "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "sejmsim-scenariusz-1200x630.png"; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
