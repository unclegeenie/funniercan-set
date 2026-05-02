import { getStore } from "@netlify/blobs";

const STORE_NAME = "funniercan-notices";
const DATA_KEY = "notices-v1";
const DEFAULT_ADMIN_PASSWORD = "funniercan2026";

const defaultNotices = [
  {
    id: "notice-default-1",
    title: "퍼니어캔의 현장조사 야장 SET 안내",
    content: "공지사항, 수목활력, 토양측정, 현장소통 탭으로 구성되어 있습니다. 공지사항은 관리 비밀번호를 입력해 등록·수정할 수 있습니다.",
    createdAt: "2026-05-02 00:00",
    updatedAt: "2026-05-02 00:00",
  },
];

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

function cleanText(value, maxLength = 1000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

function verifyPassword(password) {
  return String(password || "") === adminPassword();
}

async function readNotices(store) {
  const saved = await store.get(DATA_KEY, { type: "json" });
  return Array.isArray(saved) ? saved : defaultNotices;
}

async function writeNotices(store, notices) {
  const safeNotices = Array.isArray(notices) ? notices.slice(0, 100) : [];
  await store.setJSON(DATA_KEY, safeNotices);
  return safeNotices;
}

export default async (request) => {
  try {
    const store = getStore({ name: STORE_NAME });

    if (request.method === "GET") {
      const notices = await readNotices(store);
      return json({ ok: true, notices });
    }

    const body = await request.json().catch(() => ({}));
    if (!verifyPassword(body.password)) {
      return json({ ok: false, error: "관리 비밀번호가 맞지 않습니다." }, 403);
    }

    const notices = await readNotices(store);

    if (request.method === "POST") {
      const title = cleanText(body.title, 120);
      const content = cleanText(body.content, 3000);
      if (!title || !content) return json({ ok: false, error: "공지 제목과 내용을 입력해주세요." }, 400);
      const now = getKoreaTimestamp();
      const notice = {
        id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };
      const nextNotices = [notice, ...notices].slice(0, 100);
      const saved = await writeNotices(store, nextNotices);
      return json({ ok: true, notice, notices: saved });
    }

    if (request.method === "PUT") {
      const id = cleanText(body.id, 120);
      const title = cleanText(body.title, 120);
      const content = cleanText(body.content, 3000);
      if (!id) return json({ ok: false, error: "수정할 공지 ID가 없습니다." }, 400);
      if (!title || !content) return json({ ok: false, error: "공지 제목과 내용을 입력해주세요." }, 400);
      const exists = notices.some((notice) => notice.id === id);
      if (!exists) return json({ ok: false, error: "수정할 공지를 찾지 못했습니다." }, 404);
      const now = getKoreaTimestamp();
      const nextNotices = notices.map((notice) => notice.id === id ? {
        ...notice,
        title,
        content,
        updatedAt: now,
      } : notice);
      const saved = await writeNotices(store, nextNotices);
      return json({ ok: true, notices: saved });
    }

    if (request.method === "DELETE") {
      const id = cleanText(body.id, 120);
      if (!id) return json({ ok: false, error: "삭제할 공지 ID가 없습니다." }, 400);
      const nextNotices = notices.filter((notice) => notice.id !== id);
      const saved = await writeNotices(store, nextNotices);
      return json({ ok: true, notices: saved });
    }

    return json({ ok: false, error: "허용되지 않는 요청입니다." }, 405);
  } catch (error) {
    return json({ ok: false, error: error?.message || "notices error" }, 500);
  }
};
