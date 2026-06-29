"use client";

import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  User,
  Upload,
  Link2,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Briefcase,
  GraduationCap,
  Code2,
  Save,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/Loading";

interface ProfileSource {
  id: string;
  sourceType: string;
  sourceName: string;
  status: string;
  createdAt: string;
}

interface Experience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description: string;
}

interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
}

interface Profile {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  experience?: Experience[];
  education?: Education[];
  skills?: string[];
  sources?: ProfileSource[];
  isPublic?: boolean;
  privateFields?: string[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setProfile(data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateVisibility = useCallback(async (isPublic: boolean, privateFields: string[]) => {
    setProfile((prev) => ({ ...prev, isPublic, privateFields }));
    try {
      await fetch("/api/profile/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic, privateFields }),
      });
    } catch {
      toast.error("Failed to update sharing");
    }
  }, []);


  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      const toastId = toast.loading("Parsing document with AI...");

      try {
        const formData = new FormData();
        formData.append("file", acceptedFiles[0]);

        const res = await fetch("/api/profile/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          setProfile(data.profile);
          toast.success(`Imported from ${data.fileName}`, { id: toastId });
        } else {
          toast.error(data.error || "Upload failed", { id: toastId });
        }
      } catch {
        toast.error("Upload failed", { id: toastId });
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleImportUrl = async () => {
    if (!importUrl.trim()) {
      toast.error("Enter a URL");
      return;
    }
    setImporting(true);
    const toastId = toast.loading("Importing & parsing profile...");

    try {
      const sourceType = importUrl.includes("linkedin")
        ? "LINKEDIN"
        : importUrl.includes("monster")
        ? "MONSTER"
        : "URL";

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl, sourceType }),
      });
      const data = await res.json();

      if (data.success) {
        setProfile(data.profile);
        setImportUrl("");
        toast.success("Profile imported!", { id: toastId });
      } else {
        toast.error(data.error || "Import failed", { id: toastId });
      }
    } catch {
      toast.error("Import failed", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        toast.success("Profile saved");
      } else {
        toast.error("Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    setProfile({ ...profile, skills: [...(profile.skills || []), newSkill.trim()] });
    setNewSkill("");
  };

  const removeSkill = (idx: number) => {
    setProfile({
      ...profile,
      skills: (profile.skills || []).filter((_, i) => i !== idx),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size={32} className="text-brand-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <p className="text-slate-400 mt-1">Your master profile — aggregated from all sources</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <LoadingSpinner /> : <Save size={18} />} Save Profile
        </button>
      </div>

      {/* Public sharing */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Public profile</h2>
            <p className="text-sm text-slate-400">Everything is public unless you mark fields private.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={profile.isPublic !== false}
              onChange={(e) => updateVisibility(e.target.checked, profile.privateFields || [])}
            />
            {profile.isPublic !== false ? "Visible to others" : "Hidden"}
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["email", "phone", "location", "website", "linkedin", "github", "experience", "education", "certifications", "awards", "publications"].map((f) => {
            const hidden = (profile.privateFields || []).includes(f);
            return (
              <button
                key={f}
                onClick={() =>
                  updateVisibility(
                    profile.isPublic !== false,
                    hidden ? (profile.privateFields || []).filter((x) => x !== f) : [...(profile.privateFields || []), f]
                  )
                }
                className={`rounded-full px-3 py-1 text-xs ${hidden ? "bg-slate-700 text-slate-400" : "bg-brand-600/30 text-brand-200"}`}
              >
                {hidden ? "🔒 " : ""}{f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Import sources */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {/* File upload */}
        <div
          {...getRootProps()}
          className={`glass-card p-6 border-2 border-dashed cursor-pointer transition-all ${
            isDragActive
              ? "border-brand-500 bg-brand-600/10"
              : "border-slate-700 hover:border-brand-500/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center">
            {uploading ? (
              <Loader2 className="w-10 h-10 text-brand-400 animate-spin mb-3" />
            ) : (
              <Upload className="w-10 h-10 text-brand-400 mb-3" />
            )}
            <p className="font-medium text-white mb-1">
              {uploading ? "Processing..." : "Drop your CV / Resume"}
            </p>
            <p className="text-sm text-slate-500">PDF, DOCX, or TXT — AI extracts everything</p>
          </div>
        </div>

        {/* URL import */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-5 h-5 text-brand-400" />
            <span className="font-medium text-white">Import from URL</span>
          </div>
          <p className="text-sm text-slate-500 mb-3">LinkedIn, Monster, or any profile page</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="input flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleImportUrl()}
            />
            <button onClick={handleImportUrl} disabled={importing} className="btn-primary !px-4">
              {importing ? <LoadingSpinner /> : <Link2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Sources list */}
      {profile.sources && profile.sources.length > 0 && (
        <div className="glass-card p-5 mb-8">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Imported Sources</h3>
          <div className="flex flex-wrap gap-2">
            {profile.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-sm"
              >
                <CheckCircle2 size={14} className="text-green-400" />
                <span className="text-slate-300">{source.sourceName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <User size={18} className="text-brand-400" /> Personal Information
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={profile.fullName || ""}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={profile.email || ""}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <label className="label">Location</label>
            <input
              className="input"
              value={profile.location || ""}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              placeholder="San Francisco, CA"
            />
          </div>
          <div>
            <label className="label">LinkedIn</label>
            <input
              className="input"
              value={profile.linkedin || ""}
              onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
              placeholder="linkedin.com/in/johndoe"
            />
          </div>
          <div>
            <label className="label">GitHub / Website</label>
            <input
              className="input"
              value={profile.github || profile.website || ""}
              onChange={(e) => setProfile({ ...profile, github: e.target.value })}
              placeholder="github.com/johndoe"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Professional Summary</label>
          <textarea
            className="input min-h-[100px] resize-y"
            value={profile.summary || ""}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            placeholder="A brief professional summary..."
          />
        </div>
      </motion.div>

      {/* Skills */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <Code2 size={18} className="text-brand-400" /> Skills
        </h2>
        <div className="flex gap-2 mb-4">
          <input
            className="input flex-1"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            placeholder="Add a skill..."
          />
          <button onClick={addSkill} className="btn-secondary !px-4">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(profile.skills || []).map((skill, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 text-brand-300 text-sm border border-brand-500/30"
            >
              {skill}
              <button onClick={() => removeSkill(idx)} className="hover:text-white">
                <Trash2 size={12} />
              </button>
            </span>
          ))}
          {(!profile.skills || profile.skills.length === 0) && (
            <p className="text-sm text-slate-500">No skills added yet</p>
          )}
        </div>
      </motion.div>

      {/* Experience */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <Briefcase size={18} className="text-brand-400" /> Experience
        </h2>
        {(profile.experience || []).length === 0 ? (
          <p className="text-sm text-slate-500">
            No experience yet — import a CV or LinkedIn profile to auto-fill.
          </p>
        ) : (
          <div className="space-y-4">
            {(profile.experience || []).map((exp, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{exp.title}</p>
                    <p className="text-brand-400 text-sm">{exp.company}</p>
                    {exp.location && <p className="text-xs text-slate-500">{exp.location}</p>}
                  </div>
                  <span className="text-xs text-slate-500">
                    {exp.startDate} — {exp.current ? "Present" : exp.endDate}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-sm text-slate-400 mt-2 line-clamp-3">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Education */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <GraduationCap size={18} className="text-brand-400" /> Education
        </h2>
        {(profile.education || []).length === 0 ? (
          <p className="text-sm text-slate-500">No education added yet.</p>
        ) : (
          <div className="space-y-3">
            {(profile.education || []).map((edu, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ""}
                    </p>
                    <p className="text-brand-400 text-sm">{edu.institution}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {edu.startDate} {edu.endDate ? `— ${edu.endDate}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
