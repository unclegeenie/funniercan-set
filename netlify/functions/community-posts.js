import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "funniercan-community-posts";
const DATA_KEY = "posts";

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

function makeSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function verifyPassword(post, password) {
  if (!post.passwordHash || !post.passwordSalt) return false;
  return hashPassword(String(password || ""), post.passwordSalt) === post.passwordHash;
}

function publicPost(post) {
  const { passwordHash, passwordSalt, ...safePost } = post;
  return safePost;
}

async function readPosts(store) {
  const saved = await store.get(DATA_KEY, { type: "json" });
  return Array.isArray(saved) ? saved : [];
}

async function writePosts(store, posts) {
  const safePosts = Array.isArray(posts) ? posts.slice(0, 300) : [];
  await store.setJSON(DATA_KEY, safePosts);
  return safePosts;
}

export default async (request) => {
  try {
    const store = getStore({ name: STORE_NAME });

    if (request.method === "GET") {
      const posts = await readPosts(store);
      return json({ ok: true, posts: posts.map(publicPost) });
    }

    const body = await request.json().catch(() => ({}));
    const posts = await readPosts(store);

    if (request.method === "POST") {
      const name = cleanText(body.name, 40);
      const place = cleanText(body.place, 80);
      const content = cleanText(body.content, 1500);
      const password = cleanText(body.password, 100);

      if (!name || !content) {
        return json({ ok: false, error: "작성자와 내용을 입력해주세요." }, 400);
      }
      if (!password) {
        return json({ ok: false, error: "수정용 비밀번호를 입력해주세요." }, 400);
      }

      const salt = makeSalt();
      const now = getKoreaTimestamp();
      const post = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        place,
        content,
        timestamp: now,
        updatedAt: "",
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
      };

      const nextPosts = [post, ...posts].slice(0, 300);
      const saved = await writePosts(store, nextPosts);
      return json({ ok: true, post: publicPost(post), posts: saved.map(publicPost) });
    }

    if (request.method === "PUT") {
      const id = cleanText(body.id, 120);
      const name = cleanText(body.name, 40);
      const place = cleanText(body.place, 80);
      const content = cleanText(body.content, 1500);
      const password = cleanText(body.password, 100);

      if (!id) return json({ ok: false, error: "수정할 의견 ID가 없습니다." }, 400);
      if (!name || !content) return json({ ok: false, error: "작성자와 내용을 입력해주세요." }, 400);
      if (!password) return json({ ok: false, error: "수정용 비밀번호를 입력해주세요." }, 400);

      const target = posts.find((post) => post.id === id);
      if (!target) return json({ ok: false, error: "수정할 의견을 찾지 못했습니다." }, 404);
      if (!verifyPassword(target, password)) {
        return json({ ok: false, error: "비밀번호가 맞지 않습니다. 비밀번호 없는 이전 글은 수정할 수 없습니다." }, 403);
      }

      const now = getKoreaTimestamp();
      const nextPosts = posts.map((post) => post.id === id ? {
        ...post,
        name,
        place,
        content,
        updatedAt: now,
      } : post);
      const saved = await writePosts(store, nextPosts);
      return json({ ok: true, posts: saved.map(publicPost) });
    }

    if (request.method === "DELETE") {
      const id = cleanText(body.id, 120);
      const password = cleanText(body.password, 100);

      if (!id) return json({ ok: false, error: "삭제할 의견 ID가 없습니다." }, 400);
      if (!password) return json({ ok: false, error: "비밀번호를 입력해주세요." }, 400);

      const target = posts.find((post) => post.id === id);
      if (!target) return json({ ok: false, error: "삭제할 의견을 찾지 못했습니다." }, 404);
      if (!verifyPassword(target, password)) {
        return json({ ok: false, error: "비밀번호가 맞지 않습니다. 비밀번호 없는 이전 글은 삭제할 수 없습니다." }, 403);
      }

      const nextPosts = posts.filter((post) => post.id !== id);
      const saved = await writePosts(store, nextPosts);
      return json({ ok: true, posts: saved.map(publicPost) });
    }

    return json({ ok: false, error: "허용되지 않는 요청입니다." }, 405);
  } catch (error) {
    return json({ ok: false, error: error?.message || "community posts error" }, 500);
  }
};
