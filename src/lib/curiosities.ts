// A hand-picked, varied set of genuinely surprising curiosities — history,
// science, language, nature, space — so opening Arkiv each day gives a fresh
// "aha, lite kul" fact worth knowing (and worth telling someone else).
// Curated rather than pulled from a facts API (those are repetitive / low quality).
// Picked deterministically by the date so it's stable through the day, fresh daily.

export type Curiosity = { tag: string; text: string };

export const CURIOSITIES: Curiosity[] = [
  { tag: "Språk", text: "På japanska finns ordet *tsundoku* — att köpa böcker och låta dem ligga olästa i högar." },
  { tag: "Språk", text: "‘Jag älskar dig’ på mandarin: 我爱你 (wǒ ài nǐ)." },
  { tag: "Språk", text: "Tyskans *Kummerspeck* betyder ordagrant ‘sorgfläsk’ — vikten man går upp av tröstätande." },
  { tag: "Språk", text: "Hawaiianskan klarar sig med bara 13 bokstäver i alfabetet." },
  { tag: "Språk", text: "Ordet ‘robot’ kommer från tjeckiskans *robota* (tvångsarbete) och myntades i en pjäs 1920." },
  { tag: "Historia", text: "Oxford University är äldre än aztekerriket — undervisning fanns där redan på 1090-talet." },
  { tag: "Historia", text: "Kleopatra levde närmare månlandningen i tid än byggandet av Cheopspyramiden." },
  { tag: "Historia", text: "Det kortaste kriget i historien varade i runt 40 minuter (Storbritannien mot Zanzibar, 1896)." },
  { tag: "Historia", text: "Mammutar levde fortfarande kvar (på Wrangelön) långt efter att pyramiderna byggts." },
  { tag: "Historia", text: "‘OK’ började som ett skämt i en Boston-tidning 1839 — en lek med felstavade ‘oll korrect’." },
  { tag: "Rymden", text: "En dag på Venus (ett varv) är längre än hela dess år." },
  { tag: "Rymden", text: "Ljuset från solen tar ~8 minuter till jorden — du ser alltid solen som den var för 8 min sedan." },
  { tag: "Rymden", text: "Det finns fler möjliga schackpartier än det finns atomer i det observerbara universum." },
  { tag: "Rymden", text: "Saturnus är så lätt att planeten skulle flyta om man hade ett tillräckligt stort badkar." },
  { tag: "Natur", text: "Bläckfiskar har tre hjärtan och blått blod." },
  { tag: "Natur", text: "Vombaters bajs är kubformat." },
  { tag: "Natur", text: "Björndjur (tardigrader) överlever i rymden, i kokande vatten och nära absoluta nollpunkten." },
  { tag: "Natur", text: "En räkas hjärta sitter i huvudet." },
  { tag: "Natur", text: "Det finns fler träd på jorden (~3 biljoner) än stjärnor i Vintergatan." },
  { tag: "Natur", text: "Kolibrier är de enda fåglar som kan flyga baklänges." },
  { tag: "Vetenskap", text: "Honung blir aldrig dåligt — ätbar honung har hittats i 3000 år gamla egyptiska gravar." },
  { tag: "Vetenskap", text: "Bananer är svagt radioaktiva (kalium-40) — helt ofarligt." },
  { tag: "Vetenskap", text: "I ett rum med bara 23 personer är chansen >50 % att två fyller år samma dag." },
  { tag: "Vetenskap", text: "Eiffeltornet växer ~15 cm på sommaren när järnet utvidgas av värmen." },
  { tag: "Kropp", text: "Din magsäck får en ny slemhinna var tredje–fjärde dag — annars skulle den smälta sig själv." },
  { tag: "Kropp", text: "Du är ungefär 1 cm längre på morgonen — brosket i ryggraden trycks ihop under dagen." },
  { tag: "Kropp", text: "Människan delar omkring 60 % av sitt DNA med bananer." },
  { tag: "Geografi", text: "Ryssland sträcker sig över 11 tidszoner." },
  { tag: "Geografi", text: "Istanbul ligger på två kontinenter samtidigt." },
  { tag: "Geografi", text: "Sahara var grönt och fullt av sjöar för bara ~6000 år sedan." },
  { tag: "Geografi", text: "Australien är bredare än månen i diameter." },
  { tag: "Mat", text: "‘Smörgås’ betyder ordagrant smör-gås — gåsen var smörklicken som flöt upp vid kärnandet." },
  { tag: "Mat", text: "Wasabi du äter på restaurang är nästan alltid färgad pepparrot — äkta wasabi är dyrt och ovanligt." },
  { tag: "Mat", text: "Morötter var ursprungligen lila och vita; de orange kom senare, troligen i Nederländerna." },
  { tag: "Historia", text: "Napoleon var medellång för sin tid — myten om hans korthet var brittisk propaganda." },
  { tag: "Historia", text: "Det fanns pyramider i Egypten medan ullhåriga mammutar fortfarande strövade omkring." },
  { tag: "Vetenskap", text: "Vatten kan koka och frysa samtidigt — vid den så kallade trippelpunkten." },
  { tag: "Natur", text: "En grupp flamingos kallas på engelska ‘a flamboyance’." },
  { tag: "Natur", text: "Sjöstjärnor har inget blod — de pumpar runt havsvatten i kroppen istället." },
  { tag: "Rymden", text: "Det regnar troligen diamanter på Neptunus och Uranus." },
  { tag: "Språk", text: "‘Tack’ på georgiska är მადლობა (madloba)." },
  { tag: "Historia", text: "Tetris skapades 1984 av Alexej Pajitnov i Sovjetunionen — han fick inga royalties på åratal." },
  { tag: "Vetenskap", text: "Glas är inte en långsam vätska — gamla fönster är tjockare nedtill för att de tillverkades så." },
  { tag: "Natur", text: "Bin kan känna igen mänskliga ansikten." },
  { tag: "Kropp", text: "Ditt vänstra lungflygel är mindre än det högra — för att ge plats åt hjärtat." },
  { tag: "Geografi", text: "Den högsta punkten och den lägsta sjön på jorden ligger båda i Mellanöstern (Everest räknas ej dit) — Döda havet ligger ~430 m under havsytan." },
  { tag: "Rymden", text: "Fotavtrycken på månen ligger kvar i miljontals år — det finns ingen vind som suddar ut dem." },
  { tag: "Vetenskap", text: "Om du tog bort tomrummet mellan atomerna i alla människor skulle hela mänskligheten rymmas i en sockerbit." },
  { tag: "Språk", text: "Det finns inget ord för exakt ‘snälla/please’ i många språk — artigheten ligger i böjningen istället." },
  { tag: "Natur", text: "En snigel kan sova i upp till tre år." },
];

export function dailyCuriosity(d = new Date()): Curiosity {
  const dayNumber = Math.floor(+d / 86_400_000);
  return CURIOSITIES[dayNumber % CURIOSITIES.length];
}
