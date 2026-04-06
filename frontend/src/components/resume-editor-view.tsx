"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useResume } from "@/components/providers/resume-provider";
import type { ResumePayload } from "@/lib/types";

const layers = ["Header", "Summary", "Experience", "Projects", "Skills"];

const inspectorFields = [
  "Typography scale",
  "Section spacing",
  "Column layout",
  "Accent color",
];

export function ResumeEditorView() {
  const { resume, saveResume, isSaving } = useResume();
  const [editable, setEditable] = useState<ResumePayload | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>("Header");

  useEffect(() => {
    if (resume) {
      setEditable({
        title: resume.title,
        status: resume.status,
        personal_info: resume.personal_info,
        experience: resume.experience,
        education: resume.education,
        skills: resume.skills,
        tools: resume.tools,
        projects: resume.projects,
        custom_sections: resume.custom_sections || [],
      });
    }
  }, [resume]);

  const handleSave = async () => {
    if (editable) {
      await saveResume(editable);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_1fr_300px]">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
          Layers
        </p>
        <div className="mt-4 space-y-3">
          {layers.map((layer, index) => (
            <motion.div
              key={layer}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => setSelectedLayer(layer)}
              className={`cursor-pointer rounded-[1.2rem] border px-4 py-3 text-sm font-medium transition ${
                selectedLayer === layer
                  ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-900/20"
                  : "border-slate-200/80 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {layer}
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
              Canvas
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              Drag-and-drop editor workspace
            </h3>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
            Ready for Konva integration
          </div>
        </div>

        <div className="rounded-[1.8rem] bg-[linear-gradient(180deg,#f8fafc,#eef2f7)] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45 }}
            className="mx-auto min-h-[780px] max-w-[760px] rounded-[1rem] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_rgba(15,23,42,0.12)]"
          >
            <div className="grid gap-8">
              <div className="grid gap-2 border-b border-slate-200 pb-6 transition" onClick={() => setSelectedLayer("Header")}>
                <div className={`rounded-[1rem] p-4 transition border ${selectedLayer === "Header" ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10" : "border-transparent"}`}>
                  <input
                    value={editable?.personal_info.full_name || ""}
                    onChange={(e) => setEditable(prev => prev ? { ...prev, personal_info: { ...prev.personal_info, full_name: e.target.value } } : null)}
                    placeholder="Your Name"
                    className="w-full bg-transparent text-3xl font-semibold text-slate-950 outline-none transition"
                  />
                  <input
                    value={editable?.personal_info.email || ""}
                    onChange={(e) => setEditable(prev => prev ? { ...prev, personal_info: { ...prev.personal_info, email: e.target.value } } : null)}
                    placeholder="email@example.com"
                    className="w-full mt-2 bg-transparent text-sm text-slate-500 outline-none transition"
                  />
                  <input
                    value={editable?.personal_info.location || ""}
                    onChange={(e) => setEditable(prev => prev ? { ...prev, personal_info: { ...prev.personal_info, location: e.target.value } } : null)}
                    placeholder="Location"
                    className="w-full mt-1 bg-transparent text-sm text-slate-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <div 
                    className={`rounded-[1rem] p-4 transition border border-dashed cursor-pointer ${selectedLayer === "Summary" ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10" : "border-slate-300 hover:border-slate-400"}`}
                    onClick={() => setSelectedLayer("Summary")}
                  >
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-900/80">
                      Summary
                    </div>
                    <textarea
                      value={editable?.personal_info.summary || ""}
                      onChange={(e) => setEditable(prev => prev ? { ...prev, personal_info: { ...prev.personal_info, summary: e.target.value } } : null)}
                      placeholder="Professional summary..."
                      rows={4}
                      className="mt-4 w-full bg-transparent text-sm leading-7 text-slate-600 outline-none resize-none transition"
                    />
                  </div>
                  <div 
                    className={`rounded-[1rem] p-4 transition border border-dashed cursor-pointer ${selectedLayer === "Experience" ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10" : "border-slate-300 hover:border-slate-400"}`}
                    onClick={() => setSelectedLayer("Experience")}
                  >
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-900/80">
                      Experience
                    </div>
                    <div className="mt-4 text-sm text-slate-600">
                      {editable?.experience?.[0]
                        ? `${editable.experience[0].role} at ${editable.experience[0].company}`
                        : "No experience entry."}
                    </div>
                  </div>
                  <div 
                    className={`rounded-[1rem] p-4 transition border border-dashed cursor-pointer ${selectedLayer === "Projects" ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10" : "border-slate-300 hover:border-slate-400"}`}
                    onClick={() => setSelectedLayer("Projects")}
                  >
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-900/80">
                      Project
                    </div>
                    <div className="mt-4 text-sm text-slate-600">
                      {editable?.projects?.[0]
                        ? `${editable.projects[0].name}: ${editable.projects[0].description}`
                        : "No project entry saved yet."}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div 
                    className={`rounded-[1rem] p-4 transition border border-dashed cursor-pointer ${selectedLayer === "Skills" ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10" : "border-slate-300 hover:border-slate-400"}`}
                    onClick={() => setSelectedLayer("Skills")}
                  >
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-900/80">
                      Skills & Tools
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(editable?.skills?.length || editable?.tools?.length ? [...(editable.skills || []), ...(editable.tools || [])] : ["No skills typed yet"]).map(
                        (skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-800"
                          >
                            {skill}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
          Inspector
        </p>
        {selectedLayer ? (
          <div className="mt-4 space-y-4">
            <div className="text-sm font-semibold text-slate-800">Editing: {selectedLayer}</div>
            
            <label className="flex items-center gap-3">
              <input type="checkbox" className="form-checkbox text-slate-900 rounded" defaultChecked />
              <span className="text-sm text-slate-600">Visible on PDF</span>
            </label>

            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spacing Before</label>
              <input type="range" className="w-full accent-slate-900" min="0" max="64" defaultValue="24" />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spacing After</label>
              <input type="range" className="w-full accent-slate-900" min="0" max="64" defaultValue="16" />
            </div>
            
            {["Typography scale", "Font weight", "Accent color"].map((field) => (
              <div
                key={field}
                className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3"
              >
                <div className="text-sm font-medium text-slate-800">{field}</div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <motion.div 
                    initial={{ width: "30%" }}
                    animate={{ width: `${Math.floor(Math.random() * 60) + 20}%` }}
                    className="h-2 rounded-full bg-slate-950" 
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-500">
            Select a layer to inspect its properties.
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t border-slate-200/80">
          <button
            onClick={handleSave}
            disabled={!editable || isSaving}
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 transition"
          >
            {isSaving ? "Saving..." : "Save Canvas Edits"}
          </button>
        </div>
      </section>
    </div>
  );
}
