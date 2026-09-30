import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  PhoneCall,
  Plus,
  Smartphone,
  UserCheck,
  Users,
  Volume2,
} from 'lucide-react';
import {
  CareCircleActivityEvent,
  CareCircleDoseItem,
  CareCircleMember,
  CareDoseStatus,
  PrescriptionVerificationResult,
  SupportedLanguage,
} from '../types/prescription';

interface CareCircleViewProps {
  verificationResult: PrescriptionVerificationResult | null;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

export const CareCircleView: React.FC<CareCircleViewProps> = ({
  verificationResult,
  language,
  onLanguageChange,
}) => {
  const [members, setMembers] = useState<CareCircleMember[]>([]);
  const [activities, setActivities] = useState<CareCircleActivityEvent[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('member-baba');
  const [viewMode, setViewMode] = useState<'caregiver' | 'parent_phone'>('caregiver');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingDoseId, setUpdatingDoseId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // New Member Form State
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('Father (Baba)');
  const [newAge, setNewAge] = useState('68');
  const [newLocation, setNewLocation] = useState('Kolkata');
  const [newPhone, setNewPhone] = useState('+91 98301 44820');
  const [newCondition, setNewCondition] = useState('Blood Pressure & Daily Care');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const fetchCareCircle = async () => {
    try {
      const res = await fetch('/api/care-circle');
      const data = await res.json();
      if (Array.isArray(data.members)) {
        setMembers(data.members);
        if (
          data.members.length > 0 &&
          !data.members.some((m: CareCircleMember) => m.id === selectedMemberId)
        ) {
          setSelectedMemberId(data.members[0].id);
        }
      }
      if (Array.isArray(data.activities)) {
        setActivities(data.activities);
      }
    } catch {
      // Ignore transient errors
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCareCircle();
  }, []);

  const selectedMember =
    members.find((m) => m.id === selectedMemberId) || members[0] || null;

  // Find all overdue doses (>1 hour) across all Care Circle members
  const overdueAlerts: Array<{
    member: CareCircleMember;
    dose: CareCircleDoseItem;
  }> = [];
  members.forEach((member) => {
    member.doses.forEach((dose) => {
      if (dose.status === 'MISSED_OVERDUE') {
        overdueAlerts.push({ member, dose });
      }
    });
  });

  const handleUpdateDoseStatus = async (
    memberId: string,
    dose: CareCircleDoseItem,
    nextStatus: CareDoseStatus
  ) => {
    setUpdatingDoseId(dose.id);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/care-circle/dose-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          doseId: dose.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.members)) setMembers(data.members);
      if (Array.isArray(data.activities)) setActivities(data.activities);

      const targetMember = members.find((m) => m.id === memberId);
      if (nextStatus === 'TAKEN') {
        setStatusBanner(
          `Caregiver notified: ${targetMember?.name || 'Parent'} marked "${dose.medicineName}" as Taken.`
        );
      } else if (nextStatus === 'MISSED_OVERDUE') {
        setStatusBanner(
          `Missed Dose Alert triggered: "${dose.medicineName}" is overdue by >1 hour. Caregiver alert active.`
        );
      }
    } catch {
      // Ignore
    } finally {
      setUpdatingDoseId(null);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAddingMember(true);
    try {
      const res = await fetch('/api/care-circle/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          relation: newRelation,
          age: Number(newAge) || 65,
          location: newLocation,
          phone: newPhone,
          preferredLanguage: language,
          conditionSummary: newCondition,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.members)) {
        setMembers(data.members);
        setSelectedMemberId(data.members[0].id);
      }
      if (Array.isArray(data.activities)) {
        setActivities(data.activities);
      }
      setNewName('');
      setShowAddMemberForm(false);
      setStatusBanner(`Added ${newName} to your Family Care Circle.`);
    } catch {
      // Ignore
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleAssignCurrentPrescription = async () => {
    if (!selectedMember || !verificationResult) return;
    setStatusBanner(null);
    try {
      const res = await fetch('/api/care-circle/assign-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.id,
          verificationResult,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.members)) setMembers(data.members);
      if (Array.isArray(data.activities)) setActivities(data.activities);
      setStatusBanner(
        `Assigned ${verificationResult.medicines.length} medicines from the scanned prescription to ${selectedMember.name}'s daily Care Circle tracker.`
      );
    } catch {
      // Ignore
    }
  };

  const playInstructionAudio = async (id: string, text: string) => {
    if (speakingId === id) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioDataUrl) {
          const audio = new Audio(data.audioDataUrl);
          audio.onended = () => setSpeakingId(null);
          audio.onerror = () => setSpeakingId(null);
          await audio.play();
          return;
        }
      }
      throw new Error('Fallback speech');
    } catch {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = language === 'bn' ? 'bn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
        u.rate = 0.9;
        u.onend = () => setSpeakingId(null);
        u.onerror = () => setSpeakingId(null);
        window.speechSynthesis.speak(u);
      } else {
        setSpeakingId(null);
      }
    }
  };

  const buildCheckInWhatsAppUrl = (
    member: CareCircleMember,
    dose: CareCircleDoseItem
  ) => {
    const cleanPhone = member.phone.replace(/[^0-9]/g, '');
    const msg =
      language === 'bn'
        ? `প্রণাম ${member.relation}, তোমার দুপুর ${dose.scheduledTime}-এর ওষুধ (${dose.medicineName}) খাওয়ার সময় ১ ঘণ্টার বেশি পার হয়ে গেছে। তুমি কি ওষুধটা খেয়েছো?`
        : language === 'hi'
          ? `प्रणाम ${member.relation}, आपकी ${dose.scheduledTime} की दवा (${dose.medicineName}) का समय 1 घंटे से ज़्यादा बीत गया है। क्या आपने दवा ले ली है?`
          : `Hi ${member.name}, your ${dose.scheduledTime} medicine (${dose.medicineName}) is overdue by more than 1 hour. Just checking in — did you take it?`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
        Loading Family Care Circle...
      </div>
    );
  }

  const takenCount = selectedMember
    ? selectedMember.doses.filter((d) => d.status === 'TAKEN').length
    : 0;
  const totalCount = selectedMember ? selectedMember.doses.length : 0;
  const adherencePercent =
    totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Perspective Switcher */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-teal-700">
              Family &amp; Caregiver Dashboard (&ldquo;Care Circles&rdquo;)
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Remote Medicine Care for Parents &amp; Elderly Family
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              When a parent marks a dose as taken on their phone, you get an instant update. If a dose is missed by more than 1 hour, you get an alert to check in on them.
            </p>
          </div>

          {/* Switch between Caregiver Dashboard and Elderly Parent Phone View */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl"
              role="group"
              aria-label="Switch between Caregiver and Parent Phone view"
            >
              <button
                type="button"
                onClick={() => setViewMode('caregiver')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'caregiver'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-teal-700" />
                <span>Caregiver Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('parent_phone')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'parent_phone'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                <span>Parent&apos;s Phone View</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddMemberForm((v) => !v)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Parent / Dependent</span>
            </button>
          </div>
        </div>

        {/* Add Parent / Family Member Drawer */}
        {showAddMemberForm && (
          <form
            onSubmit={handleAddMember}
            className="mt-5 p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Add a Parent or Dependent to Your Care Circle
              </h2>
              <button
                type="button"
                onClick={() => setShowAddMemberForm(false)}
                className="text-xs text-slate-500 hover:text-slate-900 underline cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent / Dependent Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Kamalendu Roy"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relation
                </label>
                <input
                  type="text"
                  value={newRelation}
                  onChange={(e) => setNewRelation(e.target.value)}
                  placeholder="e.g., Father (Baba), Mother (Maa)"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age &amp; City
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="Age"
                    className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="City / Town"
                    className="col-span-2 min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent&apos;s WhatsApp / Phone Number
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Health Note / Condition
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="e.g., Diabetes & Blood Pressure"
                    className="flex-1 min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    {isAddingMember ? 'Adding...' : 'Save to Care Circle'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Family Member Selector Strip */}
        <div className="pt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {members.map((member) => {
              const isSelected = selectedMember?.id === member.id;
              const memberTaken = member.doses.filter((d) => d.status === 'TAKEN').length;
              const hasOverdue = member.doses.some(
                (d) => d.status === 'MISSED_OVERDUE'
              );

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`min-h-[46px] px-4 py-2 rounded-xl border text-left transition-colors flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>
                        {member.relation}: {member.name}
                      </span>
                      {hasOverdue && (
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-amber-300' : 'text-red-600'
                          }`}
                        />
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-mono tabular-nums ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {memberTaken}/{member.doses.length} taken today · {member.location}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Language Selector */}
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl"
            role="group"
            aria-label="Language"
          >
            {(
              [
                { id: 'en', label: 'English' },
                { id: 'bn', label: 'বাংলা' },
                { id: 'hi', label: 'हिन्दी' },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onLanguageChange(l.id)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  language === l.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-3 text-xs font-semibold text-teal-900">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-teal-700 hover:text-teal-950 underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* URGENT CAREGIVER HOOK: >1 Hour Missed Dose Alert Banner */}
      {overdueAlerts.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <BellRing className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-red-950">
                Missed Dose Alert (&gt;1 Hour Overdue) — Check In Needed
              </h2>
              <p className="mt-0.5 text-xs text-red-800">
                A scheduled medicine was not marked as taken within 60 minutes of its scheduled time.
              </p>
            </div>
          </div>

          <div className="divide-y divide-red-200/70 border-t border-red-200/70">
            {overdueAlerts.map(({ member, dose }) => (
              <div
                key={dose.id}
                className="py-3.5 first:pt-3.5 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-red-950">
                    {member.relation} ({member.name}) missed {dose.medicineName} ({dose.dosage})
                  </div>
                  <div className="text-xs text-red-800 font-mono tabular-nums">
                    Scheduled for {dose.scheduledTime} ({dose.mealRelation}) · Overdue by{' '}
                    {dose.overdueMinutes || 75} mins
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={buildCheckInWhatsAppUrl(member, dose)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Check In on WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl border border-red-300 bg-white hover:bg-red-100/50 text-red-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call {member.relation.split(' ')[0]}</span>
                  </a>

                  <button
                    type="button"
                    disabled={updatingDoseId === dose.id}
                    onClick={() => handleUpdateDoseStatus(member.id, dose, 'TAKEN')}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Confirm Taken Now</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Optional 1-Click Bar to Assign Currently Scanned Prescription to Selected Parent */}
      {verificationResult && selectedMember && (
        <section className="bg-white border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-700">
            <strong className="text-slate-900">
              Active Scanned Prescription Ready:
            </strong>{' '}
            Assign the {verificationResult.medicines.length} extracted medicine(s) from{' '}
            {verificationResult.doctorName} directly to{' '}
            <strong>
              {selectedMember.name} ({selectedMember.relation})
            </strong>
            .
          </div>
          <button
            type="button"
            onClick={handleAssignCurrentPrescription}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Assign Prescription to {selectedMember.relation.split(' ')[0]}
          </button>
        </section>
      )}

      {/* Main Content Grid: Selected Member Dose Tracker + Live Caregiver Feed */}
      {selectedMember && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Daily Dose Check-In Tracker */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{selectedMember.relation}</span>
                  <span>·</span>
                  <span>{selectedMember.age} yrs</span>
                  <span>·</span>
                  <span>{selectedMember.location}</span>
                </div>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                  {viewMode === 'parent_phone'
                    ? `${selectedMember.name}'s Phone — Tap When You Take Your Medicine`
                    : `${selectedMember.name}'s Daily Medicine Tracker`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedMember.conditionSummary} · {selectedMember.lastCheckInText}
                </p>
              </div>

              {/* Adherence Progress Pill */}
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xs text-slate-500">Today&apos;s Progress</div>
                <div className="text-lg font-bold font-mono tabular-nums text-teal-800">
                  {takenCount}/{totalCount} Taken ({adherencePercent}%)
                </div>
              </div>
            </div>

            {/* Visual Daily Adherence Bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-300"
                style={{ width: `${adherencePercent}%` }}
              />
            </div>

            {/* Dose List */}
            <div className="divide-y divide-slate-200">
              {selectedMember.doses.map((dose) => {
                const isTaken = dose.status === 'TAKEN';
                const isOverdue = dose.status === 'MISSED_OVERDUE';

                return (
                  <div key={dose.id} className="py-4 first:pt-2 last:pb-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-slate-700">
                            {dose.scheduledTime}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="capitalize font-semibold text-teal-800">
                            {dose.slot} ({dose.mealRelation})
                          </span>
                          <span className="text-slate-300">·</span>
                          {isTaken ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Taken at {dose.takenAt}</span>
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 font-bold text-red-700">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Missed &gt;1 hr ({dose.overdueMinutes || 75}m late)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Upcoming / Pending</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900">
                          {dose.medicineName}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            ({dose.dosage})
                          </span>
                        </h3>

                        <p className="text-sm text-slate-800 font-medium leading-relaxed">
                          {dose.instructions[language]}
                        </p>
                      </div>

                      {/* Action Buttons for Parent or Caregiver */}
                      <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                        {!isTaken ? (
                          <button
                            type="button"
                            disabled={updatingDoseId === dose.id}
                            onClick={() =>
                              handleUpdateDoseStatus(selectedMember.id, dose, 'TAKEN')
                            }
                            className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {updatingDoseId === dose.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                            <span>
                              {viewMode === 'parent_phone'
                                ? 'I Took This Medicine'
                                : 'Mark as Taken'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingDoseId === dose.id}
                            onClick={() =>
                              handleUpdateDoseStatus(selectedMember.id, dose, 'PENDING')
                            }
                            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                          >
                            Undo Taken
                          </button>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              playInstructionAudio(
                                dose.id,
                                `${dose.medicineName}. ${dose.instructions[language]}`
                              )
                            }
                            className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                          >
                            {speakingId === dose.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                            )}
                            <span>Listen</span>
                          </button>

                          {!isOverdue && !isTaken && viewMode === 'caregiver' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateDoseStatus(
                                  selectedMember.id,
                                  dose,
                                  'MISSED_OVERDUE'
                                )
                              }
                              className="min-h-[36px] px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-[11px] font-semibold text-amber-900 cursor-pointer"
                              title="Test what happens when a parent misses a dose by over 1 hour"
                            >
                              Test &gt;1hr Missed Alert
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right 5 Columns: Live Caregiver Daily Status Updates */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Caregiver Daily Status Updates
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Real-time log when parents take a dose or miss a scheduled time by &gt;1 hour
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {activities.map((act) => (
                <div key={act.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`font-bold ${
                        act.type === 'MISSED_ALERT'
                          ? 'text-red-700'
                          : act.type === 'DOSE_TAKEN'
                            ? 'text-emerald-700'
                            : 'text-teal-700'
                      }`}
                    >
                      {act.type === 'MISSED_ALERT'
                        ? 'Missed Dose Alert (>1 hr)'
                        : act.type === 'DOSE_TAKEN'
                          ? 'Dose Marked Taken'
                          : 'Care Circle Update'}
                    </span>
                    <span className="font-mono text-slate-400">{act.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {act.message}
                  </p>
                </div>
              ))}
            </div>

            {/* 1-Tap Caregiver Summary Share */}
            <div className="pt-3 border-t border-slate-200">
              <a
                href={`https://wa.me/${selectedMember.caregiverPhone.replace(
                  /[^0-9]/g,
                  ''
                )}?text=${encodeURIComponent(
                  `[Medi-Verify Care Circle] ${selectedMember.name} (${selectedMember.relation}): ${takenCount}/${totalCount} medicines taken today (${adherencePercent}%). Latest: ${selectedMember.lastCheckInText}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <span>Send Daily Status Update to Family WhatsApp</span>
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
