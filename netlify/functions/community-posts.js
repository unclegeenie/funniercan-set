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

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

async function readPosts(store) {
  const saved = await store.get("posts", { type: "json" });
  return Array.isArray(saved) ? saved : [];
}

export default async (request) => {
  try {
    const store = getStore({ name: "funniercan-community-posts" });

    if (request.method === "GET") {
      const posts = await readPosts(store);
      return json({ ok: true, posts });
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const name = cleanText(body.name, 40);
      const place = cleanText(body.place, 80);
      const content = cleanText(body.content, 1000);

      if (!name || !content) {
        return json({ ok: false, error: "작성자와 내용을 입력해주세요." }, 400);
      }

      const posts = await readPosts(store);
      const post = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        place,
        content,
        timestamp: getKoreaTimestamp(),
      };

      const nextPosts = [post, ...posts].slice(0, 200);
      await store.setJSON("posts", nextPosts);

      return json({ ok: true, post, posts: nextPosts });
    }

    return json({ ok: false, error: "허용되지 않는 요청입니다." }, 405);
  } catch (error) {
    return json({ ok: false, error: error?.message || "community posts error" }, 500);
  }
};
