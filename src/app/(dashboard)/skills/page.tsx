"use client";

import { useEffect, useState } from "react";
import SkillsTab from "@/components/dashboard/dance/SkillsTab";
import {
  loadSkillLogs,
  loadSkills,
  saveSkillLogs,
  saveSkills,
  type DanceSkill,
  type DanceSkillLog,
} from "@/lib/danceSkillData";

export default function SkillsPage() {
  const [mounted, setMounted] = useState(false);
  const [skills, setSkills] = useState<DanceSkill[]>([]);
  const [skillLogs, setSkillLogs] = useState<DanceSkillLog[]>([]);

  useEffect(() => {
    setSkills(loadSkills());
    setSkillLogs(loadSkillLogs());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  function handleSaveSkill(skill: DanceSkill) {
    const updated = skills.some((s) => s.id === skill.id)
      ? skills.map((s) => (s.id === skill.id ? skill : s))
      : [...skills, skill];
    setSkills(updated);
    saveSkills(updated);
  }

  function handleDeleteSkill(skillId: string) {
    const updated = skills.filter((s) => s.id !== skillId);
    setSkills(updated);
    saveSkills(updated);
  }

  function handleSaveLog(log: DanceSkillLog) {
    const updated = [...skillLogs, log];
    setSkillLogs(updated);
    saveSkillLogs(updated);
  }

  return (
    <div className="max-w-[960px] space-y-5">
      <div className="border-b border-white/[0.06] pb-3">
        <h1 className="text-2xl font-semibold text-white">Skills</h1>
        <p className="mt-0.5 text-[12px] text-white/30">
          Track dance skills, milestones, confidence, and attempts.
        </p>
      </div>
      <SkillsTab
        skills={skills}
        skillLogs={skillLogs}
        onSaveSkill={handleSaveSkill}
        onDeleteSkill={handleDeleteSkill}
        onSaveLog={handleSaveLog}
      />
    </div>
  );
}
