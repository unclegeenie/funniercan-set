import { getStore } from "@netlify/blobs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getTodayKey() {
  // 한국 기준 날짜로 오늘 방문자수를 계산합니다.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function getNumber(store, key) {
  const value = await store.get(key, { type: "text" });
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export default async (request) => {
  try {
    const store = getStore({ name: "funniercan-visit-stats" });
    const todayKey = `today:${getTodayKey()}`;
    const totalKey = "total";

    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const shouldCount = body?.shouldCount === true;

    let today = await getNumber(store, todayKey);
    let total = await getNumber(store, totalKey);

    if (shouldCount) {
      today += 1;
      total += 1;
      await Promise.all([
        store.set(todayKey, String(today)),
        store.set(totalKey, String(total)),
      ]);
    }

    return json({ ok: true, today, total, todayKey });
  } catch (error) {
    return json({ ok: false, error: error?.message || "visit stats error" }, 500);
  }
};
