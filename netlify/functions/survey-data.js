import { getStore } from "@netlify/blobs";

const STORE_NAME = "funniercan-survey-data";
const DATA_KEY = "survey-data-v1";
const MAX_TREE_ROWS = 1000;
const MAX_SOIL_ROWS = 1000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getKoreaTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readData(store) {
  const saved = await store.get(DATA_KEY, { type: "json" });
  return {
    tree: Array.isArray(saved?.tree) ? saved.tree : [],
    soil: Array.isArray(saved?.soil) ? saved.soil : [],
  };
}

async function writeData(store, data) {
  const safeData = {
    tree: Array.isArray(data.tree) ? data.tree.slice(0, MAX_TREE_ROWS) : [],
    soil: Array.isArray(data.soil) ? data.soil.slice(0, MAX_SOIL_ROWS) : [],
  };
  await store.setJSON(DATA_KEY, safeData);
  return safeData;
}

function normalizeTreeItem(item, existing = {}) {
  const now = getKoreaTimestamp();
  return {
    id: existing.id || item.id || makeId("tree"),
    number: cleanText(item.number, 80),
    measure1: cleanText(item.measure1, 40),
    measure2: cleanText(item.measure2, 40),
    measure3: cleanText(item.measure3, 40),
    measure4: cleanText(item.measure4, 40),
    remark: cleanText(item.remark, 1000),
    latitude: cleanText(item.latitude, 40),
    longitude: cleanText(item.longitude, 40),
    gpsAccuracy: cleanText(item.gpsAccuracy, 40),
    gpsTimestamp: cleanText(item.gpsTimestamp, 80),
    createdAt: existing.createdAt || cleanText(item.createdAt, 80) || now,
    updatedAt: existing.id ? now : cleanText(item.updatedAt, 80) || now,
  };
}

function normalizeSoilItem(item, existing = {}) {
  const now = getKoreaTimestamp();
  return {
    id: existing.id || item.id || makeId("soil"),
    number: cleanText(item.number, 80),
    place: cleanText(item.place, 120),
    moisture: cleanText(item.moisture, 40),
    ec: cleanText(item.ec, 40),
    temperature: cleanText(item.temperature, 40),
    remark: cleanText(item.remark, 1000),
    latitude: cleanText(item.latitude, 40),
    longitude: cleanText(item.longitude, 40),
    gpsAccuracy: cleanText(item.gpsAccuracy, 40),
    gpsTimestamp: cleanText(item.gpsTimestamp, 80),
    createdAt: existing.createdAt || cleanText(item.createdAt, 80) || now,
    updatedAt: existing.id ? now : cleanText(item.updatedAt, 80) || now,
  };
}

function getListName(type) {
  if (type === "tree") return "tree";
  if (type === "soil") return "soil";
  return null;
}

function normalizeByType(type, item, existing) {
  if (type === "tree") return normalizeTreeItem(item, existing);
  if (type === "soil") return normalizeSoilItem(item, existing);
  return null;
}

export default async (request) => {
  try {
    const store = getStore({ name: STORE_NAME });

    if (request.method === "GET") {
      const data = await readData(store);
      return json({ ok: true, ...data });
    }

    const body = await request.json().catch(() => ({}));
    const type = cleanText(body.type, 20);
    const listName = getListName(type);
    if (!listName) return json({ ok: false, error: "알 수 없는 데이터 유형입니다." }, 400);

    const data = await readData(store);
    const list = Array.isArray(data[listName]) ? data[listName] : [];

    if (request.method === "POST") {
      const item = body.item || {};
      const normalized = normalizeByType(type, item, {});
      if (!normalized.number) return json({ ok: false, error: "번호를 입력해주세요." }, 400);
      const nextData = {
        ...data,
        [listName]: [...list, normalized],
      };
      const saved = await writeData(store, nextData);
      return json({ ok: true, item: normalized, ...saved });
    }

    if (request.method === "PUT") {
      const id = cleanText(body.id, 120);
      if (!id) return json({ ok: false, error: "수정할 데이터 ID가 없습니다." }, 400);
      const index = list.findIndex((row) => row.id === id);
      if (index === -1) return json({ ok: false, error: "수정할 데이터를 찾지 못했습니다." }, 404);
      const existing = list[index];
      const normalized = normalizeByType(type, { ...(body.item || {}), id }, existing);
      if (!normalized.number) return json({ ok: false, error: "번호를 입력해주세요." }, 400);
      const nextList = list.map((row) => (row.id === id ? normalized : row));
      const nextData = { ...data, [listName]: nextList };
      const saved = await writeData(store, nextData);
      return json({ ok: true, item: normalized, ...saved });
    }

    if (request.method === "DELETE") {
      const id = cleanText(body.id, 120);
      if (!id) return json({ ok: false, error: "삭제할 데이터 ID가 없습니다." }, 400);
      const nextList = list.filter((row) => row.id !== id);
      const nextData = { ...data, [listName]: nextList };
      const saved = await writeData(store, nextData);
      return json({ ok: true, ...saved });
    }

    return json({ ok: false, error: "허용되지 않는 요청입니다." }, 405);
  } catch (error) {
    return json({ ok: false, error: error?.message || "survey data error" }, 500);
  }
};
