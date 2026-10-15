import { PARTIES } from "@/data/parties";
import { simulate, type Scenario } from "@/lib/simulation";
import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from "./scenario-metadata";
import { coalitionResult } from "./coalition-result";

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
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const ink = token("--ink"), muted = token("--muted-foreground"), surface = token("--surface"), primary = token("--primary");
  const result = simulate(scenario);
  const map = Object.fromEntries([...PARTIES, ...scenario.customParties ?? [], ...scenario.mergers ?? []].map((p) => [p.id, p]));
  const ranked = Object.entries(result.seatsByParty).filter(([, seats]) => seats > 0).sort((a, b) => b[1] - a[1]);
  const text = (value: string, x: number, y: number, size: number, fill = ink, weight = 500, maxWidth = 1100) => {
    ctx.font = `${weight} ${size}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = fill;
    while (ctx.measureText(value).width > maxWidth && value.length > 1) value = value.slice(0, -2) + "…";
    ctx.fillText(value, x, y);
  };
  ctx.fillStyle = surface; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = primary; ctx.fillRect(0, 0, 1200, 7);
  text(en ? "COMMUNITY SCENARIO" : "SCENARIUSZ SPOŁECZNOŚCI", 48, 50, 13, primary, 800);
  ctx.drawImage(logo, 1088, 28, 64, 64);
  text(scenario.name || (en ? "My scenario" : "Mój scenariusz"), 48, 98, 29, ink, 800, 1010);
  text(scenario.author ? `${en ? "Author" : "Autor"}: ${scenario.author}` : (en ? "Polish parliamentary election 2027" : "Wybory do Sejmu RP 2027"), 48, 128, 15, muted, 500, 1010);
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
    ctx.fillStyle = map[queue[i] ?? "_empty"]?.color ?? token("--seat-empty");
    ctx.beginPath(); ctx.arc(355 + Math.cos(pos.angle) * pos.r * 6, 462 - Math.sin(pos.angle) * pos.r * 6, 6.4, 0, Math.PI * 2); ctx.fill();
  });
  text(`${en ? "Turnout" : "Frekwencja"}: ${result.nationalTurnout.toFixed(1)}%`, 70, 505, 17, muted);
  text(en ? "460 seats / majority: 231" : "460 mandatów / większość: 231", 70, 535, 17, ink, 700);
  text(en ? "SEAT DISTRIBUTION" : "PODZIAŁ MANDATÓW", 700, 175, 13, muted, 800);
  const rows = Math.max(1, Math.ceil(ranked.length / 2));
  const step = Math.min(55, 170 / rows);
  ranked.forEach(([id, seats], index) => {
    const column = index < rows ? 0 : 1;
    const row = index % rows;
    const x = 700 + column * 235, y = 208 + row * step;
    ctx.fillStyle = map[id]?.color ?? primary; ctx.fillRect(x, y - 12, 8, 16);
    text(map[id]?.short ?? id, x + 18, y + 1, Math.min(17, step * .55), ink, 600, 140);
    text(String(seats), x + 174, y + 1, Math.min(23, step * .6), ink, 800, 45);
  });
  const { winners, strongest } = coalitionResult(scenario.coalitions ?? [], result.seatsByParty);
  ctx.fillStyle = token("--border"); ctx.fillRect(700, 385, 452, 1);
  text(en ? "COALITION MAJORITY" : "WIĘKSZOŚĆ KOALICYJNA", 700, 409, 13, muted, 800, 452);
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
  coalitionLines.forEach((line, index) => text(line, 700, 438 + index * lineHeight, Math.min(index === 0 ? 18 : 15, lineHeight * .72), winners.length > 0 && index % 2 === 0 ? primary : ink, index % 2 === 0 ? 700 : 500, 452));
  ctx.fillStyle = token("--border"); ctx.fillRect(48, 560, 1104, 1);
  text(en ? "Community scenario, not a poll or a SejmSim publication." : "Scenariusz społeczności, nie sondaż ani publikacja SejmSim.", 48, 593, 15, muted, 600, 870);
  ctx.font = `700 32px ${css.getPropertyValue("--font-display").trim() || '"Space Grotesk", sans-serif'}`;
  const nameWidth = ctx.measureText("SejmSim").width;
  const dotWidth = ctx.measureText(".").width;
  const wordmarkX = 1152 - nameWidth - dotWidth;
  ctx.fillStyle = ink; ctx.fillText("SejmSim", wordmarkX, 595);
  ctx.fillStyle = primary; ctx.fillText(".", wordmarkX + nameWidth, 595);
  text("sejmsim.pl", wordmarkX, 615, 12, muted, 600, 180);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Image export failed")), "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "sejmsim-scenariusz-1200x630.png"; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}