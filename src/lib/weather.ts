// Current weather via open-meteo (free, no API key) + the browser's location.
// Returns null if location is denied/unavailable so the UI can just hide it.
export type Weather = { temp: number; label: string; emoji: string };

const WMO: Record<number, { label: string; emoji: string }> = {
  0: { label: "Klart", emoji: "☀️" },
  1: { label: "Mest klart", emoji: "🌤️" },
  2: { label: "Halvklart", emoji: "⛅" },
  3: { label: "Mulet", emoji: "☁️" },
  45: { label: "Dimma", emoji: "🌫️" },
  48: { label: "Dimma", emoji: "🌫️" },
  51: { label: "Duggregn", emoji: "🌦️" },
  53: { label: "Duggregn", emoji: "🌦️" },
  55: { label: "Duggregn", emoji: "🌦️" },
  61: { label: "Regn", emoji: "🌧️" },
  63: { label: "Regn", emoji: "🌧️" },
  65: { label: "Regn", emoji: "🌧️" },
  66: { label: "Underkylt regn", emoji: "🌧️" },
  67: { label: "Underkylt regn", emoji: "🌧️" },
  71: { label: "Snö", emoji: "🌨️" },
  73: { label: "Snö", emoji: "🌨️" },
  75: { label: "Snö", emoji: "❄️" },
  77: { label: "Snökorn", emoji: "🌨️" },
  80: { label: "Skurar", emoji: "🌦️" },
  81: { label: "Skurar", emoji: "🌦️" },
  82: { label: "Skyfall", emoji: "🌧️" },
  85: { label: "Snöbyar", emoji: "🌨️" },
  86: { label: "Snöbyar", emoji: "🌨️" },
  95: { label: "Åska", emoji: "⛈️" },
  96: { label: "Åska", emoji: "⛈️" },
  99: { label: "Åska", emoji: "⛈️" },
};

function getPosition(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      () => resolve(null),
      { timeout: 8000, maximumAge: 3_600_000 },
    );
  });
}

export async function fetchWeather(): Promise<Weather | null> {
  const coords = await getPosition();
  if (!coords) return null;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude.toFixed(3)}` +
    `&longitude=${coords.longitude.toFixed(3)}&current=temperature_2m,weather_code`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const d = await res.json();
  const temp = Math.round(d?.current?.temperature_2m);
  if (Number.isNaN(temp)) return null;
  const w = WMO[d?.current?.weather_code as number] ?? { label: "", emoji: "🌡️" };
  return { temp, label: w.label, emoji: w.emoji };
}
