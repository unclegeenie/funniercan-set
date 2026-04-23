import { getStore } from "@netlify/blobs";

function getTodayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export default async (request) => {
  const store = getStore("visit-stats");
  const todayKey = getTodayKey();

  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const shouldCount = body?.shouldCount === true;

    let total = Number((await store.get("total")) || 0);
    let today = Number((await store.get(todayKey)) || 0);

    if (shouldCount) {
      total += 1;
      today += 1;
      await store.set("total", String(total));
      await store.set(todayKey, String(today));
    }

    return new Response(JSON.stringify({ today, total }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const total = Number((await store.get("total")) || 0);
  const today = Number((await store.get(todayKey)) || 0);

  return new Response(JSON.stringify({ today, total }), {
    headers: { "Content-Type": "application/json" },
  });
};
