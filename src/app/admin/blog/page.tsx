"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Edit, Eye, EyeOff, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", excerpt: "", published: false });

  async function load() {
    const res = await fetch("/api/blog?admin=1");
    if (res.ok) setPosts(await res.json());
  }

  useEffect(() => { load(); }, []);

  function startEdit(post: Post) {
    setEditPost(post);
    setForm({ title: post.title, content: post.content, excerpt: post.excerpt ?? "", published: post.published });
    setShowForm(true);
  }

  function resetForm() {
    setEditPost(null);
    setForm({ title: "", content: "", excerpt: "", published: false });
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const method = editPost ? "PUT" : "POST";
    const url = editPost ? `/api/blog/${editPost.id}` : "/api/blog";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    resetForm();
    load();
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Διαγραφή "${title}";`)) return;
    await fetch(`/api/blog/${id}`, { method: "DELETE" });
    setPosts(p => p.filter(x => x.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edu-Shots Blog</h1>
          <p className="text-gray-500 mt-1">Δημιουργία και διαχείριση άρθρων</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" />
          Νέο Άρθρο
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-indigo-200">
            <CardHeader><CardTitle>{editPost ? "Επεξεργασία Άρθρου" : "Νέο Edu-Shot"}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Τίτλος</label>
                  <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="π.χ. 3 κόλπα για την Άλγεβρα" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Σύντομη Περιγραφή (για την αρχική σελίδα)</label>
                  <Input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} placeholder="Προαιρετικό - αυτόματο αν αφεθεί κενό" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Περιεχόμενο</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({...form, content: e.target.value})}
                    required
                    rows={10}
                    placeholder="Γράψτε το edu-shot σας εδώ..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="published"
                    checked={form.published}
                    onChange={e => setForm({...form, published: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label htmlFor="published" className="text-sm font-medium text-gray-700">Δημοσίευση αμέσως</label>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? "Αποθήκευση..." : (editPost ? "Ενημέρωση" : "Δημιουργία")}</Button>
                  <Button type="button" variant="ghost" onClick={resetForm}>Ακύρωση</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card>
        <CardHeader><CardTitle>Άρθρα ({posts.length})</CardTitle></CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν υπάρχουν άρθρα ακόμα.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <div key={post.id} className="flex items-start justify-between py-3 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{post.title}</p>
                      <Badge variant={post.published ? "success" : "secondary"}>
                        {post.published ? "Δημοσιευμένο" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {post.published && post.publishedAt
                        ? `Δημοσιεύθηκε ${formatDate(post.publishedAt)}`
                        : `Δημιουργήθηκε ${formatDate(post.createdAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(post)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(post.id, post.title)} className="text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
