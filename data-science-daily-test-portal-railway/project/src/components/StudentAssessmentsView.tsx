import React, { useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Lock,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { Student, Submission, SYLLABUS } from "../types.js";
import { ASSESSMENT_PRESETS, SubjectAssessment } from "../assessmentsData.js";

interface StudentAssessmentsViewProps {
  student: Student;
  submissions: Submission[];
  assessments: any[];
  overrides: any[];
  onProgressSubmit: () => void;
  scheduledTests?: any[];
  scheduledSubmissions?: any[];
}

export default function StudentAssessmentsView({
  student,
  submissions,
  assessments,
  overrides,
  onProgressSubmit,
  scheduledTests = [],
  scheduledSubmissions = []
}: StudentAssessmentsViewProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [step, setStep] = useState<"list" | "quiz" | "view-answers" | "scheduled-quiz">("list");
  const [subTab, setSubTab] = useState<"comprehensive" | "scheduled">("scheduled");
  const [testTypeFilter, setTestTypeFilter] = useState<"all" | "weekly" | "monthly">("all");

  // Local state for active running scheduled (weekly / monthly) test
  const [activeSched, setActiveSched] = useState<any | null>(null);
  const [schedMCQAnswers, setSchedMCQAnswers] = useState<Record<number, number>>({});
  const [schedCodingAnswers, setSchedCodingAnswers] = useState<Record<number, string>>({});
  const [schedCurrentMCQIndex, setSchedCurrentMCQIndex] = useState<number>(0);
  const [schedResult, setSchedResult] = useState<{ score: number; passed: boolean } | null>(null);

  // In-progress test states
  const [currentMCQIndex, setCurrentMCQIndex] = useState(0);
  const [selectedMCQ, setSelectedMCQ] = useState<Record<number, number>>({});
  const [codingAnswers, setCodingAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCodeEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, onChange: (val: string) => void) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, start) + "    " + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    } else if (e.key === '(') {
      e.preventDefault();
      const newValue = value.substring(0, start) + "()" + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    } else if (e.key === '[') {
      e.preventDefault();
      const newValue = value.substring(0, start) + "[]" + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    } else if (e.key === '{') {
      e.preventDefault();
      const newValue = value.substring(0, start) + "{}" + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    } else if (e.key === '"' || e.key === "'") {
      e.preventDefault();
      const newValue = value.substring(0, start) + e.key + e.key + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
  };
  
  // Results display state
  const [finishedQuizResult, setFinishedQuizResult] = useState<{
    score: number;
    passed: boolean;
    mcqScore: number;
    codingScore: number;
  } | null>(null);

  // Simple checks helper
  const getSubjectCompletionStatus = (slug: string) => {
    // Check how many days the student has submitted in this subject
    const chapter = SYLLABUS.find(s => s.slug === slug);
    if (!chapter) return { completed: false, count: 0 };
    
    const subjectSubmissions = submissions.filter(sub => sub.courseSlug === slug);
    // Student completed topic if they have at least 1 submission for demonstration purposes
    return {
      completed: subjectSubmissions.length > 0,
      count: subjectSubmissions.length
    };
  };

  const getAssessmentRecord = (slug: string) => {
    return assessments.find(asm => asm.courseSlug === slug);
  };

  const getSubjectOverride = (slug: string) => {
    return overrides.find(o => o.courseSlug === slug);
  };

  const startAssessment = (slug: string) => {
    const preset = ASSESSMENT_PRESETS[slug];
    if (!preset) return;

    setActiveSlug(slug);
    setCurrentMCQIndex(0);
    setSelectedMCQ({});
    
    // Set up coding questions with starter templates
    const starters: Record<number, string> = {};
    preset.coding.forEach((q, idx) => {
      starters[idx] = q.starterCode || "def solution():\n    pass";
    });
    setCodingAnswers(starters);
    setFinishedQuizResult(null);
    setErrorMessage(null);
    setStep("quiz");
  };

  const startScheduledAssessment = (testObj: any) => {
    setActiveSched(testObj);
    setSchedMCQAnswers({});
    setSchedCurrentMCQIndex(0);
    const starters: Record<number, string> = {};
    (testObj.coding || []).forEach((q: any, idx: number) => {
      starters[idx] = q.starterCode || "def solution():\n    pass";
    });
    setSchedCodingAnswers(starters);
    setSchedResult(null);
    setErrorMessage(null);
    setStep("scheduled-quiz");
  };

  const handleSubmitScheduledAssessment = async () => {
    if (!activeSched) return;
    
    // Warn if missing MCQ answers
    const unansweredMCQ = (activeSched.mcqs || []).some((_: any, idx: number) => schedMCQAnswers[idx] === undefined);
    if (unansweredMCQ) {
      if (!window.confirm("You have unanswered multiple-choice questions. Submit test anyway?")) {
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Calculate score: 50% max for MCQs, 50% max for coding splits
    let mcqScorePct = 0;
    const mcqCount = activeSched.mcqs?.length || 0;
    if (mcqCount > 0) {
      let correctMatches = 0;
      activeSched.mcqs.forEach((mcq: any, idx: number) => {
        if (schedMCQAnswers[idx] === mcq.correctOption) {
          correctMatches++;
        }
      });
      mcqScorePct = Math.round((correctMatches / mcqCount) * 50);
    } else {
      mcqScorePct = 50; // default full marks if no MCQs requested
    }

    let codingScorePct = 0;
    const codingCount = activeSched.coding?.length || 0;
    if (codingCount > 0) {
      let acceptedCodingCount = 0;
      activeSched.coding.forEach((codeQ: any, idx: number) => {
        const textCode = schedCodingAnswers[idx] || "";
        if (textCode.length > 15) {
          const matchedKeywords = (codeQ.expectedKeywords || []).filter((k: string) => textCode.includes(k));
          const matchRatio = codeQ.expectedKeywords?.length ? (matchedKeywords.length / codeQ.expectedKeywords.length) : 1;
          if (matchRatio >= 0.75) {
            acceptedCodingCount += 1;
          } else if (matchRatio >= 0.25) {
            acceptedCodingCount += 0.6;
          } else {
            acceptedCodingCount += 0.3; // partial attempt
          }
        }
      });
      codingScorePct = Math.round((acceptedCodingCount / codingCount) * 50);
    } else {
      codingScorePct = 50; // default full marks if no coding exercises
    }

    const finalPercent = mcqScorePct + codingScorePct;
    const isPassed = finalPercent >= 60;

    try {
      const res = await fetch(`/api/scheduled-tests/${activeSched.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          batch: student.batch,
          mcqAnswers: schedMCQAnswers,
          codingAnswers: Object.values(schedCodingAnswers),
          score: finalPercent
        })
      });

      if (res.ok) {
        setSchedResult({
          score: finalPercent,
          passed: isPassed
        });
        onProgressSubmit(); // refresh student context dynamically
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to submit evaluation exam.");
      }
    } catch (e) {
      setErrorMessage("Network connection timed out during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPreset = activeSlug ? ASSESSMENT_PRESETS[activeSlug] : null;

  const handleSubmitAssessment = async () => {
    if (!currentPreset || !activeSlug) return;

    // Check completeness
    if (Object.keys(selectedMCQ).length < currentPreset.mcqs.length) {
      if (!window.confirm("You have unanswered multiple-choice questions. Do you want to submit anyway?")) {
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Calculate score
    // 5 MCQs = 50% max (10% each)
    let mcqPoints = 0;
    currentPreset.mcqs.forEach((mcq, idx) => {
      if (selectedMCQ[idx] === mcq.correctOption) {
        mcqPoints += 10;
      }
    });

    // 2 Coding questions = 50% max (25% each)
    let codingPoints = 0;
    currentPreset.coding.forEach((codeQ, idx) => {
      const ans = codingAnswers[idx] || "";
      if (ans.trim().length > 15) {
        // basic keyword verification
        const matchedKeywords = codeQ.expectedKeywords.filter(k => ans.includes(k));
        const matchRatio = matchedKeywords.length / codeQ.expectedKeywords.length;
        if (matchRatio >= 0.75) {
          codingPoints += 25;
        } else if (matchRatio >= 0.25) {
          codingPoints += 15;
        } else {
          codingPoints += 8; // small credit for attempting
        }
      }
    });

    const finalScore = mcqPoints + codingPoints;
    const passed = finalScore >= 60;

    try {
      const res = await fetch("/api/assessments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          batch: student.batch,
          courseSlug: activeSlug,
          score: finalScore
        })
      });

      if (res.ok) {
        setFinishedQuizResult({
          score: finalScore,
          passed,
          mcqScore: mcqPoints,
          codingScore: codingPoints
        });
        setStep("quiz");
        onProgressSubmit(); // refresh context
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to submit assessment to server.");
      }
    } catch (e) {
      setErrorMessage("Network connection failure during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "view-answers" && currentPreset) {
    const scoreRecord = getAssessmentRecord(activeSlug!);
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto overflow-hidden animate-fade-in">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider block w-fit mb-1">
              Assessment Results & Reference Key
            </span>
            <h4 className="text-lg font-black tracking-tight">{currentPreset.courseName} Solutions</h4>
          </div>
          <button
            onClick={() => {
              setStep("list");
              setActiveSlug(null);
            }}
            className="text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded transition font-bold text-xs cursor-pointer"
          >
            Close Key
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-150 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-850 font-bold block">Final Status</span>
              <p className="text-xs text-slate-600">This assessment is complete and locked. No edits, modifications, or retakes are allowed.</p>
            </div>
            {scoreRecord && (
              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Your Score</span>
                <span className={`text-xl font-black ${scoreRecord.score >= 60 ? "text-emerald-700" : "text-amber-700"}`}>
                  {scoreRecord.score}%
                </span>
              </div>
            )}
          </div>

          {/* Part A: MCQs and Correct Answers */}
          <div className="space-y-6">
            <h5 className="text-xs font-black uppercase tracking-wide text-indigo-950 font-mono border-b pb-2">
              Part A: Multiple Choices - Correct Answers
            </h5>
            <div className="space-y-4">
              {currentPreset.mcqs.map((mcq, mIdx) => (
                <div key={mIdx} className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-400 text-[10px] uppercase font-mono">Question {mIdx + 1} of 5</span>
                  <p className="font-bold text-slate-900 text-sm leading-relaxed">{mcq.questionText}</p>
                  
                  <div className="grid grid-cols-1 gap-2 text-xs font-sans">
                    {mcq.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === mcq.correctOption;
                      return (
                        <div
                          key={oIdx}
                          className={`p-3.5 rounded-lg border flex items-center gap-3 font-medium transition ${
                            isCorrect
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                              : "bg-white border-slate-150 text-slate-550"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${
                            isCorrect ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-slate-50 text-slate-350"
                          }`}>
                            {isCorrect ? "✓" : ""}
                          </div>
                          <span>{opt}</span>
                          {isCorrect && (
                            <span className="ml-auto text-[9px] font-bold font-mono text-emerald-700 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">
                              Correct Key
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 bg-indigo-50/40 p-3.5 rounded-lg border border-indigo-100 text-xs font-sans">
                    <strong className="text-indigo-950 block mb-1">Explanation:</strong>
                    <p className="text-slate-600 leading-relaxed font-sans">{mcq.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Part B: Coding and Model Solutions */}
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <h5 className="text-xs font-black uppercase tracking-wide text-indigo-950 font-mono border-b pb-2">
              Part B: Descriptive Coding Tasks - Model Solutions
            </h5>

            <div className="space-y-6">
              {currentPreset.coding.map((q, idx) => (
                <div key={idx} className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900">Coding challenge #{idx + 1} of 2</span>
                  </div>

                  <p className="font-bold text-slate-950 text-sm leading-relaxed">
                    {q.questionText}
                  </p>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-850 block uppercase font-mono">
                      Expected Validation Keywords:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {q.expectedKeywords.map((kw, kwIdx) => (
                        <span key={kwIdx} className="font-mono text-[9px] bg-slate-250 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-300/40">
                          "{kw}"
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-emerald-800 block uppercase font-mono">
                      Model Python Solution Code:
                    </span>
                    <pre className="w-full bg-slate-900 text-emerald-300 font-mono text-xs p-4 rounded-lg border-none overflow-x-auto leading-relaxed">
                      <code>{q.solutionDescription}</code>
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={() => {
                setStep("list");
                setActiveSlug(null);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg text-xs tracking-tight transition cursor-pointer"
            >
              Return to Assessments List
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "scheduled-quiz" && activeSched) {
    if (schedResult) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 animate-fade-in text-center">
          <div className="inline-flex p-4 rounded-full bg-indigo-50 text-indigo-650 mb-1">
            <Award className="w-12 h-12 text-indigo-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Evaluation Exam Recorded!
          </h3>
          <p className="text-sm text-slate-500 font-sans max-w-md mx-auto">
            Your custom {activeSched.testType} examination answer script for <strong>{activeSched.title}</strong> was successfully gathered and calculated in databases.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-slate-100 font-mono text-center max-w-md mx-auto">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1 font-mono">My Score</span>
              <span className={`text-2xl font-black ${schedResult.passed ? "text-emerald-600" : "text-amber-600"}`}>
                {schedResult.score}%
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-center items-center">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1 font-mono">Result Status</span>
              <span className={`text-sm font-bold uppercase ${schedResult.passed ? "text-emerald-600 font-extrabold" : "text-amber-600"}`}>
                {schedResult.passed ? "✓ MET REQUIREMENT" : "RETAKE ADVISED"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border text-xs leading-relaxed max-w-lg mx-auto bg-slate-50 border-slate-200 text-left">
            <h5 className="font-bold text-slate-900 mb-1">Syllabus Evaluation Completion:</h5>
            <p className="text-slate-500">This baseline evaluation score has been recorded into student placement transcripts. Classroom management Vinay was updated with your completed test script metrics.</p>
          </div>

          <button
            onClick={() => {
              setStep("list");
              setActiveSched(null);
              setSchedResult(null);
            }}
            className="bg-slate-950 hover:bg-slate-850 text-white font-mono font-bold text-xs py-2.5 px-6 rounded-lg transition tracking-wide uppercase cursor-pointer shadow-xs mt-2"
          >
            Back to Assessment Dashboard
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto overflow-hidden animate-fade-in text-left">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white flex justify-between items-center border-b border-indigo-950">
          <div>
            <span className="bg-indigo-500/30 text-indigo-300 font-mono text-[9px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider block w-fit mb-1 border border-indigo-700/40">
              Academic Scheduled {activeSched.testType === "weekly" ? "Weekly" : "Monthly"} Evaluation
            </span>
            <h4 className="text-lg font-black tracking-tight text-white font-sans">{activeSched.title}</h4>
            <p className="text-[11px] text-slate-300 mt-1 font-mono">Syllabus Area: {activeSched.topic}</p>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Abandon evaluation examination? Answers will be lost.")) {
                setStep("list");
                setActiveSched(null);
              }
            }}
            className="text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded transition font-mono font-bold text-xs cursor-pointer border border-transparent hover:border-white/20"
          >
            Abandon Exam
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Part A: MCQs (if exist) */}
          {activeSched.mcqs && activeSched.mcqs.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h5 className="text-xs font-black uppercase tracking-widest text-indigo-950 font-mono">
                  Part A: Core Theory Evaluation ({activeSched.mcqs.length} MCQs &bull; 50% Weights)
                </h5>
                <div className="flex gap-1">
                  {activeSched.mcqs.map((_: any, mIdx: number) => (
                    <button
                      key={mIdx}
                      onClick={() => setSchedCurrentMCQIndex(mIdx)}
                      className={`w-6 h-6 rounded-full font-mono text-[10px] font-bold border transition cursor-pointer ${
                        schedCurrentMCQIndex === mIdx
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : schedMCQAnswers[mIdx] !== undefined
                          ? "bg-slate-100 border-slate-200 text-slate-800"
                          : "bg-white border-slate-150 text-slate-450 hover:border-slate-300"
                      }`}
                    >
                      {mIdx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Selected MCQ */}
              <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 space-y-4">
                <span className="font-bold text-slate-400 text-[10px] uppercase font-mono">Theory Question {schedCurrentMCQIndex + 1} of {activeSched.mcqs.length}</span>
                <p className="font-bold text-slate-900 text-sm leading-relaxed">
                  {activeSched.mcqs[schedCurrentMCQIndex].questionText}
                </p>

                <div className="grid grid-cols-1 gap-2 text-xs font-sans">
                  {activeSched.mcqs[schedCurrentMCQIndex].options.map((opt: string, oIdx: number) => {
                    const isSelected = schedMCQAnswers[schedCurrentMCQIndex] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => setSchedMCQAnswers(prev => ({ ...prev, [schedCurrentMCQIndex]: oIdx }))}
                        className={`w-full text-left p-3.5 rounded-lg border transition flex items-center gap-3 font-medium cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold shadow-xs"
                            : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 font-bold text-[9px] ${
                          isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && "✓"}
                        </div>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    disabled={schedCurrentMCQIndex === 0}
                    onClick={() => setSchedCurrentMCQIndex(prev => prev - 1)}
                    className="px-3 py-1.5 rounded bg-white border text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous MCQ
                  </button>

                  <button
                    type="button"
                    disabled={schedCurrentMCQIndex === activeSched.mcqs.length - 1}
                    onClick={() => setSchedCurrentMCQIndex(prev => prev + 1)}
                    className="px-3 py-1.5 rounded bg-white border text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    Next MCQ <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Part B: Coding (if present) */}
          {activeSched.coding && activeSched.coding.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h5 className="text-xs font-black uppercase tracking-widest text-indigo-950 font-mono">
                Part B: Practical Program Compilation ({activeSched.coding.length} tasks &bull; 50% Weights)
              </h5>

              <div className="space-y-6">
                {activeSched.coding.map((q: any, idx: number) => (
                  <div key={idx} className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 uppercase tracking-wide">Programming Task #{idx + 1}</span>
                      <span className="font-mono text-[9px] bg-slate-205 bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-black border border-slate-300/40">
                        Syllabus Checkpoint
                      </span>
                    </div>

                    <p className="font-bold text-slate-950 text-sm leading-relaxed">
                      {q.questionText}
                    </p>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-indigo-805 text-indigo-850 block uppercase font-mono">
                        Write Python Solution Code:
                      </span>
                      <textarea
                        rows={5}
                        className="w-full bg-slate-900 text-emerald-350 font-mono text-xs p-4 rounded-lg border-none focus:ring-1 focus:ring-indigo-400 outline-none leading-relaxed"
                        value={schedCodingAnswers[idx] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedCodingAnswers(prev => ({ ...prev, [idx]: val }));
                        }}
                        onKeyDown={(e) => handleCodeEditorKeyDown(e, (val) => setSchedCodingAnswers(prev => ({ ...prev, [idx]: val })))}
                        placeholder="def solution_fn():..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSubmitScheduledAssessment}
              disabled={isSubmitting}
              className={`font-black text-xs uppercase tracking-wider text-white px-8 py-3 rounded-lg shadow-sm transition flex items-center gap-2 ${
                isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-indigo-650 hover:bg-indigo-700 cursor-pointer"
              }`}
            >
              {isSubmitting ? "Uploading Answers..." : "Submit Finished Script"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "quiz" && currentPreset) {
    // Active Assessment running
    const mcqLen = currentPreset.mcqs.length;
    
    if (finishedQuizResult) {
      // Show summary of result
      return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-md max-w-2xl mx-auto space-y-6 animate-fade-in animate-scale-up">
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-indigo-50 text-indigo-600 mb-2">
              <Award className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Assessment Submitted Successfully
            </h3>
            <p className="text-sm text-slate-500">
              {currentPreset.courseName} Technical Evaluation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-y border-slate-100 font-mono text-center">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Total Score</span>
              <span className={`text-2xl font-black ${finishedQuizResult.passed ? "text-emerald-600" : "text-amber-600"}`}>
                {finishedQuizResult.score}%
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">MCQ Section</span>
              <span className="text-2xl font-black text-slate-800">
                {finishedQuizResult.mcqScore} / 50
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Descriptive Code</span>
              <span className="text-2xl font-black text-slate-800">
                {finishedQuizResult.codingScore} / 50
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border flex gap-3 items-center text-xs leading-relaxed max-w-xl mx-auto bg-slate-50 border-slate-200">
            {finishedQuizResult.passed ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h5 className="font-bold text-slate-900">ELIGIBILITY UNLOCKED (Passed with {finishedQuizResult.score}%)</h5>
                  <p className="text-slate-500">Congratulations! You have surpassed the minimum required score of 60%. Your account is now fully eligible for the live AI Mock Interview of <strong>{currentPreset.courseName}</strong>.</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h5 className="font-bold text-slate-900">ELIGIBILITY TIMED-OUT (Scored {finishedQuizResult.score}%)</h5>
                  <p className="text-slate-500">You did not reach the minimum threshold of 60% on this attempt. Please review your material under the daily curriculum days and click Retake when ready, or ask instructor Vinay for assistance.</p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setStep("list");
                setActiveSlug(null);
                setFinishedQuizResult(null);
              }}
              className="bg-slate-950 hover:bg-slate-850 text-white font-bold py-2 px-6 rounded-lg transition text-xs"
            >
              Return to Subject Assessments List
            </button>
          </div>
        </div>
      );
    }

    // Render questions taking phase
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto overflow-hidden animate-fade-in">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 font-mono text-[9px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider block w-fit mb-1">
              SUBJECT COMPREHENSIVE EXAM
            </span>
            <h4 className="text-lg font-black tracking-tight">{currentPreset.courseName} Assessment</h4>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Abandon current assessment? Changes will not be saved.")) {
                setStep("list");
                setActiveSlug(null);
              }
            }}
            className="text-white/70 hover:text-white font-bold text-xs bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded transition"
          >
            Cancel Exam
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* MCQ SECTION (5 questions) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h5 className="text-xs font-black uppercase tracking-wide text-indigo-900 font-mono">
                Part A: Core Concept Multiple Choices (5 Questions &bull; 50%)
              </h5>
              <div className="flex gap-1">
                {currentPreset.mcqs.map((_, mIdx) => (
                  <button
                    key={mIdx}
                    onClick={() => setCurrentMCQIndex(mIdx)}
                    className={`w-6 h-6 rounded-full font-mono text-[10px] font-bold border transition ${
                      currentMCQIndex === mIdx
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : selectedMCQ[mIdx] !== undefined
                        ? "bg-slate-100 border-slate-200 text-slate-800"
                        : "bg-white border-slate-150 text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {mIdx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Render single MCQ question */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 space-y-4">
              <span className="font-bold text-slate-400 text-[10px] uppercase font-mono">Question {currentMCQIndex + 1} of 5</span>
              <p className="font-bold text-slate-950 text-sm leading-relaxed">
                {currentPreset.mcqs[currentMCQIndex].questionText}
              </p>

              <div className="grid grid-cols-1 gap-2.5 text-xs font-sans">
                {currentPreset.mcqs[currentMCQIndex].options.map((opt, oIdx) => {
                  const isSelected = selectedMCQ[currentMCQIndex] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => setSelectedMCQ(prev => ({ ...prev, [currentMCQIndex]: oIdx }))}
                      className={`w-full text-left p-3.5 rounded-lg border transition flex items-center gap-3 font-medium ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 font-bold text-[9px] ${
                        isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && "✓"}
                      </div>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation within MCQs */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  disabled={currentMCQIndex === 0}
                  onClick={() => setCurrentMCQIndex(prev => prev - 1)}
                  className="px-3 py-1.5 rounded bg-white border text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous MCQ
                </button>

                <button
                  type="button"
                  disabled={currentMCQIndex === mcqLen - 1}
                  onClick={() => setCurrentMCQIndex(prev => prev + 1)}
                  className="px-3 py-1.5 rounded bg-white border text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next MCQ <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* CODING SECTION (2 questions) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h5 className="text-xs font-black uppercase tracking-wide text-indigo-900 font-mono">
              Part B: Advanced Descriptive Coding Tasks (2 Questions &bull; 50%)
            </h5>

            <div className="space-y-6">
              {currentPreset.coding.map((q, idx) => (
                <div key={idx} className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-bold text-slate-900">Coding challenge #{idx + 1} of 2</span>
                    <span className="font-medium font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      25 Points
                    </span>
                  </div>

                  <p className="font-bold text-slate-950 text-sm leading-relaxed">
                    {q.questionText}
                  </p>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-800 block uppercase font-mono">
                      Write Clean Python Code:
                    </span>
                    <textarea
                      rows={4}
                      className="w-full bg-slate-900 text-indigo-300 font-mono text-xs p-3.5 rounded-lg border-none focus:ring-1 focus:ring-indigo-400 outline-none"
                      value={codingAnswers[idx] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCodingAnswers(prev => ({ ...prev, [idx]: val }));
                      }}
                      onKeyDown={(e) => handleCodeEditorKeyDown(e, (val) => setCodingAnswers(prev => ({ ...prev, [idx]: val })))}
                      placeholder="def solution_fn():..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={handleSubmitAssessment}
              disabled={isSubmitting}
              className={`font-bold text-sm text-white px-8 py-3 rounded-lg shadow-md transition flex items-center gap-2 ${
                isSubmitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-indigo-650 hover:bg-indigo-700 cursor-pointer"
              }`}
            >
              {isSubmitting ? "Evaluating Submissions..." : "Submit Completed Assessment"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Syllabus list with locked/unlocked assessments
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub tabs switcher */}
      <div className="flex border border-slate-200 gap-1 bg-slate-50 p-1.5 rounded-xl">
        <button
          onClick={() => setSubTab("scheduled")}
          className={`flex-1 py-3 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
            subTab === "scheduled"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-500 hover:text-slate-850"
          }`}
        >
          📅 Weekly / Monthly Tests ({scheduledTests.length})
        </button>
        <button
          onClick={() => setSubTab("comprehensive")}
          className={`flex-1 py-3 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
            subTab === "comprehensive"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-500 hover:text-slate-850"
          }`}
        >
          🏆 Chapter Comprehensive Exams
        </button>
      </div>

      {subTab === "scheduled" ? (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 text-left">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Syllabus Scheduled Evaluations (Weekly / Monthly)
              </h3>
              <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                Assessments and periodic checkpoint testing as assigned directly by your instructor of the <strong>Quality Thought Elite Data Science Master Program</strong>.
              </p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-150 text-xs shrink-0 font-medium font-mono text-indigo-805">
              Passing criteria: <span className="font-extrabold text-indigo-700">60% Clearance</span>
            </div>
          </div>

          {/* Sub-segmented filter for Weekly and Monthly Mock Tests */}
          <div className="flex flex-wrap border border-slate-150 gap-1 bg-slate-50/50 p-1 rounded-xl w-full sm:w-fit text-left">
            <button
              onClick={() => setTestTypeFilter("all")}
              className={`px-4 py-2 text-[10.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                testTypeFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              All Tests ({scheduledTests.length})
            </button>
            <button
              onClick={() => setTestTypeFilter("weekly")}
              className={`px-4 py-2 text-[10.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                testTypeFilter === "weekly"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              Weekly Mock Tests ({scheduledTests.filter(t => t.testType === "weekly").length})
            </button>
            <button
              onClick={() => setTestTypeFilter("monthly")}
              className={`px-4 py-2 text-[10.5px] uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                testTypeFilter === "monthly"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              Monthly Mock Tests ({scheduledTests.filter(t => t.testType === "monthly").length})
            </button>
          </div>

          {(() => {
            const filteredScheduledTestsBySubtype = scheduledTests.filter(test => {
              if (testTypeFilter === "all") return true;
              return test.testType === testTypeFilter;
            });

            if (filteredScheduledTestsBySubtype.length === 0) {
              return (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-1">
                  <p>No {testTypeFilter === "all" ? "" : testTypeFilter} mock tests exist currently.</p>
                  <p className="text-[10px] text-slate-350">Wait for your course administrator Vinay to launch new scheduled questions.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredScheduledTestsBySubtype.map((test: any) => {
                  const sub = scheduledSubmissions.find((s: any) => s.testId === test.id);
                  const testStatusColor = test.isActive
                    ? "text-emerald-700 border-emerald-250 bg-emerald-50"
                    : "text-amber-700 border-amber-250 bg-amber-50";

                  return (
                    <div
                      key={test.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-5 hover:shadow-md transition-all text-left animate-fade-in"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[8.5px] font-black uppercase font-mono tracking-widest ${
                              test.testType === "weekly" ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-emerald-100 text-emerald-800 border border-emerald-205"
                            }`}>
                              {test.testType} EXAM
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm mt-1 flex items-center gap-1">
                              {test.title}
                            </h4>
                            <span className="text-[10.5px] text-slate-400 font-mono block">
                              Assigned Course Syllabus Section: <span className="font-bold text-slate-600">{test.courseSlug?.toUpperCase()}</span>
                            </span>
                          </div>
                          <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded border uppercase shrink-0 ${testStatusColor}`}>
                            {test.isActive ? "Online" : "Inactive"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed font-sans mt-1">
                          <strong>Evaluation syllabus topics:</strong> {test.topic}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded">⏰ {test.durationMinutes} Minutes</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded">📝 { (test.mcqs?.length || 0) + (test.coding?.length || 0) } Total Questions</span>
                        </div>
                      </div>

                      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                        {sub ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-black px-3 py-1 rounded-full text-[9.5px]/none font-mono">
                              ✓ SUCCESS: {sub.score}%
                            </span>
                            <span className="text-[10px] text-slate-400 italic">Submitted {new Date(sub.submittedAt).toLocaleDateString()}</span>
                          </div>
                        ) : test.isActive ? (
                          <button
                            onClick={() => startScheduledAssessment(test)}
                            className="text-xs font-mono font-bold py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-750 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            ✍️ Start Baseline Exam
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Evaluation closed/suspended by teacher</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 text-left">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Comprehensive Chapter Milestone Exams
              </h3>
              <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                Students must pass each subject's Comprehensive Assessment with **minimum 60%** to unlock the AI Interview. Complete daily curriculum quizzes to activate the assessment.
              </p>
            </div>
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs shrink-0 font-medium">
              Passing Threshold: <span className="font-extrabold text-indigo-700 font-mono">60 / 100 PTS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SYLLABUS.map((course) => {
          const checkStatus = getSubjectCompletionStatus(course.slug);
          const scoreRecord = getAssessmentRecord(course.slug);
          const overrideStatus = getSubjectOverride(course.slug);          // We check if the course assessment is available in ASSESSMENTS_PRESETS
          const hasPreset = !!ASSESSMENT_PRESETS[course.slug];
          
          // Check status of python completion
          const pythonStatus = getSubjectCompletionStatus("python");
          const isPythonCompleted = pythonStatus.count >= 1; // Completed at least one day or has completed status

          // Check override state
          const hasBypass = !!overrideStatus?.eligibilityBypass;
          const hasPythonBypass = !!overrides.find(o => o.courseSlug === "python")?.eligibilityBypass;

          // Standard unlock condition (need daily submissions for this course)
          const isSyllabusDone = checkStatus.completed;

          // Auth check: Is this student allowed to take this test?
          // (a) They completed python syllabus OR have direct bypass on python syllabus OR the course is python itself
          // AND
          // (b) They completed this specific subject's syllabus OR have direct subject bypass
          const isAuthorizedToTest = hasBypass || (((isPythonCompleted || hasPythonBypass) || course.slug === "python") && isSyllabusDone);

          const isUnlocked = isAuthorizedToTest;

          // Compute final status labels
          let isEligible = false;
          let statusText = "Locked Exam";
          let statusColor = "text-slate-400 border-slate-200 bg-slate-50";

          if (scoreRecord) {
            isEligible = scoreRecord.score >= 60 || hasBypass;
            statusText = `Attempted: ${scoreRecord.score}% (${scoreRecord.score >= 60 ? "PASSED" : "FAILED"})`;
            statusColor = scoreRecord.score >= 60
              ? "text-emerald-700 border-emerald-200 bg-emerald-50"
              : "text-amber-700 border-amber-200 bg-amber-50";
          } else if (isUnlocked) {
            statusText = "Ready to Take Exam";
            statusColor = "text-indigo-700 border-indigo-200 bg-indigo-50 animate-pulse-slow";
          } else if (!isPythonCompleted && course.slug !== "python" && !hasPythonBypass) {
            statusText = "Blocked: Complete Python";
            statusColor = "text-rose-700 border-rose-200 bg-rose-50";
          }

          // Override grants direct eligibility
          if (hasBypass) {
            isEligible = true;
          }

          return (
            <div
              key={course.slug}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between gap-5 transition-all ${
                isUnlocked ? "border-slate-250 hover:shadow-md animate-fadeIn" : "border-slate-150 bg-slate-50/55"
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      {course.name} Assessment
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Days {course.startDay} - {course.endDay} &bull; {checkStatus.count} Completed Quizzes
                    </span>
                  </div>

                  <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded border ${statusColor} shrink-0 uppercase`}>
                    {statusText}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-sans">{course.description}</p>

                {/* Eligibility Indicators */}
                <div className="flex flex-wrap gap-2 text-[10px] items-center">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider block mr-1 font-mono">STATUS:</span>
                  
                  {isEligible ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[9px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ELIGIBLE FOR AI INTERVIEW
                    </span>
                  ) : scoreRecord ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[9px]">
                      <XCircle className="w-3.5 h-3.5" /> SCORE UNDER 60%
                    </span>
                  ) : !isPythonCompleted && course.slug !== "python" && !hasPythonBypass ? (
                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-850 font-bold px-2.5 py-1 rounded-full text-[9px]">
                      <Lock className="w-3 h-3" /> REQUIRES PYTHON MODULE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full text-[9px]">
                      <Lock className="w-3 h-3" /> NO SCORE RECORDED
                    </span>
                  )}

                  {hasBypass && (
                    <span className="inline-flex items-center gap-0.5 bg-purple-100 text-purple-800 font-mono font-semibold px-2 py-0.5 rounded-full text-[9px]" title="Instructor bypassed constraints">
                      ★ BYPASS ENABLED
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 bg-transparent shrink-0">
                {isUnlocked ? (
                  <div className="flex justify-between items-center w-full">
                    {scoreRecord ? (
                      <button
                        onClick={() => {
                          setActiveSlug(course.slug);
                          setStep("view-answers");
                        }}
                        className="text-xs font-bold py-2 px-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-250 hover:bg-emerald-100/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>View Correct Answers</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startAssessment(course.slug)}
                        disabled={!hasPreset}
                        className="text-xs font-bold py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-750 text-white border border-transparent shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        <Play className="w-3 h-3 fill-current shrink-0" />
                        <span>Start Assessment</span>
                      </button>
                    )}
                    {!hasPreset && (
                      <span className="text-[10px] text-amber-600 italic font-medium">Under construction</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {!isPythonCompleted && course.slug !== "python" && !hasPythonBypass ? (
                      <div className="flex items-start gap-1.5 text-rose-700 text-[11px] font-sans bg-rose-50/50 p-2 rounded-lg border border-rose-100/40">
                        <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>Locked: You must complete the <strong>Python daily syllabus</strong> first before attempting other subject tests (or request a bypass from Instructor Vinay).</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5 text-slate-400 text-[11px] font-sans">
                        <Lock className="w-3.5 h-3.5 text-slate-350 shrink-0 mt-0.5" />
                        <span>Locked: Complete today's daily quizzes inside this chapter to activate this assessment.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
          </div>
        </div>
      )}
    </div>
  );
}
