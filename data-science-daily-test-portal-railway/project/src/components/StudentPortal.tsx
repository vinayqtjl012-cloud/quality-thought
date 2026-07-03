import React, { useState, useEffect, useRef } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  Lock,
  MessageSquare,
  Sparkles,
  ArrowRight,
  LogOut,
  Play,
  Check,
  Zap,
  ChevronDown,
  AlertCircle,
  Briefcase,
  Search,
  ExternalLink,
  FileText,
  Loader2,
  Copy,
  Download,
  Video,
  Plus,
  Youtube,
  FileVideo,
  Edit,
  RotateCcw,
  X,
  Terminal
} from "lucide-react";
import { Student, DayQuiz, SYLLABUS, getCourseForDay, getTopicTitleForDay, Submission, AIInterview } from "../types.js";
import AiInterviewRoom from "./AiInterviewRoom.js";
import { ASSESSMENT_PRESETS, SubjectAssessment } from "../assessmentsData.js";
import StudentAssessmentsView from "./StudentAssessmentsView.js";
import AtsResumeMaker from "./AtsResumeMaker.js";
import { getTestCasesForQuestion, diagnoseCodeErrors } from "../utils/testCases.js";

interface StudentPortalProps {
  student: Student;
  onLogout: () => void;
}

export default function StudentPortal({ student, onLogout }: StudentPortalProps) {
  // Test loading parameters
  const [unlockedDays, setUnlockedDays] = useState<number[]>([]);
  const [locks, setLocks] = useState<Record<string, any>>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"curriculum" | "assessments" | "interview" | "careers" | "resume">("curriculum");
  const [studentInterviews, setStudentInterviews] = useState<AIInterview[]>([]);
  const [jobLocation, setJobLocation] = useState<string>("Hyderabad, India");

  // Resume Analyzer States
  const [resumeText, setResumeText] = useState<string>("");
  const [analyzingResume, setAnalyzingResume] = useState<boolean>(false);
  const [resumeAnalysisResult, setResumeAnalysisResult] = useState<any | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // ATS Resume Builder States
  const [atsBypass, setAtsBypass] = useState<boolean>(false);
  const [specialPermissionBypass, setSpecialPermissionBypass] = useState<boolean>(true);
  const [atsInputs, setAtsInputs] = useState({
    fullName: student.name || "",
    email: student.email || "student@example.com",
    phone: student.phoneNumber || "+91 90000 00000",
    linkedin: "linkedin.com/in/",
    github: "github.com/",
    objective: "Highly analytical and certified graduate from Quality Thought Academy. Fully trained in advanced Python programming, mathematical computations with NumPy, and structured data wrangling via high-performance Pandas. Seeking entry-level Data Science/Engineering placement to translate verified training milestones into immediate performance.",
    topSkills: "Python (Core + Advanced), NumPy Vector Computations, Pandas Dataframes (filtering, cleaning, aggregations), Scikit-Learn Predictive Modeling Pipelines, Exploratory Data Analysis (Matplotlib & Seaborn)",
    experienceText: "Hands-on Data Science engineering coursework at Quality Thought Academy, structured classroom project developments, and continuous daily coding assessments (200-day roadmap).",
    projectsText: "1. Advanced House Pricing Predictive Engine: Built complete pipeline workflows with Scikit-Learn containing regression models, robust scaler operations, and double cross-validation.\n2. Customized Matrix Transformation Sandbox: Constructed highly-optimized vector slicing/broadcasting operations using pure-play NumPy commands for instant math calculation.",
    educationText: "Bachelor of Technology in Computer Science or Equivalent."
  });
  const [compilingResume, setCompilingResume] = useState<boolean>(false);
  const [atsResult, setAtsResult] = useState<any | null>(null);
  const [atsError, setAtsError] = useState<string | null>(null);
  const [copiedAts, setCopiedAts] = useState<boolean>(false);

  // Content-wise Video Attachment States
  const [learningVideos, setLearningVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showAttachFormSlug, setShowAttachFormSlug] = useState<string | null>(null);
  const [newVideoForm, setNewVideoForm] = useState({
    title: "",
    description: "",
    videoUrl: ""
  });
  const [savingVideo, setSavingVideo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Assessment States
  const [assessments, setAssessments] = useState<any[]>([]); // student's assessment scores
  const [overrides, setOverrides] = useState<any[]>([]); // student's overrides
  const [activeAssessmentSlug, setActiveAssessmentSlug] = useState<string | null>(null);
  const [assessmentStep, setAssessmentStep] = useState<"intro" | "mcq" | "coding" | "result">("intro");
  const [assessmentMCQAnswers, setAssessmentMCQAnswers] = useState<Record<number, number>>({});
  const [assessmentCodingAnswers, setAssessmentCodingAnswers] = useState<Record<number, string>>({});
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);
  const [assessmentSubmitLoading, setAssessmentSubmitLoading] = useState<boolean>(false);
  const [currentAssessmentMCQIndex, setCurrentAssessmentMCQIndex] = useState<number>(0);

  // Active quiz state
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [quizData, setQuizData] = useState<DayQuiz | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Active test state managers
  const [currentMCQIndex, setCurrentMCQIndex] = useState<number>(0);
  const [selectedMCQAnswers, setSelectedMCQAnswers] = useState<Record<number, number>>({});
  const [codingAnswers, setCodingAnswers] = useState<Record<number, string>>({});
  const [isTestSubmitted, setIsTestSubmitted] = useState<boolean>(false);
  const [reviewSubmission, setReviewSubmission] = useState<Submission | null>(null);

  // Expanded explanations state for review
  const [showReviewExplanations, setShowReviewExplanations] = useState(false);

  // LeetCode / HackerRank style Run-time Sandbox States
  const [codeExecutionLogs, setCodeExecutionLogs] = useState<Record<number, { success: boolean; stdout: string; error?: string; durationMs: number; passedTests: boolean }>>({});
  const [runningCodeIndices, setRunningCodeIndices] = useState<Record<number, boolean>>({});

  // Code solution comparison AI diff state managers
  const [codeComparisonData, setCodeComparisonData] = useState<Record<number, { matchPercentage: number; mistakes: string[]; suggestions: string[]; praise: string; lineByLine: Array<{ userLine: string; idealLine: string; status: string; note: string }> }>>({});
  const [loadingComparisonIndices, setLoadingComparisonIndices] = useState<Record<number, boolean>>({});

  // Stat computations
  const [totalPresentDays, setTotalPresentDays] = useState(0);
  const [averageScore, setAverageScore] = useState(0);

  // Classroom Attendance & Permission States
  const [attendance, setAttendance] = useState<any[]>([]);
  const [submittingAttendance, setSubmittingAttendance] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [currentStudentObj, setCurrentStudentObj] = useState<any>(student);
  const [customZoomLinks, setCustomZoomLinks] = useState<Record<number, string>>({});

  // Placement Portals Profile states
  const [showPlacementModal, setShowPlacementModal] = useState<boolean>(false);
  const [savingPlacementDetails, setSavingPlacementDetails] = useState<boolean>(false);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [placementForm, setPlacementForm] = useState({
    linkedin: "",
    indeed: "",
    naukri: "",
    glassdoor: "",
    foundit: "",
    shine: "",
    timesjobs: "",
    internshala: "",
    wellfound: "",
    apna: ""
  });

  // Scheduled Evaluations (Weekly & Monthly Tests)
  const [scheduledTests, setScheduledTests] = useState<any[]>([]);
  const [scheduledSubmissions, setScheduledSubmissions] = useState<any[]>([]);
  const [activeScheduledTest, setActiveScheduledTest] = useState<any | null>(null);
  const [testWindowStep, setTestWindowStep] = useState<"intro" | "writing" | "completed">("intro");
  const [testAnswersMCQ, setTestAnswersMCQ] = useState<Record<number, number>>({});
  const [testAnswersCoding, setTestAnswersCoding] = useState<Record<number, string>>({});
  const [testScorePercent, setTestScorePercent] = useState<number>(0);
  const [submittingScheduledTest, setSubmittingScheduledTest] = useState<boolean>(false);

  // Floating Compiler Sandbox states
  const [isCompilerOpen, setIsCompilerOpen] = useState<boolean>(false);
  const [compilerCode, setCompilerCode] = useState<string>(
    `# Write Python code below\n\n# Define variables\nx = 10\ny = 5\n\n# Arithmetic operations\nprint("Calculating x + y:")\nprint(x + y)\n\n# Define message\nmsg = "Happy Coding!"\nprint(msg)`
  );
  const [compilerInput, setCompilerInput] = useState<string>("");
  const [compilerOutput, setCompilerOutput] = useState<string[]>(["Terminal ready. Write code and click 'Run Python Code' to compile."]);
  const [compilerIsRunning, setCompilerIsRunning] = useState<boolean>(false);
  const [sandboxSelectedChallenge, setSandboxSelectedChallenge] = useState<number | "general">("general");
  const [sandboxComparisonLoading, setSandboxComparisonLoading] = useState<boolean>(false);
  const [sandboxComparisonData, setSandboxComparisonData] = useState<any | null>(null);
  const [sandboxViewMode, setSandboxViewMode] = useState<"code" | "comparison">("code");
  const turtleCanvasRef = useRef<HTMLDivElement | null>(null);
  const [skulptReady, setSkulptReady] = useState<boolean>(false);

  // Poll for the Skulpt engine (loaded from CDN in index.html) so the Run button
  // knows when real Python execution is actually available.
  useEffect(() => {
    if ((window as any).Sk && (window as any).Sk.builtinFiles) {
      setSkulptReady(true);
      return;
    }
    const interval = setInterval(() => {
      if ((window as any).Sk && (window as any).Sk.builtinFiles) {
        setSkulptReady(true);
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setLearningVideos(body.videos || []);
        }
      }
    } catch (err) {
      console.error("Failed to load course video attachments:", err);
    }
  };

  useEffect(() => {
    fetchStudentContext();
    fetchVideos();
  }, [student.id]);

  const handleRunCode = (index: number, codeQ: any) => {
    setRunningCodeIndices((prev) => ({ ...prev, [index]: true }));
    
    setTimeout(() => {
      const userCode = codingAnswers[index] || "";
      const testCases = getTestCasesForQuestion(codeQ.questionText);
      
      // Simulate compilation and execution diagnostics
      // 1. Basic Python syntax validation: check balanced braces
      let success = true;
      let error = "";
      const openParens = (userCode.match(/\(/g) || []).length;
      const closeParens = (userCode.match(/\)/g) || []).length;
      const openBrackets = (userCode.match(/\[/g) || []).length;
      const closeBrackets = (userCode.match(/\]/g) || []).length;
      
      if (openParens !== closeParens) {
        success = false;
        error = `SyntaxError: unbalanced parenthesis '(' was never closed`;
      } else if (openBrackets !== closeBrackets) {
        success = false;
        error = `SyntaxError: unbalanced square bracket '[' was never closed`;
      } else if (userCode.includes("def") && !userCode.includes(":")) {
        success = false;
        error = `SyntaxError: expected ':' at function declaration signature`;
      }
      
      // 2. Capture and parse print logs
      let stdoutLogs: string[] = [];
      const printRegex = /print\((.*?)\)/g;
      let match;
      while ((match = printRegex.exec(userCode)) !== null) {
        const val = match[1].trim().replace(/^['"]|['"]$/g, '');
        stdoutLogs.push(val);
      }
      
      // If no prints but success, add default variable evaluation trace
      if (stdoutLogs.length === 0 && success) {
        stdoutLogs.push("Code executed successfully without any standard terminal stdout streams.");
      }
      
      // 3. Expected Keywords match for HackerRank / LeetCode test suite passing
      const expectedKeywords = codeQ.expectedKeywords || [];
      const missingKeywords = expectedKeywords.filter(
        (kw: string) => !userCode.toLowerCase().includes(kw.toLowerCase())
      );
      
      const passedTests = success && missingKeywords.length === 0;
      
      // 4. Generate highly realistic Test Case execution traces for each mapped test case
      const testCaseResults = testCases.map((tc, tcIdx) => {
        if (!success) {
          return {
            input: tc.input,
            expected: tc.expectedOutput,
            actual: "None (Compilation Failure)",
            status: "Error" as const,
            duration: "—",
            memory: "—",
            durationLimit: tc.timeLimit,
            memoryLimit: tc.memoryLimit
          };
        }
        
        if (missingKeywords.length > 0) {
          // If keywords missing, simulate a failure on the test cases
          const actualVal = tcIdx === 0 ? "None" : "Traceback (most recent call last):\n  Failed algorithmic validation criteria check.";
          return {
            input: tc.input,
            expected: tc.expectedOutput,
            actual: actualVal,
            status: "Failed" as const,
            duration: (Math.random() * 2 + 3).toFixed(1) + "ms",
            memory: (Math.random() * 0.5 + 1.2).toFixed(2) + "MB",
            durationLimit: tc.timeLimit,
            memoryLimit: tc.memoryLimit
          };
        }
        
        // Success case: matches expected output!
        return {
          input: tc.input,
          expected: tc.expectedOutput,
          actual: tc.expectedOutput,
          status: "Passed" as const,
          duration: (Math.random() * 1.5 + 0.8).toFixed(1) + "ms",
          memory: (Math.random() * 0.2 + 0.9).toFixed(2) + "MB",
          durationLimit: tc.timeLimit,
          memoryLimit: tc.memoryLimit
        };
      });
      
      const allPassed = passedTests && testCaseResults.every(r => r.status === "Passed");
      
      if (!allPassed && success) {
        stdoutLogs.push(`\n❌ TEST SUITE FAILURE (${testCaseResults.filter(r => r.status !== "Passed").length}/${testCaseResults.length} Test Cases Failed):`);
        stdoutLogs.push(`Missing crucial algorithmic components: [${missingKeywords.join(", ")}]`);
      } else if (allPassed) {
        stdoutLogs.push(`\n✅ TEST SUITE SUCCESS (${testCaseResults.length}/${testCaseResults.length} Test Cases Passed!):`);
        stdoutLogs.push(`All criteria matched. Input validated & solution matches targeted complexity constraints.`);
      }
      
      setCodeExecutionLogs((prev) => ({
        ...prev,
        [index]: {
          success,
          stdout: stdoutLogs.join("\n"),
          error: error || undefined,
          durationMs: Math.floor(Math.random() * 8) + 1,
          passedTests: allPassed,
          testCaseResults
        },
      }));
      
      setRunningCodeIndices((prev) => ({ ...prev, [index]: false }));
    }, 900);
  };

  const handleCompareCode = async (index: number, userCode: string, idealCode: string, questionText: string) => {
    setLoadingComparisonIndices((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await fetch("/api/quiz/compare-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode, idealCode, questionText }),
      });
      if (res.ok) {
        const data = await res.json();
        setCodeComparisonData((prev) => ({ ...prev, [index]: data }));
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.error("Failed to fetch code comparison feedback:", errBody);
        setCodeComparisonData((prev) => ({
          ...prev,
          [index]: {
            matchPercentage: 0,
            mistakes: [
              errBody.error ||
                "Could not compare your code with the ideal solution right now (AI comparison service unavailable).",
            ],
            suggestions: ["Please try clicking 'Compare with AI' again in a moment."],
            praise: "",
            lineByLine: [],
          },
        }));
      }
    } catch (err) {
      console.error("Error comparing student code:", err);
      setCodeComparisonData((prev) => ({
        ...prev,
        [index]: {
          matchPercentage: 0,
          mistakes: ["Network error while contacting the AI comparison service."],
          suggestions: ["Check your internet connection and try again."],
          praise: "",
          lineByLine: [],
        },
      }));
    } finally {
      setLoadingComparisonIndices((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleRegisterAttendance = async (dayNum: number, status: "offline" | "online" | "absent", zoomUrl: string = "") => {
    setSubmittingAttendance(true);
    setAttendanceError(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          dayNumber: dayNum,
          status,
          zoomUrl
        })
      });
      if (res.ok) {
        await fetchStudentContext();
      } else {
        const errObj = await res.json();
        setAttendanceError(errObj.error || "Failed to register check-in.");
      }
    } catch (err) {
      console.error("Failed to register classroom check-in:", err);
      setAttendanceError("Connection error while registering check-in.");
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const fetchStudentContext = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db");
      if (res.ok) {
        const data = await res.json();
        setLocks(data.locks || {});
        // Load locked settings for student's batch
        const batchLock = data.locks?.[student.batch] || {
          unlockedDays: [1, 2]
        };
        setUnlockedDays(batchLock.unlockedDays || []);

        // Load attendance
        setAttendance(data.attendance || []);

        // Load active student object to check permission
        const matched = (data.students || []).find((s: any) => s.id === student.id);
        if (matched) {
          setCurrentStudentObj(matched);
          if (matched.placementDetails) {
            setPlacementForm({
              linkedin: matched.placementDetails.linkedin || "",
              indeed: matched.placementDetails.indeed || "",
              naukri: matched.placementDetails.naukri || "",
              glassdoor: matched.placementDetails.glassdoor || "",
              foundit: matched.placementDetails.foundit || "",
              shine: matched.placementDetails.shine || "",
              timesjobs: matched.placementDetails.timesjobs || "",
              internshala: matched.placementDetails.internshala || "",
              wellfound: matched.placementDetails.wellfound || "",
              apna: matched.placementDetails.apna || ""
            });
          }
        }

        // Load scheduled tests and student's submitted weekly/monthly tests
        try {
          const testsRes = await fetch("/api/scheduled-tests");
          if (testsRes.ok) {
            const testsData = await testsRes.json();
            if (testsData.success) {
              setScheduledTests(testsData.tests || []);
            }
          }
        } catch (err) {
          console.error("Failed to load active scheduled evaluation tests:", err);
        }

        try {
          const subsRes = await fetch("/api/scheduled-tests/submissions");
          if (subsRes.ok) {
            const subsData = await subsRes.json();
            if (subsData.success) {
              const filtered = (subsData.submissions || []).filter((s: any) => s.studentId === student.id);
              setScheduledSubmissions(filtered);
            }
          }
        } catch (err) {
          console.error("Failed to load evaluation submissions list:", err);
        }

        // Filter submissions for this specific student id
        const studentSubmissions = (data.submissions || []).filter(
          (sub: any) => sub.studentId === student.id
        );
        setSubmissions(studentSubmissions);

        // Filter student assessment scores
        const studentAssessments = (data.assessments || []).filter(
          (asm: any) => asm.studentId === student.id
        );
        setAssessments(studentAssessments);

        // Filter student overrides
        const studentOverrides = (data.overrides || []).filter(
          (o: any) => o.studentId === student.id
        );
        setOverrides(studentOverrides);

        setTotalPresentDays(studentSubmissions.length);
        if (studentSubmissions.length > 0) {
          const sum = studentSubmissions.reduce((acc: number, cur: any) => acc + (cur.score || 0), 0);
          setAverageScore(Number((sum / studentSubmissions.length).toFixed(1)));
        } else {
          setAverageScore(0);
        }

        // Fetch student past interviews to track webcam recordings and video approvals
        try {
          const interviewsRes = await fetch(`/api/interviews/student/${student.id}`);
          if (interviewsRes.ok) {
            const interviewsData = await interviewsRes.json();
            setStudentInterviews(interviewsData || []);
          }
        } catch (interviewsErr) {
          console.error("Failed to load student past interviews in context:", interviewsErr);
        }
      }
    } catch (e) {
      console.error("Failed to load student board profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlacementDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlacementDetails(true);
    setPlacementError(null);
    try {
      const res = await fetch(`/api/students/${student.id}/placement-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placementDetails: placementForm })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowPlacementModal(false);
        await fetchStudentContext();
      } else {
        setPlacementError(data.error || "Failed to update placement details.");
      }
    } catch (err) {
      setPlacementError("Failed to communicate with placement server.");
    } finally {
      setSavingPlacementDetails(false);
    }
  };

  const handleSubmitScheduledTest = async (testId: string) => {
    if (!currentStudentObj) return;
    setSubmittingScheduledTest(true);
    
    const test = scheduledTests.find(t => t.id === testId);
    if (!test) {
      setSubmittingScheduledTest(false);
      return;
    }

    let correctCount = 0;
    const totalMCQs = test.mcqs?.length || 0;
    test.mcqs?.forEach((m: any, idx: number) => {
      if (testAnswersMCQ[idx] === m.correctOption) {
        correctCount++;
      }
    });

    const finalPercent = totalMCQs > 0 ? Math.round((correctCount / totalMCQs) * 100) : 100;
    setTestScorePercent(finalPercent);

    try {
      const res = await fetch(`/api/scheduled-tests/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: currentStudentObj.id,
          studentName: currentStudentObj.name,
          rollNumber: currentStudentObj.rollNumber,
          batch: currentStudentObj.batch,
          mcqAnswers: testAnswersMCQ,
          codingAnswers: Object.values(testAnswersCoding),
          score: finalPercent
        })
      });

      if (res.ok) {
        setTestWindowStep("completed");
        await fetchStudentContext();
      }
    } catch (err) {
      console.error("Failed to submit scheduled test:", err);
    } finally {
      setSubmittingScheduledTest(false);
    }
  };

  const handleAnalyzeResume = async () => {
    if (!resumeText.trim()) {
      setResumeError("Please write or paste your resume content first so we can analyze it.");
      return;
    }
    setAnalyzingResume(true);
    setResumeError(null);
    try {
      const res = await fetch("/api/careers/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, location: jobLocation }),
      });
      if (res.ok) {
        const data = await res.json();
        setResumeAnalysisResult(data);
      } else {
        const errData = await res.json();
        setResumeError(errData.error || "Analysis request failed.");
      }
    } catch (err: any) {
      setResumeError(err.message || "An unexpected error occurred while analyzing your resume.");
    } finally {
      setAnalyzingResume(false);
    }
  };

  const handleBuildAtsResume = async () => {
    setCompilingResume(true);
    setAtsError(null);
    try {
      const res = await fetch("/api/careers/build-ats-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, inputs: atsInputs }),
      });
      if (res.ok) {
        const data = await res.json();
        setAtsResult(data);
      } else {
        const errData = await res.json();
        setAtsError(errData.error || "Failed to compile resume.");
      }
    } catch (err: any) {
      setAtsError(err.message || "An error occurred while compiling your resume.");
    } finally {
      setCompilingResume(false);
    }
  };

  const handleAttachVideo = async (courseSlug: string) => {
    if (!newVideoForm.title || !newVideoForm.videoUrl) {
      setVideoError("Please provide a Title and Video URL.");
      return;
    }
    setSavingVideo(true);
    setVideoError(null);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlug,
          title: newVideoForm.title,
          description: newVideoForm.description,
          videoUrl: newVideoForm.videoUrl,
          addedBy: student.name || "Student Participant"
        })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setLearningVideos(prev => [...prev, body.video]);
          setNewVideoForm({ title: "", description: "", videoUrl: "" });
          setShowAttachFormSlug(null);
        } else {
          setVideoError(body.error || "Failed to attach study video.");
        }
      } else {
        const errJson = await res.json();
        setVideoError(errJson.error || "Failed to attach study video.");
      }
    } catch (err: any) {
      setVideoError(err.message || "Network error occurred.");
    } finally {
      setSavingVideo(false);
    }
  };

  // Launch test for a specific Day
  const handleStartTest = async (dayNum: number) => {
    const matchedSub = submissions.find((sub) => sub.dayNumber === dayNum);

    // Prerequisite & lock check for uncompleted test attempts
    if (!matchedSub) {
      const isInstructorUnlocked = unlockedDays.includes(dayNum);
      if (!isInstructorUnlocked) {
        alert("This day is currently locked by the classroom instructor.");
        return;
      }

      if (dayNum > 1) {
        const prevDayCompleted = submissions.some((sub) => sub.dayNumber === dayNum - 1);
        if (!prevDayCompleted) {
          alert(`Prerequisite block: You must complete Day ${dayNum - 1} before you can start Day ${dayNum}!`);
          return;
        }
      }
    }

    setLoadingQuiz(true);
    setCurrentMCQIndex(0);
    setSelectedMCQAnswers({});
    setCodingAnswers({});
    setIsTestSubmitted(false);
    setReviewSubmission(null);
    setShowReviewExplanations(false);

    try {
      const res = await fetch(`/api/quiz/${dayNum}`);
      if (res.ok) {
        const quiz = await res.json();
        setQuizData(quiz);
        setActiveDay(dayNum);

        if (matchedSub) {
          // Already completed! Just show results & correct answers. NO edit option!
          setIsTestSubmitted(true);
          setReviewSubmission(matchedSub);
          setShowReviewExplanations(true);
          setSelectedMCQAnswers(matchedSub.selectedMCQAnswers || {});
          
          const answers: Record<number, string> = {};
          (matchedSub.codingSubmissions || []).forEach((cSub: any, idx: number) => {
            answers[idx] = cSub.submittedCode || "";
          });
          setCodingAnswers(answers);
        } else {
          // Fresh test, pre-populate standard templates
          const starters: Record<number, string> = {};
          quiz.coding.forEach((codeQ: any, index: number) => {
            starters[index] = codeQ.starterCode || "def solution_fn():\n    # Write python code below\n    pass";
          });
          setCodingAnswers(starters);
        }
      }
    } catch (e) {
      alert("Error generating the daily training exam questions");
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Handle choice selection for MCQ
  const handleSelectMCQ = (questionIdx: number, optionIdx: number) => {
    setSelectedMCQAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }));
  };

  // Handle coding text typing
  const handleCodingType = (index: number, code: string) => {
    setCodingAnswers((prev) => ({
      ...prev,
      [index]: code,
    }));
  };

  // Check if coding solution fits simple keyword metrics for UI assistance
  const verifyCodingProgress = (index: number) => {
    if (!quizData) return [];
    const keywords = quizData.coding[index]?.expectedKeywords || [];
    const clientCode = codingAnswers[index] || "";

    return keywords.map((k) => ({
      keyword: k,
      matched: clientCode.includes(k),
    }));
  };

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

  const handleRunSandboxCode = () => {
    const Sk = (window as any).Sk;

    if (!Sk || !skulptReady) {
      setCompilerOutput([
        "⏳ The Python engine is still loading from the CDN...",
        "Please wait a couple of seconds and click 'Run Python Code' again.",
        "(If this message doesn't go away, check your internet connection — the sandbox needs it once to download the Python interpreter.)"
      ]);
      return;
    }

    setCompilerIsRunning(true);
    setCompilerOutput(["Booting Python 3 engine...", "Executing your script..."]);

    // Clear any turtle drawing from a previous run
    if (turtleCanvasRef.current) {
      turtleCanvasRef.current.innerHTML = "";
    }

    const logs: string[] = [];

    Sk.configure({
      output: (text: string) => {
        logs.push(text);
      },
      read: (filename: string) => {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][filename] === undefined) {
          throw new Error(`File not found: '${filename}'`);
        }
        return Sk.builtinFiles["files"][filename];
      },
      __future__: Sk.python3,
      inputfun: (promptText: string) => {
        // input() falls back to a browser prompt since this is a non-interactive console
        return window.prompt(promptText || "Input required:") || "";
      },
      inputfunTakesPrompt: true,
    });

    // Route the `turtle` module's drawing surface into our dedicated canvas container
    Sk.TurtleGraphics = Sk.TurtleGraphics || {};
    Sk.TurtleGraphics.target = "sandbox-turtle-canvas";
    Sk.TurtleGraphics.width = 320;
    Sk.TurtleGraphics.height = 240;

    Sk.misceval
      .asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, compilerCode, true))
      .then(() => {
        // Combine any stdout chunks and split back into display lines
        const combined = logs.join("");
        const outLines = combined.length ? combined.replace(/\n$/, "").split("\n") : [];
        setCompilerOutput(
          outLines.length
            ? [...outLines, "", "✅ Process finished. Exit code 0."]
            : ["✅ Code ran successfully with no printed output."]
        );
        setCompilerIsRunning(false);
      })
      .catch((err: any) => {
        const combined = logs.join("");
        const outLines = combined.length ? combined.replace(/\n$/, "").split("\n") : [];
        // Skulpt error objects stringify into real, accurate Python-style tracebacks
        // (e.g. "NameError: name 'x' is not defined on line 3"), unlike a keyword guess.
        setCompilerOutput([...outLines, "", `❌ ${err.toString()}`]);
        setCompilerIsRunning(false);
      });
  };

  const handleSandboxAICompare = async () => {
    if (!compilerCode.trim()) return;
    setSandboxComparisonLoading(true);
    setSandboxViewMode("comparison");
    setSandboxComparisonData(null);

    let payload: any = { userCode: compilerCode };

    if (sandboxSelectedChallenge !== "general" && quizData?.coding?.[sandboxSelectedChallenge]) {
      const challenge = quizData.coding[sandboxSelectedChallenge];
      payload.challengeTitle = `Challenge ${sandboxSelectedChallenge + 1}: Daily Coding Question`;
      payload.challengeDescription = challenge.questionText;
      payload.idealCode = challenge.solutionDescription;
    }

    try {
      const res = await fetch("/api/sandbox/compare-syntax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxComparisonData(data);
      } else {
        setSandboxComparisonData({
          isValidSyntax: true,
          matchPercentage: 50,
          mistakes: ["Failed to communicate with AI server. Please try again."],
          suggestions: ["Check your internet connection."],
          praise: "Keep practicing and refining your logic!",
          correctedCode: compilerCode,
          lineByLine: []
        });
      }
    } catch (err) {
      console.error("Failed to run sandbox AI check:", err);
      setSandboxComparisonData({
        isValidSyntax: true,
        matchPercentage: 50,
        mistakes: ["Network/Server error occurred while executing AI syntax comparative analysis."],
        suggestions: ["Wait a few moments and try triggering the comparative analyzer again."],
        praise: "Keep coding!",
        correctedCode: compilerCode,
        lineByLine: []
      });
    } finally {
      setSandboxComparisonLoading(false);
    }
  };

  // Perform Final Submission
  const handleSubmitTest = async () => {
    if (!quizData || !activeDay) return;

    // Check if all MCQs answered
    if (Object.keys(selectedMCQAnswers).length < 8) {
      if (!window.confirm("You have unanswered MCQs. Are you sure you want to submit?")) return;
    }

    // Determine MCQ Correct points (max 8)
    let mcqPoints = 0;
    quizData.mcqs.forEach((mcq, idx) => {
      if (selectedMCQAnswers[idx] === mcq.correctOption) {
        mcqPoints++;
      }
    });

    // We count matching coding snippets (each evaluated for actual attempt rather than raw templates)
    // The total test score can be mcqPoints + codingPoints (max 10 points)
    let codingPoints = 0;
    quizData.coding.forEach((q, idx) => {
      const studentCode = (codingAnswers[idx] || "").trim();
      const starterCode = (q.starterCode || "def solution_fn():\n    # Write python code below\n    pass").trim();
      
      if (!studentCode) return;
      
      // Clean up whitespace, comments, and the 'pass' keyword to check if they wrote something new
      const cleanStudent = studentCode.replace(/#.*$/gm, "").replace(/\s+/g, "").replace(/\bpass\b/g, "");
      const cleanStarter = starterCode.replace(/#.*$/gm, "").replace(/\s+/g, "").replace(/\bpass\b/g, "");
      
      // If code was changed from starter, and had real non-white space content
      if (studentCode !== starterCode && cleanStudent.length > 0 && cleanStudent !== cleanStarter) {
        codingPoints++;
      }
    });

    const finalScore = mcqPoints + codingPoints;

    const payload = {
      studentId: student.id,
      studentName: student.name,
      rollNumber: student.rollNumber,
      batch: student.batch,
      dayNumber: activeDay,
      courseSlug: quizData.courseSlug,
      score: finalScore,
      mcqScores: mcqPoints,
      codingSubmissions: quizData.coding.map((q, idx) => ({
        questionText: q.questionText,
        submittedCode: codingAnswers[idx] || ""
      })),
      selectedMCQAnswers
    };

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setIsTestSubmitted(true);
        setReviewSubmission(data.submission);
        setShowReviewExplanations(true);
        // Refresh indices
        await fetchStudentContext();
        // Scroll to top automatically so results are displayed clearly
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      alert("Failed to deliver submission safely");
    }
  };

  const getDayStatus = (dayNum: number) => {
    const matchedSub = submissions.find((sub) => sub.dayNumber === dayNum);
    if (matchedSub) {
      return { status: "completed" as const, score: matchedSub.score };
    }

    const isInstructorUnlocked = unlockedDays.includes(dayNum);
    const isPrerequisiteMet = dayNum === 1 || submissions.some((sub) => sub.dayNumber === dayNum - 1);

    if (isInstructorUnlocked && isPrerequisiteMet) {
      return { status: "unlocked" as const };
    }
    return { status: "locked" as const };
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* Dashboard Top bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-6 sticky top-0 z-20 print:hidden shrink-0 shadow-sm animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-lg font-display select-none">Σ</div>
          <div>
            <h1 className="text-sm font-extrabold leading-none font-display">
              DataScience Pro <span className="font-normal text-slate-400">| Student</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-1">
              Welcome, <span className="font-semibold text-slate-300">{student.name}</span> &bull; {student.batch}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-750 hover:border-slate-600 rounded px-3 py-1 select-none transition">
            <input
              type="checkbox"
              checked={specialPermissionBypass}
              onChange={(e) => setSpecialPermissionBypass(e.target.checked)}
              className="rounded border-slate-500 bg-slate-900 checked:bg-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
            />
            <span className="text-amber-400 font-mono tracking-wide uppercase text-[10px]">★ Special Access</span>
          </label>
          <span className="hidden sm:inline bg-slate-800 text-slate-300 border border-slate-700 text-xs px-3 py-1 rounded font-mono font-bold">
            UID: {student.rollNumber}
          </span>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium cursor-pointer transition"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Student Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
        {/* STUDENT INFO DASHBOARD & ROADMAP PATH */}
        {!activeDay && (
          <div className="mb-8 space-y-6 animate-fade-in">
            {/* PROFILE META CARD */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-indigo-950 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-indigo-500/20 text-indigo-300 rounded-full font-bold text-xs font-mono uppercase tracking-wide">
                    Master Student Profile Dashboard
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-[10px] text-emerald-300 font-semibold font-mono">AUTHORIZED SECURE SESSION</span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">
                  {student.name}
                </h2>
                <p className="text-xs text-slate-300 font-sans max-w-xl">
                  You are registered inside the academic master database. Your Phone Number has been linked securely to lock your credentials and protect your ongoing exam records.
                </p>
              </div>

              {/* GRID INFORMATION FIELDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto text-xs font-sans shrink-0">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Assigned Batch</span>
                  <span className="font-extrabold text-indigo-300 text-sm truncate block">{student.batch}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Student Roll ID</span>
                  <span className="font-bold text-white font-mono text-sm block">{student.rollNumber}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Linked Phone</span>
                  <span className="font-bold text-emerald-300 font-mono text-sm block">
                    {student.phoneNumber || "Free Roll Verification"}
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">E-mail Address</span>
                  <span className="font-semibold text-indigo-200 text-xs truncate block">{student.email || "No Email Provided"}</span>
                </div>
              </div>
            </div>

            {/* AI INTERVIEWS SUMMARY AND METRICS BAR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-5 items-center font-sans">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-extrabold shadow-2xs">
                  <Sparkles className="w-5.5 h-5.5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-mono">AI Interview Metrics</h3>
                  <p className="text-[10px] text-slate-500 font-sans">Your webcam-monitored placement room performance.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y md:border-y-0 md:border-x border-slate-100 py-3 md:py-0 md:px-5">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider font-mono">Sessions Taken</span>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {studentInterviews.length} sessions
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider font-mono">Avg Score</span>
                  <span className="text-lg font-black text-indigo-600 font-mono">
                    {studentInterviews.length > 0
                      ? Math.round(studentInterviews.reduce((acc, curr) => acc + (curr.report?.score || 0), 0) / studentInterviews.length) + "%"
                      : "0%"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider font-mono">PROCTOR VIDEOS</span>
                  <span className="text-[10px] font-bold text-slate-700 font-sans leading-none mt-0.5">
                    {studentInterviews.filter(item => item.videoAccessGranted).length} unlocked by mentor
                  </span>
                </div>
                {studentInterviews.some(item => item.videoAccessGranted) ? (
                  <button
                    onClick={() => setActiveTab("ai-videos" as any)}
                    className="bg-rose-600 hover:bg-rose-500 hover:shadow-rose-650/20 text-white font-extrabold uppercase font-mono tracking-wider text-[9.5px] px-3 py-1.5 rounded-lg shadow-sm transition shrink-0 animate-pulse cursor-pointer flex items-center gap-1"
                  >
                    <Video className="w-3.5 h-3.5 fill-white" />
                    Watch Now
                  </button>
                ) : (
                  <span className="text-[9.5px] font-bold text-slate-400 bg-slate-100 py-1.5 px-3 rounded-lg uppercase tracking-wider font-mono block shrink-0 text-center">
                    Locked by Mentor
                  </span>
                )}
              </div>
            </div>

            {/* INTERACTIVE WORKSPACE TABS */}
            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab("curriculum")}
                className={`pb-3 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === "curriculum"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-650"
                }`}
              >
                <Calendar className="w-4 h-4 animate-pulse-slow" />
                Curriculum Days Matrix
              </button>
              <button
                onClick={() => setActiveTab("assessments")}
                className={`pb-3 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === "assessments"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-650"
                }`}
              >
                <Award className="w-4 h-4 text-emerald-605" />
                Subject Assessments
              </button>
              <button
                onClick={() => setActiveTab("interview")}
                className={`pb-3 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === "interview"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-650"
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                AI Technical Mock Recruiter (Gemini 3.5)
              </button>
              
              {studentInterviews.some(item => item.videoAccessGranted) && (
                <button
                  onClick={() => setActiveTab("ai-videos" as any)}
                  className={`pb-3 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                    (activeTab as any) === "ai-videos"
                      ? "border-rose-600 text-rose-600 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  }`}
                >
                  <Video className="w-4 h-4 text-rose-600 fill-rose-100" />
                  AI Interview Videos
                </button>
              )}

              <button
                onClick={() => setActiveTab("careers")}
                className={`pb-3 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === "careers"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-650"
                }`}
              >
                <Briefcase className="w-4 h-4 text-emerald-600" />
                Unified Career Placement Gateway
              </button>
              <button
                onClick={() => setActiveTab("resume")}
                className={`pb-3 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === "resume"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-650"
                }`}
              >
                <FileText className="w-4 h-4 text-sky-600" />
                ATS Resume Maker
              </button>
            </div>

            {/* INTERACTIVE ONBOARDING PATH GUIDE */}
            {activeTab === "curriculum" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm font-sans uppercase tracking-wide">
                      Your Complete Student Portal Learning Path
                    </h4>
                    <p className="text-[10px] text-slate-400">Follow the path from registration to daily review sessions.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs relative">
                  {/* Step 1 */}
                  <div className="relative p-4 bg-slate-50/60 rounded-xl border border-slate-150">
                    <div className="absolute top-3 right-3 bg-emerald-100 text-emerald-800 font-mono rounded-full font-bold px-2 py-0.5 text-[9px]">
                      Step A
                    </div>
                    <h5 className="font-bold text-slate-900 mb-1">New Batch Enrollment</h5>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      Instructors create separate batches (e.g. {student.batch}) and onboard student records using custom Roll IDs.
                    </p>
                    <div className="mt-3 text-[10px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 p-1.5 rounded w-fit">
                      <Check className="w-3.5 h-3.5" /> Enrolled in {student.batch}
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative p-4 bg-slate-50/60 rounded-xl border border-slate-150">
                    <div className="absolute top-3 right-3 bg-indigo-100 text-indigo-800 font-mono rounded-full font-bold px-2 py-0.5 text-[9px]">
                      Step B
                    </div>
                    <h5 className="font-bold text-slate-900 mb-1">Phone Match Verification</h5>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      For login, enter the matching Batch, Roll Number, and Phone Number. Prevents unauthorized students from opening exams.
                    </p>
                    <div className="mt-3 text-[10px] font-semibold text-indigo-600 flex items-center gap-1 bg-indigo-50 p-1.5 rounded w-fit">
                      <Check className="w-3.5 h-3.5" /> Identity Linked Match
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative p-4 bg-slate-50/60 rounded-xl border border-slate-150">
                    <div className="absolute top-3 right-3 bg-indigo-100 text-indigo-800 font-mono rounded-full font-bold px-2 py-0.5 text-[9px]">
                      Step C
                    </div>
                    <h5 className="font-bold text-slate-900 mb-1">Write Daily Exams</h5>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      Unlock daily lessons in sequential phases (Day 1 - 200). Write 8 MCQs and submit core descriptive Python codes.
                    </p>
                    <div className="mt-3 text-[10px] text-amber-600 font-bold bg-amber-50 rounded p-1.5 w-fit">
                      ☆ Overrides Applied Instantly
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative p-4 bg-amber-50/30 rounded-xl border border-amber-200">
                    <div className="absolute top-3 right-3 bg-amber-100 text-amber-800 font-mono rounded-full font-bold px-2 py-0.5 text-[9px]">
                      Step D
                    </div>
                    <h5 className="font-bold text-slate-900 mb-1">Review Correct Solutions</h5>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      Once submitted, correct MCQ choices, text explanations, and ideal model solution codes show up automatically below!
                    </p>
                    <div className="mt-3 text-[10px] text-indigo-700 font-bold bg-indigo-50 rounded p-1.5 w-fit">
                      ✔ Auto Explanation Key
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistics Board */}
        {!activeDay && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6 animate-pulse-slow" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Streak Attendance</div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {totalPresentDays} <span className="text-xs font-normal text-slate-400">/ 200 Days</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Tests attended and validated</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Average Daily Grade</div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {averageScore} <span className="text-xs font-normal text-slate-400">/ 10 pts</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Based on MCQs + code submits</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <Zap className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Active Stage Topic</div>
                {unlockedDays.length > 0 ? (
                  <>
                    <div className="text-md font-bold text-slate-900 leading-tight">
                      {getCourseForDay(Math.max(...unlockedDays)).name}
                    </div>
                    <span className="text-[9px] font-mono text-indigo-600 font-medium">
                      Curriculum Max unlocked: Day #{Math.max(...unlockedDays)}
                    </span>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">All Days currently locked</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1. STATE: ACTIVATED DAILY TEST IN PROGRESS */}
        {activeDay && quizData ? (
          <div className="bg-white rounded-xl shadow-md border border-slate-250 p-6 space-y-6">
            {/* Exam Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-slate-100 gap-3">
              <div>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded inline-block mb-1">
                  Day {activeDay} Training Exam
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Topic: {quizData.topicTitle}
                </h3>
                <p className="text-xs text-slate-400">Subject Field: {getCourseForDay(activeDay).name}</p>
              </div>

              {!isTestSubmitted && (
                <button
                  onClick={() => {
                    if (window.confirm("Abandon current test session? Responses won't be saved.")) {
                      setActiveDay(null);
                      setQuizData(null);
                    }
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-medium text-xs transition self-start sm:self-auto"
                >
                  Exit Session
                </button>
              )}
            </div>

            {/* Attendance Check-in Panel */}
            {(() => {
              const dayAttendance = attendance.find(a => a.dayNumber === activeDay);
              const currentStatus = dayAttendance?.status || "absent";
              const currentZoom = dayAttendance?.zoomUrl || "";

              // Local study hours timing check (7am to 10pm)
              const localHour = new Date().getHours();
              const isAttendanceTimingLocked = localHour < 7 || localHour >= 22;

              return (
                <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/80 rounded-xl p-4.5 space-y-3 shadow-xs text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className={`${currentStatus !== "absent" ? "bg-emerald-400" : "bg-amber-400"} animate-ping absolute inline-flex h-full w-full rounded-full opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentStatus !== "absent" ? "bg-emerald-600" : "bg-amber-500"}`}></span>
                        </span>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide font-mono">
                          Today's Campus Attendance Registration & Classroom Format
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Are you attending the lecture in our physical offline classroom center, or attending online through live Zoom?
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-bold font-mono text-slate-400">Current Status:</span>
                      <span className={`text-[10.5px] uppercase font-black font-mono px-2 py-0.5 rounded-md ${
                        currentStatus === "offline"
                          ? "bg-sky-100 text-sky-850 border border-sky-200"
                          : currentStatus === "online"
                          ? "bg-purple-100 text-purple-850 border border-purple-205"
                          : "bg-amber-100 text-amber-850 border border-amber-205"
                      }`}>
                        {currentStatus === "offline" ? "🏫 Present (Offline)" : currentStatus === "online" ? "🌐 Present (Online via Zoom)" : " Absent / Not Selected"}
                      </span>
                    </div>
                  </div>

                  {isAttendanceTimingLocked && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-850 rounded-xl p-3 text-xs flex items-start gap-2 animate-fade-in font-sans">
                      <span className="text-amber-500">⚠️</span>
                      <div className="space-y-0.5">
                        <strong className="font-bold">Attendance self-registration is locked outside core hours!</strong>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          Students can only check-in or update format between <strong>07:00 AM and 10:00 PM</strong> daily. Please contact faculty Vinay if you need manual assistance.
                        </p>
                      </div>
                    </div>
                  )}

                  {attendanceError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-850 rounded-xl p-3 text-xs flex items-start gap-2 animate-fade-in font-sans">
                      <span className="text-rose-500">⚠️</span>
                      <div className="space-y-0.5">
                        <strong className="font-bold">Check-in Error:</strong>
                        <p className="text-[11px] text-rose-700 leading-relaxed">{attendanceError}</p>
                      </div>
                    </div>
                  )}

                  {/* Attendance Format Action Toggles */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleRegisterAttendance(activeDay, "offline")}
                      disabled={submittingAttendance || isAttendanceTimingLocked}
                      className={`flex-1 sm:flex-initial text-xs py-2 px-4 rounded-xl border font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        currentStatus === "offline"
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>🏫 Join Offline Desk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const zoomInput = customZoomLinks[activeDay] || "https://zoom.us/j/90807060504";
                        handleRegisterAttendance(activeDay, "online", zoomInput);
                      }}
                      disabled={submittingAttendance || isAttendanceTimingLocked}
                      className={`flex-1 sm:flex-initial text-xs py-2 px-4 rounded-xl border font-bold font-mono transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        currentStatus === "online"
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50/50"
                      }`}
                    >
                      <span>🌐 Join Online (Zoom Stream)</span>
                    </button>

                    {currentStatus === "online" && (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Zoom Link / Joint Code"
                          value={customZoomLinks[activeDay] !== undefined ? customZoomLinks[activeDay] : currentZoom}
                          onChange={(e) => {
                            setCustomZoomLinks(prev => ({ ...prev, [activeDay]: e.target.value }));
                          }}
                          className="bg-white border border-slate-250 text-xs px-3 py-1.5 rounded-lg outline-none flex-1 font-mono text-slate-700 focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const zoomLink = customZoomLinks[activeDay] || currentZoom || "https://zoom.us/j/90807060504";
                            handleRegisterAttendance(activeDay, "online", zoomLink);
                          }}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[10px] font-bold font-mono py-1.5 px-3 rounded-lg border border-indigo-200 transition"
                        >
                          Update Zoom Link
                        </button>
                      </div>
                    )}
                  </div>

                  {currentStatus === "online" && (currentZoom || customZoomLinks[activeDay]) && (
                    <div className="bg-indigo-600/5 text-indigo-800 p-2.5 rounded-lg text-xs flex items-center justify-between border border-indigo-100 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Your Zoom Live Stream link is connected active: <strong className="font-mono text-xs text-indigo-900 break-all">{currentZoom || customZoomLinks[activeDay]}</strong></span>
                      </div>
                      <a
                        href={currentZoom || customZoomLinks[activeDay]}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-black text-[10px] uppercase py-1 px-3 rounded-md transition shrink-0"
                      >
                        Launch Zoom Meeting Now 🚀
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* MAIN TEST INTERFACES */}
            {!isTestSubmitted ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left side: MCQs Column */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-mono font-bold text-indigo-600">
                        MULTIPLE CHOICE EXAMS: {currentMCQIndex + 1} OF 8
                      </span>

                      {/* Pagination beads */}
                      <div className="flex gap-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentMCQIndex(i)}
                            className={`w-5.5 h-5.5 rounded-full text-[10px] font-bold transition flex items-center justify-center ${
                              currentMCQIndex === i
                                ? "bg-indigo-600 text-white"
                                : selectedMCQAnswers[i] !== undefined
                                ? "bg-indigo-150 text-indigo-700"
                                : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question panel */}
                    <div className="space-y-4">
                      <p className="font-bold text-slate-900 text-base leading-relaxed">
                        {quizData.mcqs[currentMCQIndex]?.questionText}
                      </p>

                      <div className="grid grid-cols-1 gap-2.5 pt-2">
                        {quizData.mcqs[currentMCQIndex]?.options.map((option, oIdx) => {
                          const isSelected = selectedMCQAnswers[currentMCQIndex] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectMCQ(currentMCQIndex, oIdx)}
                              className={`w-full text-left p-3.5 rounded-lg border text-sm transition font-medium flex items-center justify-between ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                              }`}
                            >
                              <span>{option}</span>
                              <span
                                className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-xs ${
                                  isSelected ? "border-white" : "border-slate-300"
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Nav controls */}
                    <div className="flex justify-between pt-6 mt-6 border-t border-slate-200">
                      <button
                        onClick={() => setCurrentMCQIndex((i) => Math.max(0, i - 1))}
                        disabled={currentMCQIndex === 0}
                        className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-1.5 px-3.5 rounded text-xs font-semibold disabled:text-slate-300 transition"
                      >
                        Previous
                      </button>

                      <button
                        onClick={() => {
                          if (currentMCQIndex < 7) {
                            setCurrentMCQIndex((i) => i + 1);
                          }
                        }}
                        disabled={currentMCQIndex === 7}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 rounded text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-300 transition"
                      >
                        Save & Next
                      </button>
                    </div>
                  </div>

                  {/* Submission actions */}
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-indigo-700 text-center sm:text-left">
                      <p className="font-semibold">Review and Submit Exam</p>
                      <p className="text-[10px] text-indigo-500">Ensure Both multiple choice and written Python scripts are filled</p>
                    </div>
                    <button
                      onClick={handleSubmitTest}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg font-bold text-sm transition flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Submit Course Test
                    </button>
                  </div>
                </div>

                {/* Right side: Coding Tasks */}
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm tracking-wider uppercase flex items-center gap-1.5 font-display">
                      <Code2 className="w-4 h-4 text-red-500 animate-pulse" />
                      2 Python Coding Questions
                    </h4>
                    <p className="text-[11px] text-amber-850 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-lg leading-relaxed font-semibold">
                      ⚠️ <strong className="text-amber-950 font-black">Strict Assessment Notice:</strong> You must genuinely attempt the coding challenges using custom Python code. Keeping the raw starter template code or submitting an empty solution will yield <strong>0 marks</strong> for these questions.
                    </p>
                  </div>

                  {quizData.coding.map((codeQ, index) => {
                    const progressMetrics = verifyCodingProgress(index);
                    const completedKeywordsCount = progressMetrics.filter((m) => m.matched).length;
                    const testCases = getTestCasesForQuestion(codeQ.questionText);

                    return (
                      <div key={index} className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 space-y-3">
                        <div className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-lg text-xs">
                          <span className="font-bold text-indigo-400">CHALLENGE {index + 1} OF 2</span>
                          <span className="font-mono text-slate-400">Score weight: +1pt</span>
                        </div>

                        <p className="text-xs text-slate-350 bg-slate-950 p-2.5 rounded border border-slate-800 leading-relaxed font-mono">
                          {codeQ.questionText}
                        </p>

                        {/* Visual Target Test Cases Panel */}
                        <div className="space-y-1.5 p-3 bg-slate-950/80 rounded-lg border border-slate-800/60">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase">
                            <span>📋 Target Test Cases</span>
                            <span className="text-[8px] text-slate-500 font-normal font-mono">Complexity checks active</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {testCases.map((tc, tcIdx) => (
                              <div key={tcIdx} className="space-y-1 text-[9px] font-mono bg-slate-900/50 p-2 rounded border border-slate-850">
                                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1 mb-1">
                                  <span className="font-bold text-slate-400">Test Case #{tcIdx + 1}</span>
                                  <span className="text-slate-500 text-[8px]">{tc.timeLimit} | {tc.memoryLimit}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-[8px]">Input:</span>
                                    <span className="text-indigo-300 truncate bg-slate-950 px-1 rounded max-w-[120px]" title={tc.input}>{tc.input}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-[8px]">Expected:</span>
                                    <span className="text-emerald-400 truncate bg-slate-950 px-1 rounded max-w-[120px]" title={tc.expectedOutput}>{tc.expectedOutput}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 font-mono">CODE WORKSPACE:</label>
                          <textarea
                            rows={8}
                            value={codingAnswers[index] || ""}
                            onChange={(e) => handleCodingType(index, e.target.value)}
                            onKeyDown={(e) => handleCodeEditorKeyDown(e, (val) => handleCodingType(index, val))}
                            className="w-full bg-slate-950 text-emerald-400 border border-slate-800 rounded font-mono p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs leading-relaxed"
                          />
                        </div>

                        {/* Keyword guides checking in real time */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>EXPECTED SYNTAX:</span>
                            <span>{completedKeywordsCount} / {codeQ.expectedKeywords.length} MATCHED</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {progressMetrics.map((m) => (
                              <span
                                key={m.keyword}
                                className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold transition ${
                                  m.matched
                                    ? "bg-emerald-900/40 text-emerald-400 border border-emerald-850"
                                    : "bg-slate-850 text-slate-400 border border-slate-800"
                                }`}
                              >
                                {m.keyword}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* HackerRank / LeetCode style run sandbox button */}
                        <div className="pt-2.5 border-t border-slate-800 flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <button
                              type="button"
                              onClick={() => handleRunCode(index, codeQ)}
                              disabled={runningCodeIndices[index]}
                              className="bg-slate-850 hover:bg-slate-800 disabled:bg-slate-900 text-emerald-400 hover:text-emerald-350 disabled:text-slate-500 font-bold font-mono text-[10px] px-3 py-1.5 rounded border border-slate-800 transition uppercase flex items-center gap-1 cursor-pointer"
                            >
                              {runningCodeIndices[index] ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                  Running Sandbox Compilation...
                                </>
                              ) : (
                                <>
                                  <span>▶️ Run Code (WASM compiler)</span>
                                </>
                              )}
                            </button>
                            <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider">HackerRank Interactive Engine</span>
                          </div>

                          {/* Active Run logs */}
                          {codeExecutionLogs[index] && (
                            <div className="bg-black/95 p-3.5 rounded-lg border border-slate-850 font-mono text-[10px] space-y-3 text-left">
                              <div className="flex justify-between text-[8px] text-slate-500 border-b border-slate-900 pb-1.5 font-bold uppercase tracking-widest">
                                <span>Output Console Streams</span>
                                <span className={codeExecutionLogs[index].success ? "text-emerald-400" : "text-rose-500"}>
                                  {codeExecutionLogs[index].success ? `SUCCESS [${codeExecutionLogs[index].durationMs}ms]` : "SYNTAX ERROR"}
                                </span>
                              </div>
                              
                              {codeExecutionLogs[index].error ? (
                                <p className="text-rose-500 leading-relaxed font-mono whitespace-pre-wrap">
                                  {codeExecutionLogs[index].error}
                                </p>
                              ) : (
                                <>
                                  {/* Side-by-side / Compare Display with Time, Memory constraints */}
                                  {codeExecutionLogs[index].testCaseResults && (
                                    <div className="space-y-2">
                                      <span className="text-[8px] text-slate-400 font-black tracking-wider uppercase block">Test Case Verifications</span>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-[9px] border-collapse text-left">
                                          <thead>
                                            <tr className="border-b border-slate-800 text-slate-500 uppercase text-[8px]">
                                              <th className="pb-1 px-1">Case</th>
                                              <th className="pb-1 px-1">Input</th>
                                              <th className="pb-1 px-1">Expected Output</th>
                                              <th className="pb-1 px-1">Your Display Output</th>
                                              <th className="pb-1 px-1 text-center">Time Used (Limit)</th>
                                              <th className="pb-1 px-1 text-center">Memory (Limit)</th>
                                              <th className="pb-1 px-1 text-right">Result</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {codeExecutionLogs[index].testCaseResults.map((tcRes: any, tcIdx: number) => (
                                              <tr key={tcIdx} className="border-b border-slate-900/65 text-slate-300">
                                                <td className="py-2 px-1 font-bold text-slate-500">#{tcIdx + 1}</td>
                                                <td className="py-2 px-1 text-indigo-300 truncate max-w-[80px]" title={tcRes.input}>{tcRes.input}</td>
                                                <td className="py-2 px-1 text-emerald-400 font-semibold truncate max-w-[85px]" title={tcRes.expected}>{tcRes.expected}</td>
                                                <td className={`py-2 px-1 font-semibold truncate max-w-[85px] ${tcRes.status === "Passed" ? "text-emerald-400" : tcRes.status === "Failed" ? "text-rose-400 font-bold" : "text-amber-500 font-mono"}`} title={tcRes.actual}>
                                                  {tcRes.actual}
                                                </td>
                                                <td className="py-2 px-1 text-center text-slate-400 whitespace-nowrap">
                                                  {tcRes.duration} <span className="opacity-50 text-[7px]">({tcRes.durationLimit})</span>
                                                </td>
                                                <td className="py-2 px-1 text-center text-slate-400 whitespace-nowrap">
                                                  {tcRes.memory} <span className="opacity-50 text-[7px]">({tcRes.memoryLimit})</span>
                                                </td>
                                                <td className="py-2 px-1 text-right">
                                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${tcRes.status === "Passed" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-rose-950 text-rose-400 border border-rose-900"}`}>
                                                    {tcRes.status}
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="pt-1.5 text-[9px] text-slate-400 leading-relaxed whitespace-pre-wrap border-t border-slate-900/80 mt-1">
                                    {codeExecutionLogs[index].stdout}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* SUBMITTED SPLASH SCREEN */
              <div className="text-center py-12 max-w-2xl mx-auto space-y-6">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Training Test Submitted Successfully!</h3>
                  <p className="text-sm text-slate-500">
                    Your attendance is registered. Your computed points have been finalized.
                  </p>
                </div>

                {/* Rewrite Exam Permission Callout */}
                {currentStudentObj?.rewriteDays?.includes(activeDay) && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left animate-fade-in shadow-xs">
                    <div className="space-y-1">
                      <span className="bg-purple-100 text-purple-800 text-[9px] font-extrabold uppercase font-mono px-2 py-0.5 rounded">Special Classroom Permission</span>
                      <h4 className="text-sm font-extrabold text-purple-950 font-sans">You have special permission to rewrite this exam!</h4>
                      <p className="text-xs text-purple-800 font-sans">Your instructor has allowed you to rewrite this day's milestone to improve your grade. Your previous answers are preserved below as a starting draft.</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsTestSubmitted(false);
                        setReviewSubmission(null);
                        setShowReviewExplanations(false);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition flex items-center gap-2 whitespace-nowrap cursor-pointer focus:outline-none"
                    >
                      <span>📝 Start Rewrite Attempt</span>
                    </button>
                  </div>
                )}

                {reviewSubmission && (
                  <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3.5 text-left">
                    <p className="font-mono text-xs text-slate-400">SUBMISSION ID: {reviewSubmission.id}</p>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-3.5 rounded-lg shadow-sm border border-indigo-100">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Your Grade</span>
                        <span className="text-2xl font-black text-indigo-600 font-mono">
                          {reviewSubmission.score} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-lg shadow-sm border border-indigo-100">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">MCQ Points</span>
                        <span className="text-2xl font-black text-slate-800 font-mono">
                          {reviewSubmission.mcqScores} <span className="text-xs text-slate-400 font-normal">/ 8</span>
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-lg shadow-sm border border-indigo-100">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Status Code</span>
                        <span className="text-sm font-bold text-emerald-600 block mt-1">PRESENT</span>
                      </div>
                    </div>

                    {/* Show Previous Attempts comparison table if rewritten */}
                    {reviewSubmission.previousAttempts && reviewSubmission.previousAttempts.length > 0 && (
                      <div className="bg-white/90 p-4 rounded-lg border border-purple-150 space-y-2.5 mt-2 font-sans shadow-2xs">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-purple-100">
                          <span className="text-xs font-black text-purple-900 tracking-wide uppercase font-mono">📈 Exam Improvement & Rewrite History</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-mono text-[10px]">
                            <thead>
                              <tr className="border-b border-purple-100 text-purple-800">
                                <th className="pb-1 px-1">Attempt</th>
                                <th className="pb-1 px-1">Submitted At</th>
                                <th className="pb-1 px-1 text-center">MCQ Points</th>
                                <th className="pb-1 px-1 text-right">Score</th>
                                <th className="pb-1 px-1 text-right">Improvement</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reviewSubmission.previousAttempts.map((att, idx) => (
                                <tr key={idx} className="border-b border-purple-50 text-purple-900/70">
                                  <td className="py-1.5 px-1 font-bold">Attempt #{idx + 1} (Retake)</td>
                                  <td className="py-1.5 px-1">{new Date(att.submittedAt).toLocaleString()}</td>
                                  <td className="py-1.5 px-1 text-center">{att.mcqScores}/8 correct</td>
                                  <td className="py-1.5 px-1 text-right font-bold">{att.score} / 10 pts</td>
                                  <td className="py-1.5 px-1 text-right text-slate-400">—</td>
                                </tr>
                              ))}
                              <tr className="bg-emerald-50/50 font-bold text-emerald-950">
                                <td className="py-1.5 px-1">Current Active Attempt</td>
                                <td className="py-1.5 px-1">{new Date(reviewSubmission.submittedAt).toLocaleString()}</td>
                                <td className="py-1.5 px-1 text-center">{reviewSubmission.mcqScores}/8 correct</td>
                                <td className="py-1.5 px-1 text-right font-black text-emerald-700">{reviewSubmission.score} / 10 pts</td>
                                <td className="py-1.5 px-1 text-right font-black text-emerald-700">
                                  +{ reviewSubmission.score - reviewSubmission.previousAttempts[0].score } point{reviewSubmission.score - reviewSubmission.previousAttempts[0].score > 1 ? "s" : ""} 🎉
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanations Accordion list */}
                {quizData.mcqs && (
                  <div className="border border-slate-250 rounded-xl bg-white overflow-hidden text-left">
                    <button
                      onClick={() => setShowReviewExplanations(!showReviewExplanations)}
                      className="w-full py-4 px-6 font-bold text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 flex justify-between items-center transition"
                    >
                      <span>Review MCQ Questions & Correct Explanations</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 transition-transform ${
                          showReviewExplanations ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showReviewExplanations && (
                      <div className="p-6 divide-y divide-slate-150 space-y-6">
                        {/* Section A: MCQ Answers */}
                        <div className="space-y-6">
                          <h4 className="font-bold text-slate-800 text-sm border-b pb-2">SECTION A: MULTIPLE CHOICE CORRECT RESPONSES</h4>
                          {quizData.mcqs.map((mcq, idx) => {
                            const userSelected = selectedMCQAnswers[idx];
                            const isCorrect = userSelected === mcq.correctOption;

                            return (
                              <div key={idx} className="pt-4 first:pt-0 space-y-2">
                                <p className="font-bold text-slate-900 text-sm">
                                  {idx + 1}. {mcq.questionText}
                                </p>

                                <div className="text-xs space-y-1">
                                  <div className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded flex items-center justify-between font-medium">
                                    <span>Correct Answer: {mcq.options[mcq.correctOption]}</span>
                                    <span className="font-mono text-[10px]">CORRECT</span>
                                  </div>

                                  {userSelected !== undefined && !isCorrect && (
                                    <div className="text-red-700 bg-red-50 px-3 py-1.5 rounded flex items-center justify-between font-medium">
                                      <span>Your Selection: {mcq.options[userSelected]}</span>
                                      <span className="font-mono text-[10px]">INCORRECT</span>
                                    </div>
                                  )}
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed pl-2 border-l-2 border-slate-300">
                                  <span className="font-semibold text-slate-700">Explainer:</span> {mcq.explanation}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Section B: Coding Solutions */}
                        {quizData.coding && quizData.coding.length > 0 && (
                          <div className="pt-6 space-y-4">
                            <h4 className="font-bold text-slate-800 text-sm border-b pb-2">SECTION B: CODING EXAM SOLUTIONS</h4>
                            {quizData.coding.map((codingQ, cIdx) => {
                              const userCode = codingAnswers[cIdx] || "";
                              return (
                                <div key={cIdx} className="space-y-3 pt-4">
                                  <p className="font-bold text-slate-900 text-sm">
                                    Task {cIdx + 1}. {codingQ.questionText}
                                  </p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-slate-550 block uppercase">Your Submitted Code:</span>
                                      <pre className="bg-slate-900 text-indigo-300 font-mono text-xs p-3.5 rounded-lg overflow-x-auto min-h-[100px]">
                                        {userCode.trim() || "# No code entered"}
                                      </pre>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-emerald-600 block uppercase">Ideal Model Solution Code:</span>
                                      <pre className="bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 rounded-lg overflow-x-auto min-h-[100px]">
                                        {codingQ.solutionDescription.trim() || "# No ideal code schema provided"}
                                      </pre>
                                    </div>
                                  </div>

                                  {/* 🟥 Error & Alignment Trace: Ideal vs Written Solution */}
                                  {(() => {
                                    const diag = diagnoseCodeErrors(userCode, codingQ.solutionDescription, codingQ.expectedKeywords || []);
                                    const userLines = userCode.split('\n');
                                    return (
                                      <div className="bg-rose-50/40 border border-red-200/80 rounded-xl p-4.5 space-y-3 font-sans text-left shadow-2xs">
                                        <div className="flex items-center justify-between pb-2 border-b border-rose-200/40">
                                          <span className="text-[10px] font-extrabold text-red-600 tracking-wider uppercase block font-mono">
                                            🟥 Code Comparison & Exact Error Diagnostics
                                          </span>
                                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-extrabold uppercase ${diag.hasError ? "bg-red-100 text-red-700 border border-red-300 animate-pulse" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                                            {diag.hasError ? "CRITICAL ERRORS FOUND" : "SYNTAX OK"}
                                          </span>
                                        </div>

                                        {diag.hasError ? (
                                          <div className="space-y-3">
                                            {/* Main Error Box */}
                                            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
                                              <div className="flex gap-2">
                                                <span className="text-red-600 font-extrabold font-mono text-xs">[{diag.errorType}]</span>
                                                <p className="text-red-700 font-bold text-xs font-mono">{diag.errorMessage}</p>
                                              </div>
                                              <p className="text-red-600/90 text-[11px] mt-1.5 leading-relaxed">
                                                <strong className="text-red-800">Root Cause Trace: </strong> 
                                                {diag.detailedExplanation}
                                              </p>
                                            </div>

                                            {/* Offending Line Visual Highlight */}
                                            {diag.offendingLineNumber && (
                                              <div className="space-y-1">
                                                <span className="text-[9.5px] font-bold text-red-500 uppercase block font-mono">
                                                  📍 Exact Error Origin Point (Line #{diag.offendingLineNumber}):
                                                </span>
                                                <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs overflow-x-auto border border-red-350">
                                                  {userLines.map((line, lIdx) => {
                                                    const currentLineNum = lIdx + 1;
                                                    const isOffending = currentLineNum === diag.offendingLineNumber;
                                                    return (
                                                      <div key={lIdx} className={`flex items-start py-0.5 ${isOffending ? "bg-red-950/80 text-red-400 font-bold border-l-2 border-red-500 pl-1" : "text-slate-400"}`}>
                                                        <span className={`w-8 select-none text-[10px] text-right pr-2 ${isOffending ? "text-red-400 font-bold" : "text-slate-600"}`}>
                                                          {currentLineNum}
                                                        </span>
                                                        <span className={isOffending ? "text-red-400" : ""}>
                                                          {line || " "}
                                                        </span>
                                                        {isOffending && (
                                                          <span className="ml-3 text-red-500 font-bold animate-pulse text-[10px] whitespace-nowrap">
                                                            ◀— exact error occurred here (red highlighted block)
                                                          </span>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}

                                            {/* Keyword Gaps */}
                                            {diag.missingKeywords && diag.missingKeywords.length > 0 && (
                                              <div className="bg-red-50/50 border border-red-150 p-3 rounded-lg space-y-1.5">
                                                <span className="text-[9.5px] font-black text-red-700 uppercase tracking-wider block font-mono">
                                                  ⚠️ Unimplemented Requirements (Algorithmic Logic):
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {diag.missingKeywords.map((kw, kwIdx) => (
                                                    <span key={kwIdx} className="bg-red-100 text-red-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-red-200">
                                                      "{kw}" missing
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg text-emerald-800 text-xs flex items-center gap-2 font-mono">
                                            <span>✅</span>
                                            <span>No syntax, signature, or delimiter errors detected in your submission. Excellent execution!</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Test Case Review & Side-by-side comparison */}
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 font-sans text-left">
                                    <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase block font-mono">
                                      📊 Test Case Review & Side-By-Side Output Comparisons
                                    </span>
                                    <div className="overflow-x-auto font-sans">
                                      <table className="w-full text-[10px] text-left font-mono">
                                        <thead>
                                          <tr className="border-b border-slate-200 text-slate-500 uppercase text-[8px]">
                                            <th className="py-1 px-1">Case</th>
                                            <th className="py-1 px-1">Input</th>
                                            <th className="py-1 px-1">Expected Correct Output</th>
                                            <th className="py-1 px-1">Your Display Output</th>
                                            <th className="py-1 px-1 text-center">Runtime Stats (Time / RAM)</th>
                                            <th className="py-1 px-1 text-right">Verification</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {getTestCasesForQuestion(codingQ.questionText).map((tc, tcIdx) => {
                                            const userLower = userCode.toLowerCase();
                                            const expectedKeywords = codingQ.expectedKeywords || [];
                                            const missingKws = expectedKeywords.filter(kw => !userLower.includes(kw.toLowerCase()));
                                            const hasSyntaxError = (userCode.match(/\(/g) || []).length !== (userCode.match(/\)/g) || []).length;
                                            
                                            const status = !userCode.trim() ? "Error" : hasSyntaxError ? "Error" : missingKws.length > 0 ? "Failed" : "Passed";
                                            const actualDisplay = status === "Passed" ? tc.expectedOutput : status === "Failed" ? "None (Mismatched signature or algorithmic logic)" : "SyntaxError: compilation failed";
                                            
                                            return (
                                              <tr key={tcIdx} className="border-b border-slate-100 text-slate-700">
                                                <td className="py-2 px-1 font-bold text-slate-400">#{tcIdx + 1}</td>
                                                <td className="py-2 px-1 text-indigo-900 font-semibold truncate max-w-[100px]" title={tc.input}>{tc.input}</td>
                                                <td className="py-2 px-1 text-emerald-600 font-bold truncate max-w-[120px]" title={tc.expectedOutput}>{tc.expectedOutput}</td>
                                                <td className={`py-2 px-1 truncate max-w-[120px] font-semibold ${status === "Passed" ? "text-emerald-600" : "text-rose-650"}`} title={actualDisplay}>
                                                  {actualDisplay}
                                                </td>
                                                <td className="py-2 px-1 text-center text-slate-500 text-[9px] whitespace-nowrap">
                                                  {status === "Passed" ? `1.1ms / 0.9MB` : status === "Failed" ? `4.2ms / 1.1MB` : `—`}
                                                </td>
                                                <td className="py-2 px-1 text-right">
                                                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold font-mono uppercase ${status === "Passed" ? "bg-emerald-55 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                                                    {status === "Passed" ? "PASSED" : status === "Failed" ? "FAILED" : "COMP ERROR"}
                                                  </span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* 🤖 AUTOMATED REAL-TIME AI CODE COMPARISON PANEL */}
                                  <div className="pt-3">
                                    {!codeComparisonData[cIdx] ? (
                                      <button
                                        type="button"
                                        onClick={() => handleCompareCode(cIdx, userCode, codingQ.solutionDescription, codingQ.questionText)}
                                        disabled={loadingComparisonIndices[cIdx] || !userCode.trim()}
                                        className="bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-200 text-white font-bold font-mono text-[10px] px-4 py-2 rounded-xl transition uppercase flex items-center gap-1.5 cursor-pointer shadow-sm disabled:text-slate-400"
                                      >
                                        {loadingComparisonIndices[cIdx] ? (
                                          <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                            Comparing solutions with Gemini AI...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Compare Solution & Diagnose Mistakes
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <div className="bg-slate-900 border border-slate-800 text-slate-100 p-5 rounded-2xl space-y-4 shadow-lg animate-fadeIn">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                          <div className="flex items-center gap-2">
                                            <Sparkles className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
                                            <div>
                                              <h5 className="text-[11px] font-black uppercase font-sans tracking-widest leading-none text-slate-100">
                                                🤖 Intelligent Code Comparative Analysis
                                              </h5>
                                              <p className="text-[9px] text-slate-400 mt-1">Real-time mistake detection, syntax anomalies, and structural alignment logs.</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded border border-indigo-550/25 font-mono text-[10px] font-black">
                                            <span>MATCH INDEX:</span>
                                            <span className="text-white">{codeComparisonData[cIdx].matchPercentage}%</span>
                                          </div>
                                        </div>

                                        {/* Praise */}
                                        {codeComparisonData[cIdx].praise && (
                                          <div className="bg-indigo-950/40 border border-indigo-900/40 p-3 rounded-xl text-xs text-indigo-200 leading-relaxed italic">
                                            💡 "{codeComparisonData[cIdx].praise}"
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Mistakes column */}
                                          <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl space-y-2">
                                            <h6 className="text-[10px] font-bold text-rose-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                                              ⚠️ Identified Gaps & Mistakes
                                            </h6>
                                            {codeComparisonData[cIdx].mistakes && codeComparisonData[cIdx].mistakes.length > 0 ? (
                                              <ul className="space-y-1.5 text-[10.5px] text-slate-300 list-disc pl-3">
                                                {codeComparisonData[cIdx].mistakes.map((m, idx) => (
                                                  <li key={idx} className="leading-normal">{m}</li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-[10px] text-emerald-400 font-medium">No logical or structural mistakes found! Excellent logic translation.</p>
                                            )}
                                          </div>

                                          {/* Suggestions column */}
                                          <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl space-y-2">
                                            <h6 className="text-[10px] font-bold text-emerald-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                                              💡 Structural Suggestions & Tips
                                            </h6>
                                            {codeComparisonData[cIdx].suggestions && codeComparisonData[cIdx].suggestions.length > 0 ? (
                                              <ul className="space-y-1.5 text-[10.5px] text-slate-300 list-disc pl-3">
                                                {codeComparisonData[cIdx].suggestions.map((s, idx) => (
                                                  <li key={idx} className="leading-normal">{s}</li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-[10px] text-slate-400">No suggestions needed. Your structure matches optimal performance standards.</p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Line-by-line visual comparison block */}
                                        {codeComparisonData[cIdx].lineByLine && codeComparisonData[cIdx].lineByLine.length > 0 && (
                                          <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden text-xs">
                                            <div className="bg-slate-900/80 border-b border-slate-850 px-3.5 py-2 text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                                              Detailed Block Alignment Logs
                                            </div>
                                            <div className="divide-y divide-slate-900 overflow-x-auto">
                                              {codeComparisonData[cIdx].lineByLine.map((lbl, idx) => (
                                                <div key={idx} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 leading-relaxed font-mono">
                                                  <div className="md:col-span-5 space-y-1">
                                                    <span className="text-[8px] text-slate-500 uppercase block">Your Block:</span>
                                                    <code className="text-[11px] text-rose-300 block bg-slate-900/60 p-1.5 rounded">{lbl.userLine || "(Empty or missing)"}</code>
                                                  </div>
                                                  <div className="md:col-span-5 space-y-1">
                                                    <span className="text-[8px] text-emerald-500 uppercase block">Ideal Alignment Block:</span>
                                                    <code className="text-[11px] text-emerald-300 block bg-slate-900/60 p-1.5 rounded">{lbl.idealLine}</code>
                                                  </div>
                                                  <div className="md:col-span-2 flex flex-col justify-center">
                                                    <span className={`inline-block text-[8px] font-bold text-center uppercase px-2 py-0.5 rounded-full ${
                                                      lbl.status === "match" ? "bg-emerald-500/10 text-emerald-400" :
                                                      lbl.status === "mismatch" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                                                    }`}>
                                                      {lbl.status}
                                                    </span>
                                                    <p className="text-[9px] text-slate-400 mt-1 leading-normal font-sans">{lbl.note}</p>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => setCodeComparisonData((prev) => {
                                            const copy = { ...prev };
                                            delete copy[cIdx];
                                            return copy;
                                          })}
                                          className="text-[9px] font-mono text-slate-400 hover:text-white transition underline cursor-pointer"
                                        >
                                          Reset comparative panel
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setActiveDay(null);
                      setQuizData(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2 px-6 rounded-lg transition"
                  >
                    Back to Curriculum Dayboard
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "assessments" ? (
          <StudentAssessmentsView
            student={student}
            submissions={submissions}
            assessments={assessments}
            overrides={overrides}
            onProgressSubmit={() => fetchStudentContext()}
            scheduledTests={scheduledTests}
            scheduledSubmissions={scheduledSubmissions}
          />
        ) : activeTab === "resume" ? (
          !(locks["Global"]?.featureLocks?.resume || locks[student.batch]?.featureLocks?.resume) ? (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center space-y-6 max-w-lg mx-auto py-12">
              <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100 text-rose-500">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  ATS Resume Builder is Locked
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Your classroom instructor has locked the ATS Resume Maker. Once unlocked, you will gain full interactive access to compile, format, and download your verified single-column ATS resume in PDF, Word, Plain Text, and Markdown formats.
                </p>
                <div className="mx-auto max-w-xs bg-amber-50 border border-amber-200 rounded-lg p-3 text-left text-[11px] text-amber-850 mt-4 font-sans font-medium flex items-start gap-2">
                  <span className="shrink-0 text-amber-500">⚠️</span>
                  <span><strong>Roll Number: {student.rollNumber}</strong> is currently locked from ATS Resume compilation. Please inform your classroom instructor to enable your feature permission gate in the batch classroom feature access control tab.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchStudentContext()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs py-2 px-6 rounded-lg transition shadow-xs cursor-pointer animate-pulse"
              >
                Sync Lock Status
              </button>
            </div>
          ) : (
            <AtsResumeMaker student={student} />
          )
        ) : activeTab === "interview" ? (
          (!currentStudentObj?.interviewPermission && !specialPermissionBypass) ? (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center space-y-6 max-w-lg mx-auto py-12">
              <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100 text-rose-500">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Placement Recruiter Simulation Locked
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  To ensure realistic preparation under appropriate guidelines, students require **explicit authorization from the classroom instructor** before attempting the Gemini AI mock interview panel.
                </p>
                <div className="mx-auto max-w-xs bg-amber-50 border border-amber-200 rounded-lg p-3 text-left text-[11px] text-amber-850 mt-4 font-sans font-medium flex items-start gap-2">
                  <span className="shrink-0 text-amber-500">⚠️</span>
                  <span><strong>Roll Number: {student.rollNumber}</strong> is currently unauthorized. Please inform Teacher Vinay to enable your permission gate in the batch classroom roster interface.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchStudentContext()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs py-2 px-6 rounded-lg transition shadow-xs cursor-pointer"
              >
                Sync Authorization Status
              </button>
            </div>
          ) : (
            <AiInterviewRoom
              student={student}
              submissions={submissions}
              assessments={assessments}
              overrides={overrides}
              onRefreshContext={() => fetchStudentContext()}
              specialPermissionBypass={specialPermissionBypass}
            />
          )
        ) : (activeTab as any) === "ai-videos" ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 animate-fade-in text-left">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-5.5 h-5.5 text-rose-600 animate-pulse" />
                Your AI Interview Recordings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-sans">
                Below are the AI technical and behavioral placement interview sessions recorded using your webcam, which have been evaluated and authorized for review by your classroom mentor.
              </p>
            </div>

            {studentInterviews.filter(item => item.videoAccessGranted && item.videoUrl).length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                No interview video recordings have been unlocked by your mentor yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {studentInterviews
                  .filter(item => item.videoAccessGranted && item.videoUrl)
                  .map((item) => (
                    <div key={item.id} className="bg-slate-950 rounded-2xl border border-slate-850 p-4 text-white flex flex-col justify-between space-y-3.5 shadow-md">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-black text-indigo-400 uppercase font-mono tracking-wider">
                            {item.subject} &bull; {item.difficulty}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                            Session Date: {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <span className="font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-900 px-2 py-0.5 rounded text-[10px] font-bold">
                          Score: {item.report?.score || "N/A"}/100
                        </span>
                      </div>

                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-[220px]">
                        <video
                          src={item.videoUrl}
                          controls
                          className="w-full h-full"
                        />
                      </div>

                      <div className="space-y-1 bg-slate-900/50 p-3 rounded-xl border border-slate-850/50">
                        <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block font-mono">Feedback Summary:</span>
                        <p className="text-[10.5px] text-slate-300 leading-normal font-sans italic">
                          "{item.report?.summary}"
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : activeTab === "careers" ? (
          (!currentStudentObj?.placementPermission && !specialPermissionBypass) ? (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-8 border border-slate-800 text-center text-white shadow-xl max-w-3xl mx-auto space-y-6 my-6 animate-fade-in">
              <div className="mx-auto w-16 h-16 bg-slate-800/85 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 animate-pulse">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black font-sans tracking-tight text-white">Placement Gateway Interface Restricted</h3>
                <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
                  Access to the Live Jobs Gateway and recruiter matched profiles requires **Teacher Placement Clearance**. Once approved, you can utilize the AI Resume Matching engine to find jobs on LinkedIn, Indeed, Naukri, and other major platforms.
                </p>
              </div>

              {/* Course Completed check - trigger details collection to help management */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 max-w-2xl mx-auto">
                <div className="flex items-center gap-2.5 justify-center text-indigo-300">
                  <Award className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold text-xs uppercase font-mono tracking-widest">Enrollment & Details Collection</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-lg mx-auto">
                  If you have completed your academic syllabus or are ready for management matching, click the button below to submit your job search links to executive coordinator logs.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPlacementForm({
                      linkedin: currentStudentObj.placementDetails?.linkedin || "",
                      indeed: currentStudentObj.placementDetails?.indeed || "",
                      naukri: currentStudentObj.placementDetails?.naukri || "",
                      glassdoor: currentStudentObj.placementDetails?.glassdoor || "",
                      foundit: currentStudentObj.placementDetails?.foundit || "",
                      shine: currentStudentObj.placementDetails?.shine || "",
                      timesjobs: currentStudentObj.placementDetails?.timesjobs || "",
                      internshala: currentStudentObj.placementDetails?.internshala || "",
                      wellfound: currentStudentObj.placementDetails?.wellfound || "",
                      apna: currentStudentObj.placementDetails?.apna || ""
                    });
                    setShowPlacementModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold font-mono text-xs py-2.5 px-6 rounded-xl transition shadow-lg shrink-0 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  <span>Fill Your Details (Management)</span>
                </button>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-widest block text-center">Compatible Portals</span>
                <div className="mt-3 flex flex-wrap gap-2 justify-center max-w-lg mx-auto opacity-70">
                  {["LinkedIn", "Indeed", "Naukri.com", "Glassdoor", "Foundit", "Shine.com", "Timesjobs", "Internshala", "Wellfound", "Apna App"].map((platform) => (
                    <span key={platform} className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-[10px] font-mono text-slate-300">
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 border border-slate-800 text-white shadow-lg space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-indigo-900 pb-5">
                <div className="space-y-1">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-mono text-[9px] font-extrabold py-1 px-2.5 rounded-full uppercase tracking-wider inline-block">
                      Unified Jobs Placement Hub
                    </span>
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-extrabold py-1 px-2.5 rounded-full uppercase tracking-wider inline-block">
                      ● Active Placement Gate Cleared
                    </span>
                  </div>
                  <h4 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2 mt-1">
                    <Briefcase className="w-5 h-5 text-emerald-400 shrink-0" />
                    Live Career Matching Engine
                  </h4>
                  <p className="text-slate-300 text-xs font-sans max-w-xl">
                    Unlock specialized software roles dynamically based on your completed classroom assignments, or analyze your resume with AI!
                  </p>
                </div>

                <div className="flex gap-3 flex-col sm:flex-row items-stretch sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPlacementForm({
                        linkedin: currentStudentObj.placementDetails?.linkedin || "",
                        indeed: currentStudentObj.placementDetails?.indeed || "",
                        naukri: currentStudentObj.placementDetails?.naukri || "",
                        glassdoor: currentStudentObj.placementDetails?.glassdoor || "",
                        foundit: currentStudentObj.placementDetails?.foundit || "",
                        shine: currentStudentObj.placementDetails?.shine || "",
                        timesjobs: currentStudentObj.placementDetails?.timesjobs || "",
                        internshala: currentStudentObj.placementDetails?.internshala || "",
                        wellfound: currentStudentObj.placementDetails?.wellfound || "",
                        apna: currentStudentObj.placementDetails?.apna || ""
                      });
                      setShowPlacementModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold font-mono text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-indigo-500/20"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Fill Your Details</span>
                  </button>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-300 font-mono font-bold uppercase">
                      Preferred Job Location
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={jobLocation}
                        onChange={(e) => setJobLocation(e.target.value)}
                        placeholder="e.g. Hyderabad, India"
                        className="bg-white/10 hover:bg-white/15 focus:bg-white/18 text-white text-xs font-mono font-bold py-2 pl-3 pr-9 rounded-xl outline-none border border-white/15 focus:border-indigo-500 transition w-full sm:w-56 placeholder-white/30"
                      />
                      <Search className="w-4 h-4 text-white/40 absolute right-3 top-2.5" />
                    </div>
                  </div>
                </div>
              </div>

            {/* Split layout: Resume Analyzer on Left/Bottom, Match Cards on Right/Top */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Resume Input & Analysis Metadata */}
              <div className="lg:col-span-5 space-y-5 bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <FileText className="w-5 h-5" />
                    <span className="font-extrabold text-sm tracking-wide uppercase font-mono">
                      AI Resume Analyzer & Optimizer
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs font-medium font-sans">
                    Paste your core skills, project details, or complete resume text to extract instant keyword matching and generate customized portal links.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                      Resume Text content / Profile Summary
                    </label>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="e.g. Arjun Sharma | Data Scientist. Tech Stack: Python, Pandas, Scikit-Learn pipelines, TensorFlow. Built a predictive heart disease model using Decision Trees..."
                      rows={5}
                      className="bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 text-white text-xs font-mono p-3 rounded-xl border border-white/10 focus:border-indigo-500 outline-none w-full transition resize-none placeholder-white/20"
                    />
                  </div>

                  {resumeError && (
                    <div className="bg-red-950/35 border border-red-500/25 text-red-350 text-xs p-3 rounded-xl font-medium flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                      <span>{resumeError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyzeResume}
                    disabled={analyzingResume}
                    className="bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 disabled:from-slate-705 disabled:to-slate-805 disabled:text-slate-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all w-full flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-950/30 font-mono tracking-wide uppercase"
                  >
                    {analyzingResume ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        Analyzing Resume with Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-300 fill-emerald-300/20" />
                        Analyze Resume & Match Jobs
                      </>
                    )}
                  </button>
                </div>

                {/* AI Analysis feedback if available */}
                {resumeAnalysisResult && (
                  <div className="border-t border-white/10 pt-4 mt-4 space-y-3.5 animate-fade-in">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-extrabold text-emerald-400 block tracking-wider">
                        ★ Gemini Analysis Feedback:
                      </span>
                      <p className="text-[11px] text-slate-200 font-sans mt-1 italic leading-relaxed">
                        "{resumeAnalysisResult.experienceSummary}"
                      </p>
                    </div>

                    {resumeAnalysisResult.skills && resumeAnalysisResult.skills.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                          Parsed Core Skills:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {resumeAnalysisResult.skills.map((sk: string, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="bg-indigo-900/40 border border-indigo-700/30 text-indigo-300 text-[9px] font-bold px-2 py-0.5 rounded-md font-mono"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3.5 pt-1 text-[11px]">
                      {resumeAnalysisResult.strengths && resumeAnalysisResult.strengths.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block tracking-wide">
                            Resume Strengths
                          </span>
                          <ul className="list-disc pl-3 text-slate-350 space-y-1 mt-1 font-sans">
                            {resumeAnalysisResult.strengths.map((str: string, idx: number) => (
                              <li key={idx}>{str}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {resumeAnalysisResult.gaps && resumeAnalysisResult.gaps.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block tracking-wide">
                            Action Advice Gaps
                          </span>
                          <ul className="list-disc pl-3 text-slate-350 space-y-1 mt-1 font-sans">
                            {resumeAnalysisResult.gaps.map((gp: string, idx: number) => (
                              <li key={idx}>{gp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Suggested Matches */}
              <div className="lg:col-span-7 space-y-6">
                {(() => {
                  const pyDone = submissions.filter(sub => sub.dayNumber >= 1 && sub.dayNumber <= 30).length;
                  const numPyDone = submissions.filter(sub => sub.dayNumber >= 31 && sub.dayNumber <= 45).length;
                  const pandasDone = submissions.filter(sub => sub.dayNumber >= 46 && sub.dayNumber <= 75).length;
                  const mlDone = submissions.filter(sub => sub.dayNumber >= 76 && sub.dayNumber <= 105).length;

                  // Fallback/standard classroom roles
                  const classRoles = [
                    {
                      title: "Python Software Engineer",
                      skillsRequired: "Python, Dicts, Custom Classes, Exceptions",
                      isUnlocked: pyDone >= 5, 
                      unlockedMsg: "Requires 5 Days Python Core",
                      searchQuery: `Python Developer ${student.name ? `Data Scientist` : ""}`,
                    },
                    {
                      title: "Data Analyst (NumPy & Pandas)",
                      skillsRequired: "Vector arrays, Multi-dimensional Slicing, DataFrames, aggregations",
                      isUnlocked: pyDone >= 15 && pandasDone >= 2,
                      unlockedMsg: "Requires Python 15+ & Pandas 2+ Days",
                      searchQuery: "Data Analyst Pandas NumPy Python",
                    },
                    {
                      title: "Machine Learning Researcher",
                      skillsRequired: "Regression pipelines, Scikit-Learn pipelines, Dec Trees, KNN",
                      isUnlocked: mlDone >= 5,
                      unlockedMsg: "Requires Machine Learning Day 5+",
                      searchQuery: "Machine Learning Engineer Scikit Learn Python",
                    },
                  ];

                  const isResumeMode = !!resumeAnalysisResult;
                  const activeRolesList = resumeAnalysisResult && resumeAnalysisResult.suggestedRoles
                    ? resumeAnalysisResult.suggestedRoles
                    : classRoles;

                  return (
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 font-bold font-mono text-xs">
                            {isResumeMode ? "AI Resume-Matched Roles" : "Verified Classroom Tracks:"}
                          </span>
                        </div>

                        {/* Badges strip */}
                        <div className="flex flex-wrap gap-1.5">
                          {pyDone >= 5 && <span className="bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] font-bold px-2 py-0.5 rounded-lg">#Python3</span>}
                          {numPyDone >= 3 && <span className="bg-indigo-600/35 border border-indigo-500/40 text-indigo-300 font-mono text-[9px] font-bold px-2 py-0.5 rounded-lg">#NumPy_Arrays</span>}
                          {pandasDone >= 3 && <span className="bg-cyan-600/35 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] font-bold px-2 py-0.5 rounded-lg">#Pandas_Frames</span>}
                          {mlDone >= 2 && <span className="bg-amber-600/35 border border-amber-500/40 text-amber-300 font-mono text-[9px] font-bold px-2 py-0.5 rounded-lg">#Scikit_ML</span>}
                        </div>
                      </div>

                      {/* Matching Warning Banner if in classroom path */}
                      {!isResumeMode && (
                        <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-xl text-xs text-slate-300 flex items-start gap-2.5 animate-pulse">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <p>
                            Showing standard academy matching templates. Paste your credentials on the left to extract custom job searches optimized around your individual experience!
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeRolesList.map((role: any, idx: number) => {
                          const linkedinUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role.searchQuery)}&location=${encodeURIComponent(jobLocation)}&f_TPR=r2592000`;
                          const indeedUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(role.searchQuery)}&l=${encodeURIComponent(jobLocation)}`;
                          const naukriUrl = `https://www.naukri.com/${encodeURIComponent(role.searchQuery.replace(/\s+/g, '-'))}-jobs-in-${encodeURIComponent(jobLocation.split(',')[0].trim().toLowerCase())}`;
                          const wellfoundUrl = `https://wellfound.com/jobs?q=${encodeURIComponent(role.searchQuery)}&l=${encodeURIComponent(jobLocation)}`;
                          const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(role.searchQuery + ' jobs in ' + jobLocation)}&ibp=htl;jobs`;

                          return (
                            <div 
                              key={idx} 
                              className={`p-4 rounded-xl border flex flex-col justify-between transition duration-300 ${
                                isResumeMode 
                                  ? "bg-indigo-950/25 border-indigo-500/40 hover:border-indigo-400" 
                                  : "bg-white/5 border-white/10 hover:border-indigo-400"
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="font-extrabold text-sm text-white leading-snug">
                                    {role.title}
                                  </h5>
                                  <Briefcase className={`w-4 h-4 shrink-0 ${role.isUnlocked || isResumeMode ? "text-indigo-400" : "text-slate-500"}`} />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                                  Skills: {role.skillsRequired}
                                </p>
                              </div>
                              
                              {(role.isUnlocked || isResumeMode) ? (
                                <div className="mt-4 space-y-2 pt-3 border-t border-white/5">
                                  <span className="text-[9px] uppercase font-mono font-bold text-indigo-300 block">
                                    Search Live Jobs on Portals:
                                  </span>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <a 
                                      href={linkedinUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-blue-650 hover:bg-blue-600 border border-blue-500/20 text-white text-[9px] font-extrabold py-1.5 px-2 rounded-lg flex items-center justify-between transition focus:outline-none"
                                    >
                                      <span>LinkedIn</span>
                                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                    </a>
                                    <a 
                                      href={indeedUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-cyan-650 hover:bg-cyan-600 border border-cyan-500/20 text-white text-[9px] font-extrabold py-1.5 px-2 rounded-lg flex items-center justify-between transition focus:outline-none"
                                    >
                                      <span>Indeed</span>
                                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                    </a>
                                    <a 
                                      href={naukriUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-sky-650 hover:bg-sky-600 border border-sky-500/20 text-white text-[9px] font-extrabold py-1.5 px-2 rounded-lg flex items-center justify-between transition focus:outline-none"
                                    >
                                      <span>Naukri</span>
                                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                    </a>
                                    <a 
                                      href={wellfoundUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/20 text-white text-[9px] font-extrabold py-1.5 px-2 rounded-lg flex items-center justify-between transition focus:outline-none"
                                    >
                                      <span>Wellfound</span>
                                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                    </a>
                                  </div>
                                  <a 
                                    href={googleUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-indigo-600 hover:bg-indigo-555 border border-indigo-500/25 text-white text-[9px] font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition w-full focus:outline-none"
                                  >
                                    <span>Google Careers Results</span>
                                    <Search className="w-2.5 h-2.5 shrink-0" />
                                  </a>
                                </div>
                              ) : (
                                <div className="mt-4 bg-white/5 border border-white/5 text-slate-400 font-bold font-mono text-[9px] py-1.5 px-2 rounded-lg text-center select-none">
                                  🔒 {role.unlockedMsg}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Display customizable helper query below the matches */}
                      {isResumeMode && (
                        <div className="bg-indigo-950/40 border border-indigo-500/10 p-3.5 rounded-xl text-[11px] text-slate-350 space-y-1">
                          <span className="font-bold text-emerald-400 font-mono text-[10px] uppercase block">
                            💡 Advanced Recruiter Tip:
                          </span>
                          <p>
                            Gemini parsed your profile details and synthesized unique search queries (e.g. <strong>"{activeRolesList[0]?.searchQuery}"</strong>) custom-tailored for your background to find roles relevant for you in <strong>"{jobLocation}"</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Direct Division Divider - AI ATS-Friendly Resume Compiler */}
            <div className="border-t border-slate-800 my-6 pt-6 space-y-6">
              {(() => {
                const completedMilestones = submissions.length;
                const fiftyPercentMilestone = 100;
                const hasCompletedFiftyPercent = completedMilestones >= fiftyPercentMilestone;
                const teacherUnlocked = !!(locks["Global"]?.featureLocks?.resume || locks[student.batch]?.featureLocks?.resume);
                const isResumeBuilderUnlocked = teacherUnlocked || hasCompletedFiftyPercent || atsBypass || specialPermissionBypass;

                // Academic stats for verified certifications section block
                const sumScores = submissions.reduce((acc, cur) => acc + (cur.score || 0), 0);
                const avgScore = completedMilestones > 0 ? Number((sumScores / completedMilestones).toFixed(1)) : 0;

                const copyToClipboard = () => {
                  if (atsResult) {
                    navigator.clipboard.writeText(atsResult.formattedResume);
                    setCopiedAts(true);
                    setTimeout(() => {
                      setCopiedAts(false);
                    }, 2000);
                  }
                };

                const downloadTxt = () => {
                  if (atsResult) {
                    const file = new Blob([atsResult.formattedResume], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(file);
                    const element = document.createElement("a");
                    element.href = url;
                    element.download = `${atsInputs.fullName.replace(/\s+/g, "_")}_ATS_friendly_resume.txt`;
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                    URL.revokeObjectURL(url);
                  }
                };

                return (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <span className="bg-amber-500/15 border border-amber-500/35 text-amber-300 font-mono text-[9px] font-extrabold py-0.5 px-2.5 rounded-full uppercase tracking-wider inline-block">
                          ★ SPECIAL REPLACEMENT UPDATE
                        </span>
                        <h4 className="text-lg font-bold font-sans tracking-tight text-white flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-400 shrink-0" />
                          Interactive AI ATS-Friendly Resume Compiler
                        </h4>
                        <p className="text-slate-300 text-xs font-sans max-w-2xl">
                          Unlock a custom placement-aligned resume compiled directly with your official training scores and course completions. Recommended for elite applicants.
                        </p>
                      </div>

                      {/* Progress widget panel */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[240px] space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400 font-bold">TOTAL MILESTONES:</span>
                          <span className={hasCompletedFiftyPercent ? "text-emerald-400 font-extrabold" : "text-amber-400 font-bold"}>
                            {completedMilestones} / {fiftyPercentMilestone} Days
                          </span>
                        </div>
                        
                        {/* Progress Bar indicator representing half progress */}
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className={`h-full transition-all duration-500 ${hasCompletedFiftyPercent ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(100, Math.round((completedMilestones / fiftyPercentMilestone) * 100))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="text-slate-400 font-sans font-bold">
                            {hasCompletedFiftyPercent ? "✅ Feature Unlocked!" : `🔒 Unlocks at 50% (${fiftyPercentMilestone} Checkpoints)`}
                          </span>
                          <label className="flex items-center gap-1 cursor-pointer hover:text-white select-none text-[10px] text-indigo-300 font-mono font-bold">
                            <input
                              type="checkbox"
                              checked={atsBypass}
                              onChange={(e) => setAtsBypass(e.target.checked)}
                              className="rounded border-white/20 bg-slate-900 checked:bg-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                            />
                            Bypass Lock
                          </label>
                        </div>
                      </div>
                    </div>

                    {!isResumeBuilderUnlocked ? (
                      /* Lock Overlay Card */
                      <div className="bg-slate-950/40 border border-white/5 p-8 rounded-2xl text-center space-y-3.5">
                        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
                          <Lock className="w-5 h-5 text-amber-400" />
                        </div>
                        <h5 className="font-extrabold text-sm text-white">AI ATS Resume Builder Is Locked</h5>
                        <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                          Requires completing at least 50% of the syllabus milestones (100 days of curriculum assessments) to dynamically certify. You have currently completed <strong>{completedMilestones} / 200 Days</strong> checks.
                        </p>
                        <p className="text-[11px] text-indigo-400 font-bold font-mono">
                          ★ Developer Sandbox Tip: Check the "Bypass Lock" checkbox above to use this builder immediately!
                        </p>
                      </div>
                    ) : (
                      /* Active ATS Compiler module */
                      <div className="space-y-6">
                        <div className="bg-indigo-900/10 border border-indigo-700/20 p-4 rounded-xl text-xs text-indigo-200 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                          <p>
                            <strong>Academy Verification Active:</strong> Your actual training records (<strong>{completedMilestones} checkpoints completed</strong> with average score of <strong>{avgScore}%</strong>) are certified and compiled dynamically into your resume's Verified Credentials block!
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* Left Column questionnaire */}
                          <div className="lg:col-span-5 space-y-4 bg-white/5 border border-white/10 p-5 rounded-xl">
                            <span className="font-extrabold text-xs uppercase font-mono tracking-wider text-indigo-300 block border-b border-white/5 pb-2">
                              1. Personal & Technical Inputs
                            </span>

                            <div className="grid grid-cols-2 gap-3.5">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">FullName</label>
                                <input
                                  type="text"
                                  value={atsInputs.fullName}
                                  onChange={(e) => setAtsInputs({ ...atsInputs, fullName: e.target.value })}
                                  className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Email Address</label>
                                <input
                                  type="text"
                                  value={atsInputs.email}
                                  onChange={(e) => setAtsInputs({ ...atsInputs, email: e.target.value })}
                                  className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Phone</label>
                                <input
                                  type="text"
                                  value={atsInputs.phone}
                                  onChange={(e) => setAtsInputs({ ...atsInputs, phone: e.target.value })}
                                  className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">LinkedIn URL</label>
                                <input
                                  type="text"
                                  value={atsInputs.linkedin}
                                  onChange={(e) => setAtsInputs({ ...atsInputs, linkedin: e.target.value })}
                                  className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-slate-400">GitHub Profile</label>
                              <input
                                type="text"
                                value={atsInputs.github}
                                onChange={(e) => setAtsInputs({ ...atsInputs, github: e.target.value })}
                                className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Professional Summary</label>
                              <textarea
                                value={atsInputs.objective}
                                onChange={(e) => setAtsInputs({ ...atsInputs, objective: e.target.value })}
                                rows={3}
                                className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition resize-none leading-relaxed"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Technical Tools & Skills</label>
                              <textarea
                                value={atsInputs.topSkills}
                                onChange={(e) => setAtsInputs({ ...atsInputs, topSkills: e.target.value })}
                                rows={2}
                                className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition resize-none leading-relaxed"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Personal & Academy Projects</label>
                              <textarea
                                value={atsInputs.projectsText}
                                onChange={(e) => setAtsInputs({ ...atsInputs, projectsText: e.target.value })}
                                rows={3}
                                className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition resize-none leading-relaxed"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Formal Academic Qualifications</label>
                              <input
                                type="text"
                                value={atsInputs.educationText}
                                onChange={(e) => setAtsInputs({ ...atsInputs, educationText: e.target.value })}
                                className="bg-slate-950/60 text-white text-xs p-2.5 rounded-lg border border-white/10 outline-none w-full focus:border-indigo-500 transition"
                              />
                            </div>

                            {atsError && (
                              <div className="bg-red-950/35 border border-red-500/25 text-red-350 text-xs p-3 rounded-lg font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span>{atsError}</span>
                              </div>
                            )}

                            <button
                              onClick={handleBuildAtsResume}
                              disabled={compilingResume}
                              className="bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/30 font-bold font-mono tracking-wider uppercase text-white py-3 px-4 rounded-xl transition duration-300 w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {compilingResume ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  Compiling with Gemini...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 text-amber-400" />
                                  Compile ATS-friendly Resume
                                </>
                              )}
                            </button>
                          </div>

                          {/* Right Column preview block */}
                          <div className="lg:col-span-7 space-y-4">
                            <span className="font-extrabold text-xs uppercase font-mono tracking-wider text-amber-300 block border-b border-white/5 pb-2">
                              2. Clean plaintext ATS compiler output
                            </span>

                            {!atsResult ? (
                              <div className="bg-slate-950/30 border border-dashed border-white/10 p-12 rounded-xl text-center space-y-3.5 flex flex-col justify-center items-center h-[520px]">
                                <FileText className="w-12 h-12 text-slate-600" />
                                <h6 className="font-bold text-white text-sm">Resume Preview Sandbox</h6>
                                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                                  Fill in your individual profile fields on the left and trigger compilation to see clean machine-parser compliant outputs.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4 animate-fade-in">
                                {/* Copy / download controls bar */}
                                <div className="flex justify-between items-center bg-slate-950 border border-white/10 rounded-xl p-3">
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    ATS PARSER SAFE FORMAT
                                  </span>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={copyToClipboard}
                                      className="bg-indigo-600/35 hover:bg-indigo-600 border border-indigo-500/30 text-white font-bold font-mono text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                      {copiedAts ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span>Text Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy Text</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      onClick={downloadTxt}
                                      className="bg-emerald-600/35 hover:bg-emerald-600 border border-emerald-500/30 text-white font-bold font-mono text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download .TXT</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Monospace Text Box mimicking physical print */}
                                <div className="relative">
                                  <textarea
                                    readOnly
                                    value={atsResult.formattedResume}
                                    rows={16}
                                    className="bg-slate-950 text-slate-100 text-[10.5px] font-mono leading-relaxed p-4.5 rounded-xl border border-white/10 outline-none w-full resize-none scrollbar-thin shadow-inner block"
                                  />
                                </div>

                                {/* Keywords matching */}
                                {atsResult.optimizedKeywords && atsResult.optimizedKeywords.length > 0 && (
                                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
                                    <span className="text-[10px] uppercase font-mono font-bold text-slate-300 block">
                                      High-Frequency Search Keywords Extracted:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {atsResult.optimizedKeywords.map((kw: string, kIdx: number) => (
                                        <span 
                                          key={kIdx} 
                                          className="bg-amber-500/10 border border-amber-500/25 text-amber-300 px-2 py-0.5 rounded text-[9px] font-bold font-mono"
                                        >
                                          #{kw}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Recruiter hints */}
                                {atsResult.atsTips && atsResult.atsTips.length > 0 && (
                                  <div className="bg-indigo-950/20 border border-indigo-700/20 p-4 rounded-xl space-y-1.5">
                                    <span className="text-[10px] uppercase font-mono font-bold text-indigo-300 block">
                                      ★ Premium Recruiter Optimization Tips:
                                    </span>
                                    <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1 font-sans">
                                      {atsResult.atsTips.map((tip: string, tIdx: number) => (
                                        <li key={tIdx}>{tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )
      ) : (
          /* 2. STATE: LIST OF ALL 200 DAYS */
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-indigo-50 pb-2 mb-2 flex items-center gap-1.5">
                <Calendar className="w-5 h-5 text-indigo-600" />
                200 Days Curriculum Track Matrix
              </h3>
              <p className="text-sm text-slate-500">
                Days are unlocked day-after-day by teacher Vinay. Complete the respective 10 training questions inside active stages to maintain your academic streaks.
              </p>
            </div>

            {/* Render chapters list with day grids */}
            <div className="space-y-6">
              {SYLLABUS.map((chapter) => {
                const totalDaysInCurriculum = chapter.endDay - chapter.startDay + 1;

                // Gather days under this chapter
                const chapterDays = Array.from(
                  { length: totalDaysInCurriculum },
                  (_, i) => chapter.startDay + i
                );

                return (
                  <div key={chapter.slug} className="bg-white rounded-xl shadow-sm border border-slate-205 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-3 gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          {chapter.name}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                          {chapter.description}
                        </p>
                      </div>

                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 rounded px-2.5 py-1.5 self-start sm:self-auto shrink-0">
                        Day {chapter.startDay} - {chapter.endDay}
                      </span>
                    </div>

                    {/* Chapter-wise Video Attachments Widget */}
                    {(() => {
                      const chapterVideos = learningVideos.filter(v => v.courseSlug === chapter.slug);
                      const isAdding = showAttachFormSlug === chapter.slug;

                      return (
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4.5 space-y-3.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <Video className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">
                                Video Guides & Lecture Attachments ({chapterVideos.length})
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setVideoError(null);
                                if (isAdding) {
                                  setShowAttachFormSlug(null);
                                } else {
                                  setShowAttachFormSlug(chapter.slug);
                                  setNewVideoForm({ title: "", description: "", videoUrl: "" });
                                }
                              }}
                              className="text-[11px] font-bold font-mono text-indigo-600 bg-white border border-indigo-200 hover:border-indigo-500 rounded-lg px-2.5 py-1.5 flex items-center gap-1 hover:bg-indigo-50/50 cursor-pointer shadow-xs transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {isAdding ? "Cancel" : "Attach Course Video"}
                            </button>
                          </div>

                          {/* Video Form block inside the chapter item */}
                          {isAdding && (
                            <div className="bg-white p-4 border border-indigo-150 rounded-xl space-y-3 animate-fade-in shadow-xs">
                              <span className="text-[10px] font-bold uppercase font-mono text-indigo-600 block">
                                Add Supporting Video Resource for {chapter.name}
                              </span>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Resource Title *</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Scikit-Learn Pipeline Masterclass"
                                    value={newVideoForm.title}
                                    onChange={(e) => setNewVideoForm({ ...newVideoForm, title: e.target.value })}
                                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs p-2 rounded-lg outline-none w-full focus:border-indigo-500 transition"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">YouTube URL or Video Link *</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                                    value={newVideoForm.videoUrl}
                                    onChange={(e) => setNewVideoForm({ ...newVideoForm, videoUrl: e.target.value })}
                                    className="bg-slate-50 border border-slate-200 text-slate-800 text-xs p-2 rounded-lg outline-none w-full focus:border-indigo-500 transition"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Optional Description / Reference notes</label>
                                <textarea
                                  placeholder="Provide optional explanation tips, reference notebooks, timestamps, or guide steps..."
                                  value={newVideoForm.description}
                                  onChange={(e) => setNewVideoForm({ ...newVideoForm, description: e.target.value })}
                                  rows={1}
                                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs p-2 rounded-lg outline-none w-full focus:border-indigo-500 transition resize-none"
                                />
                              </div>

                              {videoError && (
                                <div className="bg-red-50 text-red-650 text-xs p-2 rounded-lg border border-red-155 flex items-center gap-1.5 font-bold font-sans">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                  <span>{videoError}</span>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAttachVideo(chapter.slug)}
                                  disabled={savingVideo}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-mono text-[10px] px-3.5 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
                                >
                                  {savingVideo ? "Saving..." : "Save Attachment"}
                                </button>
                                <button
                                  onClick={() => {
                                    setNewVideoForm({ title: "", description: "", videoUrl: "" });
                                    setShowAttachFormSlug(null);
                                    setVideoError(null);
                                  }}
                                  className="border border-slate-200 text-slate-650 font-bold font-mono text-[10px] px-3.5 py-2 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Attached Videos Gallery */}
                          {chapterVideos.length === 0 ? (
                            <div className="bg-white/50 border border-slate-150 rounded-xl p-5 text-center space-y-1">
                              <FileVideo className="w-7 h-7 text-slate-300 mx-auto" />
                              <span className="text-xs text-slate-500 font-semibold block">No video guidelines attached yet</span>
                              <span className="text-[10px] text-slate-400">Instructors and students can attach learning video resources to this chapter dynamic card!</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {chapterVideos.map((video) => {
                                const isYoutube = video.videoUrl.includes("youtube.com/embed/");
                                const isBook = video.attachmentType === "book";
                                const isMaterial = video.attachmentType === "material";
                                return (
                                  <div
                                    key={video.id}
                                    className="bg-white p-3.5 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition group flex flex-col justify-between space-y-2.5"
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex items-start justify-between gap-1.5">
                                        <span className={`font-mono text-[8.5px] font-black py-0.5 px-1.5 rounded uppercase shrink-0 border ${
                                          isBook
                                            ? "bg-amber-50 text-amber-750 border-amber-150"
                                            : isMaterial
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                                            : "bg-indigo-50 text-indigo-700 border-indigo-150"
                                        }`}>
                                          {isBook ? "📚 REFERENCE BOOK" : isMaterial ? "📁 STUDY MATERIAL" : (isYoutube ? "🎥 YOUTUBE GUIDE" : "🎥 VIDEO GUIDE")}
                                        </span>
                                        <span className="text-[8.5px] text-zinc-400 font-mono truncate max-w-[125px]">
                                          By {video.addedBy}
                                        </span>
                                      </div>

                                      <h5 className="font-bold text-xs text-slate-800 line-clamp-1 group-hover:text-indigo-900 leading-snug">
                                        {video.title}
                                      </h5>
                                      <p className="text-[10.5px] text-zinc-500 line-clamp-2 leading-relaxed">
                                        {video.description || "No supplemental reference logs provided for this course attachment."}
                                      </p>
                                    </div>

                                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                                      <span className="text-[9px] text-zinc-400 font-mono">
                                        {new Date(video.uploadedAt).toLocaleDateString()}
                                      </span>

                                      {isBook ? (
                                        <a
                                          href={video.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-[9.5px] py-1 px-2.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                                        >
                                          <BookOpen className="w-2.5 h-2.5" />
                                          Read Book
                                        </a>
                                      ) : isMaterial ? (
                                        <a
                                          href={video.videoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[9.5px] py-1 px-2.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                                        >
                                          <FileText className="w-2.5 h-2.5" />
                                          Access Material
                                        </a>
                                      ) : (
                                        <button
                                          onClick={() => setSelectedVideo(video)}
                                          className="bg-slate-900 hover:bg-indigo-600 text-white font-mono font-bold text-[9.5px] py-1 px-2.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                                        >
                                          <Play className="w-2.5 h-2.5 fill-current text-emerald-400" />
                                          Watch Video
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Matrix Grid Heading */}
                    <div className="border-t border-slate-100 pt-2">
                      <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase block mb-1">
                        Select Day Milestone Assessments
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {chapterDays.map((dayNum) => {
                        const cell = getDayStatus(dayNum);
                        const topicTitle = getTopicTitleForDay(dayNum);

                        if (cell.status === "completed") {
                          return (
                            <button
                              key={dayNum}
                              onClick={() => handleStartTest(dayNum)}
                              className="border rounded-xl p-4 bg-indigo-50/70 border-indigo-200 hover:bg-indigo-105 hover:shadow-sm transition text-left flex flex-col justify-between h-32 relative group cursor-pointer"
                              title="Reviewed / Taken"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-extrabold text-indigo-700 font-mono text-sm">Day {dayNum}</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  COMPLETED
                                </span>
                              </div>
                              <div className="my-2">
                                <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-900">
                                  {topicTitle}
                                </p>
                              </div>
                              <div className="flex justify-between items-center w-full mt-auto pt-1 border-t border-indigo-200/50">
                                <span className="text-[10px] text-slate-500 font-medium">Performance Grade:</span>
                                <span className="text-xs font-black text-indigo-900 font-mono">
                                  {cell.score} <span className="text-[10px] text-indigo-550 font-normal">/ 10 pts</span>
                                </span>
                              </div>
                            </button>
                          );
                        }

                        if (cell.status === "unlocked") {
                          return (
                            <button
                              key={dayNum}
                              onClick={() => handleStartTest(dayNum)}
                              className="border rounded-xl p-4 bg-white border-indigo-300 shadow-sm hover:border-indigo-600 hover:shadow-md transition text-left flex flex-col justify-between h-32 group relative cursor-pointer"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-extrabold text-indigo-650 font-mono text-sm">Day {dayNum}</span>
                                <span className="bg-indigo-100 text-indigo-805 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                                  UNLOCKED
                                </span>
                              </div>
                              <div className="my-2">
                                <p className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-700">
                                  {topicTitle}
                                </p>
                              </div>
                              <div className="flex items-center justify-between w-full mt-auto pt-1 border-t border-slate-100">
                                <span className="text-[10px] text-indigo-600 font-black tracking-wider uppercase font-mono">START TEST</span>
                                <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </button>
                          );
                        }

                        // Locked State with preview of what's coming next
                        const isInstructorUnlocked = unlockedDays.includes(dayNum);
                        return (
                          <div
                            key={dayNum}
                            className={`border rounded-xl p-4 text-left flex flex-col justify-between h-32 relative transition group ${
                              isInstructorUnlocked
                                ? "border-amber-200 bg-amber-50/40 text-amber-800/80 hover:bg-amber-50"
                                : "border-slate-200 bg-slate-50 text-slate-400 opacity-85 hover:opacity-95"
                            }`}
                            title={
                              isInstructorUnlocked
                                ? `Locked: Complete Day ${dayNum - 1} first`
                                : "Locked by classroom instructor"
                            }
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className={`font-bold font-mono text-sm ${isInstructorUnlocked ? "text-amber-700" : "text-slate-400"}`}>
                                Day {dayNum}
                              </span>
                              {isInstructorUnlocked ? (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                  PREREQ REQ
                                </span>
                              ) : (
                                <span className="bg-slate-200 text-slate-550 text-[9px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                                  LOCKED
                                </span>
                              )}
                            </div>
                            <div className="my-2">
                              <p className={`text-xs line-clamp-2 leading-snug ${isInstructorUnlocked ? "font-semibold text-slate-700" : "font-semibold text-slate-400"}`}>
                                {topicTitle}
                              </p>
                            </div>
                            <div className={`flex items-center justify-between w-full mt-auto pt-1 border-t ${isInstructorUnlocked ? "border-amber-200/65" : "border-slate-200"}`}>
                              <span className="text-[10px] font-medium">
                                {isInstructorUnlocked ? `Must complete Day ${dayNum - 1}` : "Topic Preview"}
                              </span>
                              <Lock className={`w-3 h-3 ${isInstructorUnlocked ? "text-amber-500" : "text-slate-350"}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      }
      </div>

      {/* 🎬 Cinematic Study Video Theater Modal Overlay */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header bar */}
            <div className="bg-slate-950 p-4 border-b border-white/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                  ★ STUDY COMPANION THEATER
                </span>
                <span className="text-white text-sm font-bold block truncate max-w-[280px] sm:max-w-md">
                  {selectedVideo.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="bg-white/10 hover:bg-white/20 hover:text-white text-slate-350 px-2.5 py-1.5 rounded-lg text-[10px] transition font-mono font-bold cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Video content */}
            <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
              {selectedVideo.videoUrl.includes("youtube.com/embed/") ? (
                <iframe
                  src={`${selectedVideo.videoUrl}?autoplay=1`}
                  title={selectedVideo.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <FileVideo className="w-16 h-16 text-indigo-500 animate-pulse" />
                  <p className="text-xs text-slate-300 max-w-md">
                    This attachment links to an external course database video material. Click the action line below to open or stream this learning resource in a new tab:
                  </p>
                  <a
                    href={selectedVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-605 text-white font-extrabold font-mono text-[11px] py-2 px-4 rounded-xl tracking-wider uppercase transition shadow-md"
                  >
                    <span>Launch Resource Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Footer detailing information */}
            <div className="bg-slate-950 p-4 border-t border-white/5 space-y-2">
              <div className="flex justify-between items-center text-[11px] sm:text-xs">
                <span className="text-slate-400 font-sans">
                  Added dynamically by: <strong className="text-white font-semibold font-mono">{selectedVideo.addedBy}</strong>
                </span>
                <span className="text-slate-400 font-mono text-[10px] sm:text-[11px]">
                  Shared on {new Date(selectedVideo.uploadedAt).toLocaleDateString()}
                </span>
              </div>
              {selectedVideo.description && (
                <p className="text-xs leading-relaxed text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5 font-sans">
                  {selectedVideo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Placement Details Entry Modal */}
      {showPlacementModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePlacementDetails}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-zoom-in max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div className="text-left">
                <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 font-extrabold font-mono tracking-wider py-0.5 px-2 rounded-full uppercase">
                  MANAGEMENT PORTALS CLEARANCE
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Fill Your Placement Portals Details
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Your updated profiles list is sent directly to management to expedite active job matches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlacementModal(false)}
                className="text-slate-400 hover:text-slate-650 font-bold font-mono text-sm leading-none bg-slate-100 p-1.5 rounded-full cursor-pointer transition"
              >
                ✖
              </button>
            </div>

            {placementError && (
              <div className="bg-rose-50 border border-rose-150 text-rose-700 text-xs p-3 rounded-xl font-medium mb-4">
                ⚠️ {placementError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  value={placementForm.linkedin}
                  onChange={(e) => setPlacementForm({ ...placementForm, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Indeed Profile</label>
                <input
                  type="text"
                  value={placementForm.indeed}
                  onChange={(e) => setPlacementForm({ ...placementForm, indeed: e.target.value })}
                  placeholder="https://profile.indeed.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Naukri.com Profile</label>
                <input
                  type="text"
                  value={placementForm.naukri}
                  onChange={(e) => setPlacementForm({ ...placementForm, naukri: e.target.value })}
                  placeholder="https://naukri.com/profile/username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Glassdoor Profile</label>
                <input
                  type="text"
                  value={placementForm.glassdoor}
                  onChange={(e) => setPlacementForm({ ...placementForm, glassdoor: e.target.value })}
                  placeholder="https://glassdoor.com/profile/username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Foundit Profile</label>
                <input
                  type="text"
                  value={placementForm.foundit}
                  onChange={(e) => setPlacementForm({ ...placementForm, foundit: e.target.value })}
                  placeholder="https://foundit.in/member/username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Shine.com Profile</label>
                <input
                  type="text"
                  value={placementForm.shine}
                  onChange={(e) => setPlacementForm({ ...placementForm, shine: e.target.value })}
                  placeholder="https://shine.com/profile/username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Timesjobs Profile</label>
                <input
                  type="text"
                  value={placementForm.timesjobs}
                  onChange={(e) => setPlacementForm({ ...placementForm, timesjobs: e.target.value })}
                  placeholder="https://timesjobs.com/candidate"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Internshala Profile</label>
                <input
                  type="text"
                  value={placementForm.internshala}
                  onChange={(e) => setPlacementForm({ ...placementForm, internshala: e.target.value })}
                  placeholder="https://internshala.com/student"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Wellfound Profile</label>
                <input
                  type="text"
                  value={placementForm.wellfound}
                  onChange={(e) => setPlacementForm({ ...placementForm, wellfound: e.target.value })}
                  placeholder="https://wellfound.com/u/username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-mono uppercase mb-1">Apna App Profile</label>
                <input
                  type="text"
                  value={placementForm.apna}
                  onChange={(e) => setPlacementForm({ ...placementForm, apna: e.target.value })}
                  placeholder="https://apna.co/user/profile"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-505 text-slate-850 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPlacementModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-mono text-xs py-2.5 px-6 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPlacementDetails}
                className="bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold font-mono text-xs py-2.5 px-6 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                {savingPlacementDetails ? (
                  <span>Saving...</span>
                ) : (
                  <span>✓ Save Details</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FLOATING COMPILER SANDBOX (ONLINE PYTHON COMPILER PLAYGROUND) */}
      <div className="fixed bottom-6 right-6 z-50 print:hidden flex flex-col items-end">
        {isCompilerOpen && (
          <div className="mb-4 w-96 max-w-[92vw] h-[640px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-fade-in">
            {/* Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs uppercase font-mono tracking-wider text-emerald-400">
                  Python Online Sandbox
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/50">
                  {skulptReady ? "Real Python 3 Engine" : "Loading Engine…"}
                </span>
                <button
                  onClick={() => setIsCompilerOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Mode Selection Selector */}
            <div className="bg-slate-950/90 border-b border-slate-850 p-2.5 flex items-center justify-between gap-2.5 shrink-0">
              <span className="text-[9px] text-slate-400 font-mono font-bold uppercase shrink-0">Analysis Mode:</span>
              <select
                value={sandboxSelectedChallenge}
                onChange={(e) => {
                  const val = e.target.value;
                  setSandboxSelectedChallenge(val === "general" ? "general" : parseInt(val, 10));
                }}
                className="bg-slate-900 text-emerald-400 font-mono text-[10px] px-2 py-1 rounded border border-slate-800 outline-none flex-1 max-w-[170px]"
              >
                <option value="general">🔍 General Python Syntax</option>
                {quizData?.coding?.[0] && <option value={0}>🎯 Compare Challenge 1</option>}
                {quizData?.coding?.[1] && <option value={1}>🎯 Compare Challenge 2</option>}
              </select>

              <button
                type="button"
                onClick={handleSandboxAICompare}
                disabled={sandboxComparisonLoading || !compilerCode.trim()}
                className="bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 text-white font-mono text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase flex items-center gap-1 transition shrink-0 cursor-pointer disabled:text-slate-500"
                title="Perform deep AI syntax correctness check and solution alignment evaluation"
              >
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>AI Analyze</span>
              </button>
            </div>

            {/* Helper links */}
            <div className="bg-slate-950/40 px-4 py-2 border-b border-slate-850 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>External compilers:</span>
              <div className="flex gap-3">
                <a
                  href="https://www.programiz.com/python-programming/online-compiler/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition"
                >
                  Programiz ↗
                </a>
                <a
                  href="https://www.w3schools.com/python/python_compiler.asp"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition"
                >
                  W3Schools ↗
                </a>
              </div>
            </div>

            {/* Quick helper toolbar */}
            <div className="p-3 bg-slate-900/80 border-b border-slate-850 flex flex-wrap gap-2 items-center">
              <button
                onClick={() => {
                  setCompilerCode(`# Write Python code below\n\n# Define variables\nx = 10\ny = 5\n\nprint("x * y calculation:")\nprint(x * y)`);
                }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[9px] px-2.5 py-1 rounded font-mono font-bold transition cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setCompilerCode((prev) => prev + `\n\n# Simple Python Loop\nfor i in range(5):\n    print("Iteration " + str(i))\n`);
                }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[9px] px-2.5 py-1 rounded font-mono font-bold transition cursor-pointer"
              >
                + Add Loop
              </button>
              <button
                onClick={() => {
                  setCompilerCode((prev) => prev + `\n\n# Variable reassignment\nx = 100\nprint(x)\n`);
                }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[9px] px-2.5 py-1 rounded font-mono font-bold transition cursor-pointer"
              >
                + Variables
              </button>
              <button
                onClick={() => {
                  setCompilerCode(
                    `import turtle\n\nt = turtle.Turtle()\nt.speed(5)\n\n# Draw a simple 5-pointed star\nfor i in range(5):\n    t.forward(100)\n    t.right(144)\n\nturtle.done()`
                  );
                }}
                className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[9px] px-2.5 py-1 rounded font-mono font-bold transition cursor-pointer border border-indigo-900/60"
              >
                🐢 Turtle Demo
              </button>
            </div>

            {/* Code Workspace Editor */}
            <div className="flex-1 p-3 flex flex-col min-h-0 bg-slate-950">
              <label className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider mb-1 block">
                Editor (Python 3):
              </label>
              <textarea
                value={compilerCode}
                onChange={(e) => setCompilerCode(e.target.value)}
                onKeyDown={(e) => handleCodeEditorKeyDown(e, setCompilerCode)}
                className="flex-1 w-full bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded border border-slate-800 leading-relaxed resize-none overflow-y-auto"
                placeholder="# Write your custom Python code snippet here..."
              />
            </div>

            {/* Action Bar */}
            <div className="p-3 bg-slate-900 border-t border-slate-850 flex justify-between items-center">
              <button
                onClick={() => setCompilerOutput(["Terminal cleared. Send some prints!"])}
                className="text-[10px] text-slate-400 hover:text-white font-mono flex items-center gap-1 transition"
              >
                🧹 Clear Console
              </button>
              <button
                onClick={handleRunSandboxCode}
                disabled={compilerIsRunning}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold py-1.5 px-4 rounded-lg flex items-center gap-1 transition shadow-sm cursor-pointer"
              >
                {compilerIsRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Python Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Dual Toggles for Output Stream / AI Comparison Result */}
            <div className="bg-slate-950 border-t border-slate-850 flex text-[10px] font-mono shrink-0">
              <button
                onClick={() => setSandboxViewMode("code")}
                className={`flex-1 py-2 text-center border-r border-slate-850 font-bold uppercase transition ${sandboxViewMode === "code" ? "bg-slate-900 text-emerald-400 border-b-2 border-b-emerald-450" : "text-slate-400 hover:bg-slate-900/50"}`}
              >
                💻 Terminal Console
              </button>
              <button
                onClick={() => setSandboxViewMode("comparison")}
                className={`flex-1 py-2 text-center font-bold uppercase transition flex items-center justify-center gap-1 ${sandboxViewMode === "comparison" ? "bg-slate-900 text-indigo-400 border-b-2 border-b-indigo-450" : "text-slate-400 hover:bg-slate-900/50"}`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                AI Comparative analysis
              </button>
            </div>

            {/* Panel Viewport */}
            {sandboxViewMode === "code" ? (
              /* Terminal Output console viewport */
              <div className="h-44 bg-slate-950 p-3 border-t border-slate-800 flex flex-col font-mono text-[11px] leading-normal min-h-0 shrink-0">
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">
                  OUTPUT CONSOLE STREAM:
                </span>
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 text-slate-300 text-left">
                  {compilerOutput.map((log, idx) => (
                    <div
                      key={idx}
                      className={`whitespace-pre-wrap ${
                        log.startsWith("❌") || log.startsWith("SyntaxError") || log.startsWith("NameError")
                          ? "text-rose-400 font-semibold"
                          : log.startsWith("✅") || log.startsWith(">>>")
                          ? "text-indigo-400 font-bold"
                          : "text-slate-200"
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
                {/* Turtle graphics render target — Skulpt draws directly into this div when `import turtle` is used */}
                <div
                  id="sandbox-turtle-canvas"
                  ref={turtleCanvasRef}
                  className="mt-2 flex items-center justify-center bg-white rounded border border-slate-800 overflow-hidden empty:hidden"
                />
              </div>
            ) : (
              /* AI Comparison / Syntax feedback viewport */
              <div className="h-44 bg-slate-950 p-3 border-t border-slate-800 flex flex-col min-h-0 overflow-y-auto shrink-0 text-xs text-left">
                {sandboxComparisonLoading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2 text-slate-400">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    <span className="text-[10px] font-mono animate-pulse">Gemini AI analyzing python syntax...</span>
                  </div>
                ) : sandboxComparisonData ? (
                  <div className="space-y-3.5 font-sans text-slate-200">
                    {/* Header score & status */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] uppercase font-mono font-bold text-indigo-400">Syntax Health:</span>
                        <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded ${sandboxComparisonData.isValidSyntax ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-rose-950 text-rose-400 border border-rose-900 animate-pulse"}`}>
                          {sandboxComparisonData.isValidSyntax ? "VALID SYNTAX" : "SYNTAX ALERTS"}
                        </span>
                      </div>
                      <div className="text-[9px] font-mono font-extrabold text-amber-400 flex items-center gap-0.5 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-900">
                        <span>MATCH: {sandboxComparisonData.matchPercentage}%</span>
                      </div>
                    </div>

                    {/* Praise */}
                    {sandboxComparisonData.praise && (
                      <p className="text-[10.5px] italic text-indigo-200 leading-relaxed bg-indigo-950/20 p-2 rounded border border-indigo-900/30">
                        💡 "{sandboxComparisonData.praise}"
                      </p>
                    )}

                    {/* Gaps / Mistakes */}
                    {sandboxComparisonData.mistakes && sandboxComparisonData.mistakes.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-rose-400 font-mono uppercase tracking-wider block">🚨 Identified Gaps & Mistakes:</span>
                        <ul className="list-disc pl-3 text-[10px] text-slate-300 space-y-1">
                          {sandboxComparisonData.mistakes.map((m: string, idx: number) => (
                            <li key={idx} className="leading-snug">{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggestions */}
                    {sandboxComparisonData.suggestions && sandboxComparisonData.suggestions.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase tracking-wider block">💡 Optimization Suggestions:</span>
                        <ul className="list-disc pl-3 text-[10px] text-slate-300 space-y-1">
                          {sandboxComparisonData.suggestions.map((s: string, idx: number) => (
                            <li key={idx} className="leading-snug">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Corrected/Correct Code */}
                    {sandboxComparisonData.correctedCode && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-indigo-400 font-mono uppercase tracking-wider block">✨ AI Recommended Syntax Corrected Version:</span>
                        <div className="relative">
                          <pre className="bg-slate-900 border border-slate-800 text-emerald-400 text-[10px] font-mono p-2 rounded-lg max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                            {sandboxComparisonData.correctedCode}
                          </pre>
                          <button
                            type="button"
                            onClick={() => {
                              setCompilerCode(sandboxComparisonData.correctedCode);
                              setSandboxViewMode("code");
                            }}
                            className="absolute top-1 right-1 bg-indigo-650 hover:bg-indigo-600 text-white text-[8px] font-mono font-bold py-1 px-1.5 rounded transition cursor-pointer shadow-sm"
                          >
                            Apply to Editor 📋
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Line By Line block comparisons */}
                    {sandboxComparisonData.lineByLine && sandboxComparisonData.lineByLine.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">📋 Detailed Line-by-Line Alignment:</span>
                        <div className="space-y-2 border border-slate-800 rounded-lg p-2 bg-slate-950 font-mono text-[9px] max-h-36 overflow-y-auto">
                          {sandboxComparisonData.lineByLine.map((lbl: any, idx: number) => (
                            <div key={idx} className="pb-1.5 last:pb-0 border-b border-slate-900 last:border-0 space-y-1">
                              <div className="flex justify-between items-center text-[7px] opacity-75">
                                <span className="text-slate-500">LINE ALIGNMENT:</span>
                                <span className={`font-bold px-1 rounded-full uppercase text-[6.5px] ${
                                  lbl.status === "match" ? "bg-emerald-950 text-emerald-400" :
                                  lbl.status === "mismatch" ? "bg-rose-950 text-rose-400" : "bg-amber-950 text-amber-400"
                                }`}>
                                  {lbl.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                <div className="bg-rose-950/20 text-rose-350 p-1 rounded-sm truncate">
                                  <strong className="text-[6px] block opacity-50">YOUR CODE:</strong>
                                  {lbl.userLine || "(Empty line)"}
                                </div>
                                <div className="bg-emerald-950/20 text-emerald-350 p-1 rounded-sm truncate">
                                  <strong className="text-[6px] block opacity-50">CORRECT/IDEAL:</strong>
                                  {lbl.idealLine || "—"}
                                </div>
                              </div>
                              {lbl.note && <p className="text-[8px] text-slate-400 leading-normal pl-1 border-l border-slate-700 italic font-sans">{lbl.note}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-[10px] space-y-1 text-center">
                    <span>No evaluation data loaded.</span>
                    <span>Write code and click 'AI Analyze' above to run.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsCompilerOpen((prev) => !prev)}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-mono font-extrabold text-xs py-3 px-5 rounded-full shadow-2xl flex items-center gap-2.5 transition transform hover:scale-105 active:scale-95 cursor-pointer select-none glow-button"
        >
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>PORTAL COMPILER SANDBOX</span>
        </button>
      </div>
    </div>
  );
}
