"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ImagePlus, Send, Trash2, X, MessageCircle } from "lucide-react";
import { compressImage } from "@/lib/compress";

type Person = { id: string; name: string | null; image: string | null };
type Comment = { id: string; text: string; imageData: string | null; createdAt: string; user: Person };
type Post = {
  id: string;
  text: string;
  imageData: string | null;
  createdAt: string;
  user: Person;
  comments: Comment[];
};

function Avatar({ p }: { p: Person }) {
  const initial = (p.name || "?").charAt(0).toUpperCase();
  return (
    <Link
      href={`/u/${p.id}`}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white"
    >
      {initial}
    </Link>
  );
}

export function FeedClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/feed");
    if (res.ok) setPosts((await res.json()).posts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>, setter: (d: string | null) => void) {
    const f = e.target.files?.[0];
    if (f) setter(await compressImage(f));
    e.target.value = "";
  }

  async function createPost() {
    if (!text.trim() && !img) return;
    setBusy(true);
    const res = await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, imageData: img }),
    });
    setBusy(false);
    if (res.ok) {
      setText("");
      setImg(null);
      load();
    }
  }

  async function delPost(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/feed/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Community</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share an update…"
          className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm focus:border-brand-400 focus:outline-none"
          rows={3}
        />
        {img && (
          <div className="relative mt-2 inline-block">
            <img src={img} alt="" className="max-h-40 rounded-lg" />
            <button onClick={() => setImg(null)} className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
            <ImagePlus className="h-4 w-4" /> Image
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e, setImg)} />
          <button
            onClick={createPost}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Post
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onDelete={delPost} onComment={load} pickImage={pickImage} />
        ))}
        {posts.length === 0 && <p className="text-center text-slate-400">No posts yet — be the first!</p>}
      </div>
    </div>
  );
}

function PostCard({
  post,
  onDelete,
  onComment,
  pickImage,
}: {
  post: Post;
  onDelete: (id: string) => void;
  onComment: () => void;
  pickImage: (e: React.ChangeEvent<HTMLInputElement>, s: (d: string | null) => void) => void;
}) {
  const [text, setText] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function send() {
    if (!text.trim() && !img) return;
    await fetch(`/api/feed/${post.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, imageData: img }),
    });
    setText("");
    setImg(null);
    onComment();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar p={post.user} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{post.user.name || "User"}</p>
          <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
          {post.text && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{post.text}</p>}
          {post.imageData && <img src={post.imageData} alt="" className="mt-2 max-h-80 rounded-lg" />}
        </div>
        <button onClick={() => onDelete(post.id)} className="text-slate-300 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {post.comments.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar p={c.user} />
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">{c.user.name || "User"}</p>
                {c.text && <p className="text-sm text-slate-600">{c.text}</p>}
                {c.imageData && <img src={c.imageData} alt="" className="mt-1 max-h-40 rounded" />}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-slate-400" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Comment…"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
        />
        <button onClick={() => fileRef.current?.click()} className="text-slate-400 hover:text-brand-600">
          <ImagePlus className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e, setImg)} />
        <button onClick={send} className="text-brand-600 hover:text-brand-700">
          <Send className="h-4 w-4" />
        </button>
      </div>
      {img && <img src={img} alt="" className="mt-2 max-h-24 rounded" />}
    </div>
  );
}
