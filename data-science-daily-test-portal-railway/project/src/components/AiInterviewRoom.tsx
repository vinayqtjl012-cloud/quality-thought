import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  MessageSquare,
  Award,
  ChevronRight,
  TrendingUp,
  Brain,
  History,
  HelpCircle,
  Play,
  RotateCcw,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Lightbulb,
  CornerDownRight,
  ShieldCheck,
  UserCheck,
  Upload,
  FileCode,
  Clock,
  Video,
  Mic,
  Fingerprint,
  Check,
  Lock,
  Unlock,
  Wifi,
  User,
  Volume2,
  Activity,
  Code2,
  LogOut
} from "lucide-react";
import { Student, AIInterview, SYLLABUS, CourseSyllabus, InterviewMessage, Submission } from "../types.js";
import robotAvatar from "../assets/images/ai_interviewer_robot_1782753787810.jpg";

interface AiInterviewRoomProps {
  student: Student;
  submissions?: Submission[];
  assessments?: any[];
  overrides?: any[];
  onRefreshContext?: () => void;
  specialPermissionBypass?: boolean;
}

export default function AiInterviewRoom({
  student,
  submissions = [],
  assessments = [],
  overrides = [],
  onRefreshContext,
  specialPermissionBypass = false
}: AiInterviewRoomProps) {
  const [pastInterviews, setPastInterviews] = useState<AIInterview[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  // Selector Form states
  const [selectedSubject, setSelectedSubject] = useState<string>("python");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Junior");
  const [interviewType, setInterviewType] = useState<"weekly" | "monthly">("weekly");
  const [roundType, setRoundType] = useState<"technical" | "hr" | "combined">("technical");
  const [pastInterviewFilter, setPastInterviewFilter] = useState<"all" | "weekly" | "monthly">("all");

  // Operational Hour restriction states (7:00 AM - 10:00 PM)
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bypassTiming, setBypassTiming] = useState(false);

  // Python completion checking (unlocks Premium Visual Interview)
  const hasCompletedPython = submissions.some(sub => sub.courseSlug === "python");
  const [isVisualRoom, setIsVisualRoom] = useState(true);
  const [forceUnlockVisual, setForceUnlockVisual] = useState(false); // Demo master bypass

  // Visual Room Interactive Animation triggers
  const webcamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const voiceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [proctorLogs, setProctorLogs] = useState<string[]>([]);

  // Custom material and subject override states
  const [useCustomMaterial, setUseCustomMaterial] = useState<boolean>(false);
  const [isResumeMode, setIsResumeMode] = useState<boolean>(false);
  const [customInterviewMaterial, setCustomInterviewMaterial] = useState<string>("");
  const [customSubjectName, setCustomSubjectName] = useState<string>("Excel & CSV Data Diagnostics");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [materialError, setMaterialError] = useState<string>("");

  // Running session state
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [currentSession, setCurrentSession] = useState<InterviewMessage[]>([]);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sessionFinished, setSessionFinished] = useState(false);
  const [interviewTimeLeft, setInterviewTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(6 * 60); // 6 minutes per question in seconds

  // Evaluation trigger states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeReport, setActiveReport] = useState<AIInterview | null>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Real-time student camera and video recording hooks
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean>(false);
  const [recordedVideoBase64, setRecordedVideoBase64] = useState<string>("");
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Voice/Audio Recognition and Pacing Diagnostics
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  // True whenever WE deliberately stopped listening (submit/exit/toggle-off).
  // Lets us tell that apart from the browser's own silent auto-stop, which we want to
  // recover from automatically so a thinking pause doesn't cut the student's mic off.
  const manualStopRef = useRef<boolean>(false);
  // Accumulates finalized speech across automatic engine restarts, since each restarted
  // SpeechRecognition instance resets its own internal `results` array to empty.
  const finalTranscriptRef = useRef<string>("");

  const handleExitInterview = (confirmFirst: boolean = true) => {
    if (confirmFirst) {
      setShowExitConfirmModal(true);
      return;
    }

    // Shut down camera/audio stream tracks completely
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error("Error stopping camera tracks on interview exit:", e);
      }
      setCameraStream(null);
    }

    // Stop active MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    // Stop speech recognition
    manualStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Cancel Indian English Text-to-Speech active queue
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    setIsInterviewing(false);
    setCurrentSession([]);
    setSessionFinished(false);
    setIsRecordingVoice(false);
  };

  // Builds a fresh SpeechRecognition instance wired up for clear, continuous capture:
  // - final chunks are accumulated across the whole answer (not lost on engine restarts)
  // - interim (in-progress) words are shown live so the student sees they're being heard
  // - transient hiccups (silence gaps, engine auto-stop) restart listening instead of
  //   dropping the recording, so a thinking pause doesn't truncate the answer
  const createRecognitionInstance = (SpeechRecognitionCtor: any) => {
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1; // Prioritize the single best-matching speech hypothesis
    rec.lang = "en-IN"; // Indian English acoustic/language model for accurate local accent recognition

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const needsSpace = finalTranscriptRef.current && !finalTranscriptRef.current.endsWith(" ");
          finalTranscriptRef.current += (needsSpace ? " " : "") + chunk.trim();
        } else {
          interim += chunk;
        }
      }
      const combined = `${finalTranscriptRef.current} ${interim}`.trim();
      if (combined) {
        setInputText(combined);
      }
    };

    rec.onerror = (err: any) => {
      const errorName = err?.error;
      // These are transient/expected during a natural pause in speech — the engine will
      // fire `onend` right after, which restarts listening automatically below.
      if (errorName === "no-speech" || errorName === "aborted") {
        console.log("Speech recognition notice (auto-recovering):", errorName);
        return;
      }

      console.warn("Speech recognition notice:", errorName || err);
      manualStopRef.current = true;
      setIsRecordingVoice(false);

      if (errorName === "not-allowed") {
        alert("Microphone permission was denied. Please check your browser's microphone settings.");
      } else if (errorName === "audio-capture") {
        alert("No microphone detected. Please plug in or connect an audio input device.");
      }
    };

    rec.onend = () => {
      // Browsers (esp. Chrome) silently end recognition after a short silence even with
      // continuous=true. If the student hasn't deliberately stopped, resume listening
      // right away so their voice keeps being captured clearly across natural pauses.
      if (!manualStopRef.current) {
        try {
          rec.start();
          return;
        } catch (e) {
          // The engine can briefly refuse an immediate restart; retry shortly after.
          setTimeout(() => {
            if (!manualStopRef.current) {
              try {
                rec.start();
              } catch (e2) {
                setIsRecordingVoice(false);
              }
            }
          }, 250);
          return;
        }
      }
      setIsRecordingVoice(false);
    };

    return rec;
  };

  const toggleVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }

    if (isRecordingVoice) {
      manualStopRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsRecordingVoice(false);
    } else {
      manualStopRef.current = false;
      // Preserve any text already present (typed or captured earlier) instead of wiping it
      finalTranscriptRef.current = inputText.trim();
      setIsRecordingVoice(true);
      const rec = createRecognitionInstance(SpeechRecognition);
      recognitionRef.current = rec;
      rec.start();
    }
  };

  // Automatically shut off camera stream if component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Ensure speech recognition is fully torn down (and won't auto-restart) if this
  // component unmounts mid-recording, e.g. the student navigates away.
  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Bind cameraStream to HTML5 video element source
  useEffect(() => {
    if (videoElementRef.current) {
      if (cameraStream) {
        videoElementRef.current.srcObject = cameraStream;
        videoElementRef.current.play().catch(err => {
          console.error("Failed to autoplay videoElementRef srcObject:", err);
        });
      } else {
        videoElementRef.current.srcObject = null;
      }
    }
  }, [cameraStream]);

  // 1. Live Operating Hours Clock Timer
  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // 1b. 30 Minutes Interview Session Countdown Timer
  const handleEvaluateSessionRef = useRef<any>(null);
  useEffect(() => {
    handleEvaluateSessionRef.current = handleEvaluateSession;
  });

  useEffect(() => {
    if (!isInterviewing || sessionFinished) return;
    
    const interval = setInterval(() => {
      setInterviewTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSessionFinished(true);
          if (handleEvaluateSessionRef.current) {
            handleEvaluateSessionRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInterviewing, sessionFinished]);

  // 1c. 6 Minutes Question-specific Countdown Timer
  useEffect(() => {
    if (!isInterviewing || sessionFinished || isLoadingMessage) return;

    const interval = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          // Time limit exceeded: auto-submit current response (or empty placeholder text)
          const currentInput = inputText.trim();
          const autoText = currentInput || "[System Auto-Submit: Student response time limit of 6 minutes exceeded for this question]";
          handleSendMessage(autoText);
          return 6 * 60; // Reset for the next question
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInterviewing, sessionFinished, isLoadingMessage, inputText]);

  // Reset question timer when the AI finishes loading/presenting the next question
  useEffect(() => {
    if (isInterviewing && !isLoadingMessage) {
      setQuestionTimeLeft(6 * 60);
    }
  }, [isLoadingMessage, isInterviewing]);

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 2. Beautiful Computer Vision Webcam Frame & Sound Amplitude Wave loops
  useEffect(() => {
    if (!isInterviewing || !isVisualRoom) return;

    let animIdWebcam: number;
    let animIdVoice: number;
    let frame = 0;

    // Initialize proctor logs with timestamps
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] Establishing encrypted student workspace link...`,
      `[${new Date().toLocaleTimeString()}] Biometric proctor secure calibration online.`,
      `[${new Date().toLocaleTimeString()}] Video feed frame buffer scanning activated.`
    ];
    setProctorLogs(initialLogs);

    // Audio Amplitude Sinusoid Generator
    const drawVoice = () => {
      const canvas = voiceCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      frame++;

      // Subtle network grid lines
      ctx.strokeStyle = "rgba(79, 70, 229, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }

      // Live layered bezier math waves
      ctx.lineWidth = 2;
      const numWaves = 3;
      const colors = ["rgba(79, 70, 229, 0.8)", "rgba(168, 85, 247, 0.5)", "rgba(99, 102, 241, 0.3)"];
      
      for (let wIdx = 0; wIdx < numWaves; wIdx++) {
        ctx.beginPath();
        ctx.strokeStyle = colors[wIdx];
        
        let freq = 0.015 + (wIdx * 0.005);
        let amp = 15 + (wIdx * 10);
        let speed = 0.04 + (wIdx * 0.02);

        // Increase wave peak size if AI model is preparing or user is actively typing
        if (isLoadingMessage || inputText.length > 0) {
          amp *= 1.8;
          freq *= 1.2;
        }

        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * freq + frame * speed) * amp;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animIdVoice = requestAnimationFrame(drawVoice);
    };

    // Vector Graphics Face Simulation
    const drawWebcam = () => {
      const canvas = webcamCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Draw real student webcam feed if available, otherwise draw synthetic dashboard space
      if (videoElementRef.current && videoElementRef.current.readyState >= 2) {
        ctx.save();
        // Mirror the camera feed for natural viewing
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElementRef.current, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.fillStyle = "#0c111d";
        ctx.fillRect(0, 0, w, h);
      }

      // Moving scanning horizontal beam
      const laserY = (frame * 1.5) % h;
      ctx.strokeStyle = "rgba(99, 102, 241, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, laserY);
      ctx.lineTo(w, laserY);
      ctx.stroke();

      // Matrix network points
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Outer tech bracket corners
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 3;
      const spacingValue = 24;
      // Top-Left corner
      ctx.beginPath(); ctx.moveTo(spacingValue, spacingValue + 16); ctx.lineTo(spacingValue, spacingValue); ctx.lineTo(spacingValue + 16, spacingValue); ctx.stroke();
      // Top-Right corner
      ctx.beginPath(); ctx.moveTo(w - spacingValue - 16, spacingValue); ctx.lineTo(w - spacingValue, spacingValue); ctx.lineTo(w - spacingValue, spacingValue + 16); ctx.stroke();
      // Bottom-Left corner
      ctx.beginPath(); ctx.moveTo(spacingValue, h - spacingValue - 16); ctx.lineTo(spacingValue, h - spacingValue); ctx.lineTo(spacingValue + 16, h - spacingValue); ctx.stroke();
      // Bottom-Right corner
      ctx.beginPath(); ctx.moveTo(w - spacingValue - 16, h - spacingValue); ctx.lineTo(w - spacingValue, h - spacingValue); ctx.lineTo(w - spacingValue, h - spacingValue - 16); ctx.stroke();

      const centerX = w / 2;
      const centerY = h / 2 - 8;
      const radiusX = 54;
      const radiusY = 72;

      // Draw green human profile scanner bounding loop
      ctx.strokeStyle = "rgba(34, 197, 94, 0.6)"; 
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Draw horizontal dynamic scan laser line inside human oval
      const scanArcY = centerY + Math.sin(frame * 0.04) * radiusY;
      ctx.strokeStyle = "rgba(34, 197, 94, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const ellipseWidthSpan = radiusX * Math.sqrt(Math.max(0, 1 - Math.pow((scanArcY - centerY) / radiusY, 2)));
      ctx.moveTo(centerX - ellipseWidthSpan, scanArcY);
      ctx.lineTo(centerX + ellipseWidthSpan, scanArcY);
      ctx.stroke();

      // Bypassed text panel
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      ctx.fillRect(centerX - radiusX - 8, centerY - radiusY - 14, (radiusX + 8) * 2, 10);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`CANDIDATE SCAN: ONLINE [LOCK 99.4%]`, centerX - radiusX + 2, centerY - radiusY - 6);

      // Eye node indicators (Blinking loop)
      const blinkTrig = (frame % 160) < 6;
      if (!blinkTrig) {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath(); ctx.arc(centerX - 18, centerY - 14, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(centerX + 18, centerY - 14, 3, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(centerX - 18, centerY - 14, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(centerX + 18, centerY - 14, 7, 0, Math.PI * 2); ctx.stroke();
      }

      // Mouth indicator
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY + 26, 10, 0, Math.PI, false);
      ctx.stroke();

      // Info footers
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`DEVICE: CAM_01`, 12, h - 12);
      ctx.fillText(`FEED: 60 FPS`, w - 80, h - 12);

      animIdWebcam = requestAnimationFrame(drawWebcam);
    };

    drawVoice();
    drawWebcam();

    // Trigger intermittent micro-security logs
    const loggingTrigger = setInterval(() => {
      const securMessages = [
        "Eye gaze alignment matched center layout bounds.",
        "Acoustic feedback stabilized: clear of auxiliary audio signals.",
        "Candidate head position matched baseline scan successfully.",
        "Proctor safety key validated (status 200).",
        "No anomalous secondary device frequencies matching frame rate."
      ];
      const randomMsg = securMessages[Math.floor(Math.random() * securMessages.length)];
      setProctorLogs(p => [
        `[${new Date().toLocaleTimeString()}] ${randomMsg}`,
        ...p.slice(0, 10)
      ]);
    }, 5000);

    return () => {
      cancelAnimationFrame(animIdWebcam);
      cancelAnimationFrame(animIdVoice);
      clearInterval(loggingTrigger);
    };
  }, [isInterviewing, isVisualRoom, isLoadingMessage]);

  useEffect(() => {
    fetchPastSessions();
  }, [student.id]);

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any active speech first
    window.speechSynthesis.cancel();
    
    // Strip markdown tags and numbers/bullet lists so the speak output sounds completely human
    const cleanText = text
      .replace(/[\*\#\_\`\-\d+\.]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a high-quality Indian English voice
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(v => 
      v.lang.toLowerCase() === "en-in" || 
      v.lang.toLowerCase().includes("en_in") ||
      v.name.toLowerCase().includes("india") ||
      v.name.toLowerCase().includes("indian")
    );

    if (indianVoice) {
      utterance.voice = indianVoice;
    } else {
      utterance.lang = "en-IN";
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.02;

    window.speechSynthesis.speak(utterance);
  };

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentSession, isLoadingMessage]);

  const fetchPastSessions = async () => {
    setLoadingPast(true);
    try {
      const res = await fetch(`/api/interviews/student/${student.id}`);
      if (res.ok) {
        const data = await res.json();
        setPastInterviews(data);
      }
    } catch (err) {
      console.error("Failed to load past interview sessions:", err);
    } finally {
      setLoadingPast(false);
    }
  };

  // Dynamic Score & Eligibility computations for selectedSubject (lock custom/resume interviews to the Python gate)
  const runningSubjectSlug = (isResumeMode || useCustomMaterial) ? "python" : selectedSubject;
  const matchingAssessment = assessments.find(asm => asm.courseSlug === runningSubjectSlug);
  const scoreVal = matchingAssessment ? matchingAssessment.score : null;
  const matchingOverride = overrides.find(o => o.courseSlug === runningSubjectSlug) || overrides.find(o => o.courseSlug === selectedSubject);
  const currentSubjectAttempts = pastInterviews.filter(item => {
    const s = item.subject.toLowerCase();
    if (isResumeMode) {
      return s.includes("resume") || s.includes("personalized");
    }
    if (useCustomMaterial) {
      return s === customSubjectName.toLowerCase();
    }
    return s === selectedSubject.toLowerCase();
  }).length;
  const maxAttemptsExhausted = currentSubjectAttempts >= 3 && !student?.interviewRewritePermission;
  const isEligible = (scoreVal !== null && scoreVal >= 60) || matchingOverride?.eligibilityBypass === true || specialPermissionBypass === true;

  const handleStartInterview = async () => {
    // Enforce 60% eligibility check
    if (!isEligible) {
      const subjectLabel = (isResumeMode || useCustomMaterial) ? "PYTHON" : selectedSubject.toUpperCase();
      setMaterialError(`Blocked: You must score at least 60% on the Comprehensive Assessment for ${subjectLabel} first before unlocking the placement interview (or request an eligibility bypass from instructor Vinay).`);
      return;
    }

    // Enforce 3 chances limits
    if (maxAttemptsExhausted) {
      setMaterialError(`Blocked: You have already exhausted all 3 interview chances for this topic. Please contact instructor Vinay to reset your attempts.`);
      return;
    }

    const currentHour = currentTime.getHours();
    const isWithinHours = currentHour >= 7 && currentHour < 24;
    if (!isWithinHours && !bypassTiming) {
      setMaterialError("Blocked: Mock Recruiter Rooms are only accessible between 07:00 AM and 12:00 AM to match live evaluation availability. Click 'Bypass Hours' below to override.");
      return;
    }

    if (isResumeMode && !customInterviewMaterial.trim()) {
      setMaterialError("Please paste your resume text or upload your resume file first before entering the room.");
      return;
    }

    if (useCustomMaterial && !customInterviewMaterial.trim()) {
      setMaterialError("Please paste some course material or pick a file first before entering the room.");
      return;
    }
    setMaterialError("");

    // Try to acquire actual student webcam and microphone stream for AI Interview proctor recording
    let activeStream: MediaStream | null = null;
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 }
        }
      });
      setCameraStream(activeStream);
      setCameraPermissionGranted(true);
      
      // Reset video recording chunks buffer
      chunksRef.current = [];
      
      let recorder: MediaRecorder;
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      try {
        recorder = new MediaRecorder(activeStream, options);
      } catch (e) {
        recorder = new MediaRecorder(activeStream);
      }
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start(1000); // chunk slices every 1000ms
    } catch (cameraErr) {
      console.warn("Real-time candidate camera or microphone permission denied:", cameraErr);
      setCameraPermissionGranted(false);
    }

    setIsInterviewing(true);
    setIsLoadingMessage(true);
    setSessionFinished(false);
    setInterviewTimeLeft(30 * 60); // 30 minutes countdown timer
    setCurrentSession([]);
    setActiveReport(null);

    const activeSubject = isResumeMode
      ? "Resume-Based Placement"
      : (useCustomMaterial ? customSubjectName : selectedSubject);
    const activeMaterial = (isResumeMode || useCustomMaterial) ? customInterviewMaterial : "";

    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeSubject,
          difficulty: selectedDifficulty,
          messages: [],
          customMaterial: activeMaterial,
          isResume: isResumeMode,
          roundType
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentSession([data]); // First prompt from AI
        speakText(data.content);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to establish interview session.");
        setIsInterviewing(false);
      }
    } catch (e) {
      alert("API connection failed. Please ensure the dev backend is running.");
      setIsInterviewing(false);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const handleSendMessage = async (textOverride?: string | any) => {
    let textToSubmit = inputText;
    if (textOverride && typeof textOverride === "string") {
      textToSubmit = textOverride;
    }
    if (!textToSubmit || !textToSubmit.trim() || isLoadingMessage) return;
    const userText = textToSubmit.trim();
    setInputText("");

    // Shut down speech recognition and reset voice recording state
    manualStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecordingVoice(false);

    // Append user message local representation
    const updated = [...currentSession, { role: "user" as const, content: userText }];
    setCurrentSession(updated);
    setIsLoadingMessage(true);

    const activeSubject = isResumeMode
      ? "Resume-Based Placement"
      : (useCustomMaterial ? customSubjectName : selectedSubject);
    const activeMaterial = (isResumeMode || useCustomMaterial) ? customInterviewMaterial : "";

    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeSubject,
          difficulty: selectedDifficulty,
          messages: updated,
          customMaterial: activeMaterial,
          isResume: isResumeMode,
          roundType
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isUnrelated) {
          speakText(data.content);
          alert(`⚠️ Off-Topic Answer:\n\n${data.content}`);
          // Revert currentSession to remove the last user message so it does not count as a turn
          setCurrentSession(prev => prev.slice(0, -1));
        } else {
          setCurrentSession(prev => [...prev, data]);
          speakText(data.content);
          if (data.isComplete) {
            setSessionFinished(true);
          }
        }
      } else {
        alert("Failed to process conversation with AI recruiter.");
      }
    } catch (e) {
      alert("Network transmission error occurred.");
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const handleEvaluateSession = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);

    const activeSubject = isResumeMode
      ? "Resume-Based Placement"
      : (useCustomMaterial ? customSubjectName : selectedSubject);
    const activeMaterial = (isResumeMode || useCustomMaterial) ? customInterviewMaterial : "";

    try {
      // Stop webcam and extract proctor video recording binary as base64 string
      let videoBase64Data = "";
      const recorder = mediaRecorderRef.current;
      const stream = cameraStream;
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }

      if (recorder && recorder.state !== "inactive") {
        try {
          videoBase64Data = await new Promise<string>((resolve) => {
            recorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: 'video/webm' });
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  resolve(reader.result);
                } else {
                  resolve("");
                }
              };
              reader.readAsDataURL(blob);
            };
            recorder.stop();
          });
        } catch (recorderErr) {
          console.error("Failed to compile video recorder chunks:", recorderErr);
        }
      }

      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          batch: student.batch,
          subject: activeSubject,
          difficulty: selectedDifficulty,
          messages: currentSession,
          customMaterial: activeMaterial,
          isResume: isResumeMode,
          interviewType,
          roundType,
          videoBase64: videoBase64Data || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveReport(data.interview);
        setIsInterviewing(false);
        fetchPastSessions(); // Reload list
        onRefreshContext?.(); // Sync parent context
      } else {
        alert("Failed to synthesize the evaluation scorecard.");
      }
    } catch (e) {
      alert("Error occurred on final evaluation trigger.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper to resolve stylized syllabus icons
  const getSubjectName = (slug: string) => {
    const course = SYLLABUS.find(s => s.slug === slug);
    return course ? course.name : slug.toUpperCase();
  };

  // Safe manual markdown parser
  function renderMarkdown(text: string) {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={idx} className="text-xs font-extrabold text-indigo-900 mt-4 mb-1.5 uppercase font-mono tracking-wide">
            {trimmed.replace(/^###\s*/, "")}
          </h4>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={idx} className="text-sm font-black text-slate-900 mt-5 mb-2 border-b border-indigo-100 pb-1 uppercase font-display tracking-tight">
            {trimmed.replace(/^##\s*/, "")}
          </h3>
        );
      }
      if (trimmed.startsWith("#")) {
        return (
          <h2 key={idx} className="text-base font-black text-indigo-700 mt-6 mb-3 border-b-2 border-indigo-200 pb-1 font-display">
            {trimmed.replace(/^#\s*/, "")}
          </h2>
        );
      }
      if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
        return (
          <li key={idx} className="text-xs text-slate-650 ml-4 list-disc list-outside leading-relaxed mb-1 font-sans">
            {trimmed.replace(/^(\*|-)\s*/, "")}
          </li>
        );
      }
      if (/^\d+\./.test(trimmed)) {
        return (
          <li key={idx} className="text-xs text-slate-650 ml-4 list-decimal list-outside leading-relaxed mb-1 font-sans">
            {trimmed.replace(/^\d+\.\s*/, "")}
          </li>
        );
      }
      if (trimmed === "") {
        return <div key={idx} className="h-2"></div>;
      }
      return (
        <p key={idx} className="text-xs text-slate-600 leading-relaxed font-sans mb-1.5">
          {trimmed}
        </p>
      );
    });
  }

  const computeSpeechStats = (text: string) => {
    if (!text) return { words: 0, fillers: 0, clarity: 100, rating: "Excellent", detectedFillers: [] as string[] };
    const wordsArray = text.toLowerCase().split(/\s+/).filter(Boolean);
    const wordsCount = wordsArray.length;
    const fillers = ["um", "like", "so", "basically", "actually", "you know", "uh", "err"];
    const detected: string[] = [];
    let fillerCount = 0;
    wordsArray.forEach(w => {
      if (fillers.includes(w)) {
        fillerCount++;
        if (!detected.includes(w)) {
          detected.push(w);
        }
      }
    });
    
    let clarityScore = 100;
    if (wordsCount > 0) {
      clarityScore = Math.round(Math.max(40, 100 - (fillerCount / wordsCount) * 150));
    }
    
    let rating = "Fluent Cadence";
    if (clarityScore < 85) rating = "Good Clarity";
    if (clarityScore < 70) rating = "Needs Practice";
    
    return {
      words: wordsCount,
      fillers: fillerCount,
      clarity: clarityScore,
      rating,
      detectedFillers: detected
    };
  };

  // 3. Render active recruiter interview chat container with customizable proctored mode adjustments
  const renderActiveChat = (isFullWidthVisual: boolean) => {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col ${isFullWidthVisual ? "h-[540px]" : "h-[520px]"}`}>
        {/* Active Room Title Header */}
        <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isFullWidthVisual ? "bg-indigo-500 text-white animate-pulse" : "bg-indigo-505/20 text-indigo-400"}`}>
              {isFullWidthVisual ? "REC" : "AI"}
            </div>
            <div>
              <h3 className="text-xs font-extrabold font-display uppercase tracking-wide leading-none flex items-center gap-1.5">
                Technical Board Examiner {isFullWidthVisual && <span className="text-[10px] bg-red-600/80 px-1.5 py-0.5 rounded text-white font-mono animate-pulse">● PROCTOR ACTIVE</span>}
              </h3>
              <p className="text-[10px] text-indigo-300 mt-1 font-semibold">
                Subject: <span className="text-white">{getSubjectName(selectedSubject)}</span> &bull; {selectedDifficulty}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 30-min countdown timer badge */}
            <span className={`text-[10.5px] px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1 border ${
              interviewTimeLeft < 5 * 60
                ? "bg-rose-950/80 border-rose-800 text-rose-200 animate-pulse"
                : "bg-slate-800 border-slate-700 text-amber-400"
            }`}>
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>{formatTimeLeft(interviewTimeLeft)}</span>
            </span>

            {/* Progress bar counter */}
            <span className="text-[10px] bg-slate-800 border border-slate-700 px-2.5 py-1 text-slate-300 rounded-full font-mono font-bold">
              Answers: {userResponsesCount} / 5
            </span>

            <button
              onClick={() => handleExitInterview(true)}
              className="bg-rose-700 hover:bg-rose-600 border border-rose-800 text-white px-2.5 py-1 rounded-lg text-[9.5px] font-bold uppercase tracking-wider font-mono flex items-center gap-1 transition shadow-xs cursor-pointer"
              title="Exit Interview Room"
            >
              <LogOut className="w-3 h-3" />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* INTERACTIVE AI ROBOT HUMAN-LIKE ASSISTANT AVATAR */}
        <div className="bg-slate-900 text-white p-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 bg-slate-950 rounded-xl border border-indigo-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <div className={`absolute inset-0 bg-indigo-500/10 transition-opacity ${isLoadingMessage ? 'animate-pulse' : ''}`} />
              <img 
                src={robotAvatar} 
                alt="RM-8 Humanoid Examiner" 
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover relative z-10 transition-transform duration-500 ${
                  isLoadingMessage ? "scale-105 contrast-110" : isRecordingVoice ? "scale-110 brightness-110" : ""
                }`} 
              />
              <span className={`absolute top-1 right-1 z-20 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                isLoadingMessage ? 'bg-amber-400 animate-pulse' : isRecordingVoice ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black tracking-widest text-slate-100 uppercase font-mono">
                  RM-8 Humanoid Examiner
                </span>
                <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                  isLoadingMessage 
                    ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" 
                    : isRecordingVoice 
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse" 
                    : "bg-emerald-400/10 text-emerald-400 border border-emerald-400/25"
                }`}>
                  {isLoadingMessage ? "💭 Thinking" : isRecordingVoice ? "🎤 Listening" : "🟢 Standby"}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 leading-snug font-medium mt-0.5">
                {isLoadingMessage 
                  ? "Analyzing linguistic depth & logic rules..." 
                  : isRecordingVoice 
                  ? "Transcribing your vocal response in real-time..." 
                  : "Ready. Click the microphone below or start typing to answer."}
              </p>
            </div>
          </div>
          {(isRecordingVoice || isLoadingMessage) && (
            <div className="flex gap-0.5 items-center justify-center h-6 px-3">
              {[1, 2, 3, 4, 5, 6].map((bar) => {
                const delays = ["0.1s", "0.4s", "0.2s", "0.5s", "0.3s", "0.6s"];
                return (
                  <span 
                    key={bar} 
                    style={{ animationDelay: delays[bar - 1], animationDuration: isRecordingVoice ? "0.6s" : "1.2s" }}
                    className={`w-1 rounded-full animate-bounce ${isRecordingVoice ? 'bg-rose-500 h-5' : 'bg-indigo-400 h-3'}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Messages Frame */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {/* Question Limit & Session Recording Status Panel */}
          <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <div className="text-left">
                <p className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                  🔴 Recording Student Data & Input
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Identity: <span className="font-bold text-slate-200">{student?.name}</span> &bull; Roll: <span className="font-bold text-slate-200 font-mono">{student?.rollNumber}</span> &bull; Batch: <span className="font-bold text-slate-200 font-mono">{student?.batch}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/65">
              <span className="text-[10px] text-amber-400 font-mono font-black uppercase tracking-wide shrink-0">
                Question Time limit:
              </span>
              <div className={`px-2.5 py-1 rounded font-mono font-bold text-xs flex items-center gap-1 ${
                questionTimeLeft < 60
                  ? "bg-rose-950/85 text-rose-200 animate-pulse"
                  : "text-white"
              }`}>
                <Clock className="w-3.5 h-3.5 text-amber-405 animate-spin" />
                <span>{formatTimeLeft(questionTimeLeft)}</span>
              </div>
            </div>
          </div>
          <div className="bg-indigo-50/75 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900 leading-relaxed max-w-2xl">
            <p className="font-bold flex items-center gap-1.5 mb-1 text-indigo-950 font-sans">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              {isFullWidthVisual ? "Interactive Placement Proctoring Mode Active:" : "Board Interview Session Guidelines:"}
            </p>
            <ul className="list-disc pl-4 space-y-0.5 mt-1 font-sans text-[11px] text-indigo-850">
              <li>Type descriptive structural answers to show your concept depth.</li>
              {isFullWidthVisual ? (
                <li className="text-indigo-950 font-extrabold">Warning: Biometric monitoring is connected. Keep focus on this workspace.</li>
              ) : (
                <li>If asked for a coding snippet, write clear Python/Pandas syntaxes.</li>
              )}
              <li>Gemini counts 5 prompt segments, then unlocks the detailed report.</li>
            </ul>
          </div>

          {currentSession.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-[85%] ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Character Avatar */}
              <div
                className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                  msg.role === "user"
                    ? "bg-slate-200 text-slate-850"
                    : "bg-indigo-600 text-white"
                }`}
              >
                {msg.role === "user" ? student.name[0] : "AI"}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans relative group ${
                  msg.role === "user"
                    ? "bg-slate-800 text-white rounded-tr-none"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm"
                }`}
              >
                <p className="whitespace-pre-line font-sans">{msg.content}</p>
                {msg.role !== "user" && (
                  <button
                    onClick={() => speakText(msg.content)}
                    className="absolute -right-7 top-1/2 -translate-y-1/2 p-1 bg-white hover:bg-indigo-50 rounded-md border border-indigo-150 shadow-xs text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Speak question out loud (Indian English)"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoadingMessage && (
            <div className="flex gap-3 max-w-[80%] mr-auto animate-pulse">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white shrink-0 flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <div className="p-3 bg-white border border-slate-150 rounded-2xl rounded-tl-none shadow-xs text-xs text-slate-400 italic">
                AI Technical Examiner is evaluating your response and formulating the next task...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input / Action layout */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          {sessionFinished ? (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold text-amber-900 font-sans uppercase">
                    Five-Question Interview Session Concluded!
                  </h4>
                  <p className="text-[10px] text-amber-800 leading-tight">
                    Gemini has logged all transcript steps. Synthesize your final academic grade card now.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleExitInterview(true)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Room</span>
                </button>

                <button
                  onClick={handleEvaluateSession}
                  disabled={isEvaluating}
                  className="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-bold text-xs px-5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isEvaluating ? (
                    <>Analyzing Transcript...</>
                  ) : (
                    <>
                      <Award className="w-4 h-4 fill-white text-amber-600" />
                      Complete & Retrieve Report
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {isRecordingVoice && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 animate-fade-in shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <p className="text-[11px] text-emerald-800 font-extrabold font-sans">
                      Microphone is active! Recording your spoken response now...
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      manualStopRef.current = true;
                      if (recognitionRef.current) {
                        try {
                          recognitionRef.current.stop();
                        } catch (e) {}
                      }
                      setIsRecordingVoice(false);
                      const txt = inputText.trim();
                      if (txt) {
                        handleSendMessage(txt);
                      } else {
                        alert("No spoken transcript captured yet. Please speak clearly or enter an answer text before submitting.");
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[10px] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-emerald-500 uppercase tracking-wider shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Submit Answer Early
                  </button>
                </div>
              )}

              {inputText.trim() && (
                <div className="bg-indigo-50/75 border border-indigo-100/60 rounded-xl p-3 mb-2 space-y-2 text-xs text-indigo-950 animate-fade-in transition-all">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-indigo-700">
                    <span className="flex items-center gap-1.5 uppercase">
                      <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                      Live Voice & Transcript Analysis
                    </span>
                    <span className="bg-indigo-100 px-2 py-0.5 rounded text-[9px]">
                      Clarity Indicator: {(() => {
                        const stats = computeSpeechStats(inputText);
                        return stats.clarity;
                      })()}%
                    </span>
                  </div>
                  
                  {/* Micro stats grid */}
                  <div className="grid grid-cols-3 gap-2.5 text-[10px]">
                    <div className="bg-white/80 rounded-lg p-1.5 border border-indigo-50/50">
                      <div className="text-slate-400 uppercase font-mono text-[8px] leading-none">Words</div>
                      <div className="font-extrabold text-slate-800 text-xs mt-0.5">{inputText.split(/\s+/).filter(Boolean).length}</div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-1.5 border border-indigo-50/50">
                      <div className="text-slate-400 uppercase font-mono text-[8px] leading-none">Fillers Detected</div>
                      <div className="font-extrabold text-slate-800 text-xs mt-0.5 flex items-center gap-1">
                        {(() => {
                          const stats = computeSpeechStats(inputText);
                          return (
                            <>
                              <span className={stats.fillers > 2 ? "text-amber-600" : "text-emerald-600"}>
                                {stats.fillers}
                              </span>
                              {stats.detectedFillers.length > 0 && (
                                <span className="text-[8px] text-slate-405 font-normal">
                                  ({stats.detectedFillers.slice(0, 2).join(",")})
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-1.5 border border-indigo-50/50">
                      <div className="text-slate-400 uppercase font-mono text-[8px] leading-none font-bold">Delivery Cadence</div>
                      <div className="font-semibold text-slate-800 mt-0.5 leading-none truncate">
                        {(() => {
                          const stats = computeSpeechStats(inputText);
                          return stats.rating;
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[9px] text-indigo-650 font-sans italic">
                    {isRecordingVoice ? "🎤 Continuously optimizing recognition stream. Click Submit or press Enter to finalize." : "Type or speak to dynamically analyze the answer."}
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-end">
              <button
                onClick={toggleVoiceRecording}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer border ${
                  isRecordingVoice
                    ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                    : "bg-slate-100 hover:bg-slate-250 border-slate-200 text-slate-600 hover:text-slate-850"
                }`}
                title={isRecordingVoice ? "Stop recording voice" : "Answer with Voice (Speak)"}
              >
                <Mic className={`w-4 h-4 ${isRecordingVoice ? "animate-bounce" : ""}`} />
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isRecordingVoice ? "🎤 Listening to your voice... Speak clearly. Click Mic to pause." : "Type or speak your detailed response... (Press Enter to transmit answers)"}
                className="flex-1 bg-slate-50 border border-slate-205 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px] max-h-[120px] resize-none leading-relaxed"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoadingMessage}
                className="bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl w-11 h-11 flex items-center justify-center transition shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Count user responses in current active room
  const userResponsesCount = currentSession.filter(m => m.role === "user").length;

  return (
    <div className="space-y-6">
      {/* CUSTOM EXIT CONFIRMATION MODAL OVERLAY */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-fade-in text-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Exit Interview Room?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Your session progress and active camera/audio streams will be shut down and lost. Are you sure you want to exit?
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  handleExitInterview(false);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Yes, Exit Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider font-mono">
              Quality Thought AI Placement Recruiter
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-display">
            Interactive AI Mock Technical Interviews
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Practice section-wise tech interviews styled after real placement reviews. Face 5 consecutive questions from Gemini AI to evaluate your concepts, syntax accuracy, and logical code design.
          </p>
        </div>

        {!isInterviewing && !activeReport && (
          <button
            onClick={() => {
              setSelectedSubject("python");
              setSelectedDifficulty("Junior");
              handleStartInterview();
            }}
            className="bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-550/20 shadow-md text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Launch Quick Interview
          </button>
        )}
      </div>      {isInterviewing && isVisualRoom ? (
        /* SPECIAL DUAL PANEL FOR PREMIUM PROCTORED MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* CHAT SESSION (60%) */}
          <div className="lg:col-span-7">
            {renderActiveChat(true)}
          </div>
          
          {/* VISUAL MONITORING HUD (40%) */}
          <div className="lg:col-span-5 bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between h-[540px]">
            <div>
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <div>
                    <h4 className="text-[11px] font-black text-white uppercase font-sans tracking-widest leading-none">
                      Proctoring Panel Diagnostics
                    </h4>
                    <p className="text-[9px] text-slate-400 mt-1">Continuous AI validation feed & telemetry.</p>
                  </div>
                </div>
                <span className="text-[9px] bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded border border-red-550/20 flex items-center gap-1 uppercase font-mono shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> REC SECURE
                </span>
              </div>

              {/* WEBCAM SIMULATOR */}
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-850 relative">
                <div className="absolute top-2.5 left-2.5 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[8px] font-mono tracking-widest text-slate-300 uppercase flex items-center gap-1 font-bold">
                  Camera Feed
                </div>
                <video ref={videoElementRef} style={{ display: 'none' }} muted playsInline autoPlay />
                <canvas ref={webcamCanvasRef} width={340} height={170} className="w-full h-[170px] block bg-slate-950" />
                <div className="bg-slate-900/90 border-t border-slate-850 p-2 flex items-center justify-between text-[8px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>BIOMETRICS SECURED</span>
                  </div>
                  <span className="text-emerald-400 font-bold">[Face Matched: 99.4%]</span>
                </div>
              </div>
            </div>

            {/* AUDIO SOUND WAVE */}
            <div className="bg-slate-900 rounded-xl border border-slate-850 p-3.5 space-y-1.5 relative overflow-hidden">
              <div className="flex justify-between items-center text-[8px] font-mono">
                <span className="text-slate-405 font-bold uppercase flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-indigo-400 animate-bounce" /> Sound Level Stream
                </span>
                <span className="text-emerald-400 font-bold">[ONLINE]</span>
              </div>
              <canvas ref={voiceCanvasRef} width={340} height={35} className="w-full h-[35px] block opacity-90" />
            </div>

            {/* LIVE PROCTOR SECURITY LOG */}
            <div className="bg-black/95 p-3 rounded-xl border border-slate-850 font-mono text-[9px] space-y-1 shrink-0">
              <div className="text-slate-500 font-bold text-[8px] uppercase tracking-wider border-b border-slate-900 pb-1 mb-1.5 flex justify-between">
                <span>Intelligent Watchdog Streams</span>
                <span className="text-indigo-400">Ver 1.2</span>
              </div>
              <div className="space-y-1 font-mono max-h-[80px] overflow-y-auto pr-1">
                {proctorLogs.slice(0, 4).map((log, lIdx) => (
                  <div key={lIdx} className="leading-normal font-mono text-[9.5px] text-slate-400 truncate">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD VIEW PORTALS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: ACTIVE INTERVIEW ROOM OR ACTIVE REPORT PREVIEW */}
          <div className="lg:col-span-2 space-y-6">
            {isInterviewing ? (
              renderActiveChat(false)
            ) : activeReport ? (
            /* DETAILED REPORT PREVIEW BOARD */
            <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden shadow-sm space-y-6">
              {/* Detailed Report Active Title Header */}
              <div className="bg-slate-900 px-5 py-4 border-b border-indigo-950 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <div>
                    <h3 className="text-xs font-extrabold font-display uppercase tracking-wider leading-none">
                      Placement Grade Card & detailed Report
                    </h3>
                    <p className="text-[10px] text-slate-300 mt-1 font-mono">
                      Subject: {getSubjectName(activeReport.subject)} &bull; {activeReport.difficulty} Difficulty Level
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveReport(null)}
                  className="bg-slate-800 hover:bg-slate-705 text-xs text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition"
                >
                  Close Evaluation
                </button>
              </div>

              {/* REPORT OVERVIEW DATA BLOCKS */}
              <div className="px-6 space-y-6 pb-6">
                
                {/* DUAL SCORES & EXECUTIVE OVERVIEW GRID */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* CUMULATIVE GENERAL APITUDE SCORE */}
                  <div className="bg-indigo-900 text-white p-5 rounded-2xl text-center flex flex-col justify-center items-center shadow-sm border border-indigo-950 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
                    <span className="text-[10px] font-extrabold text-indigo-200 uppercase tracking-widest font-mono">
                      Core Placement Score
                    </span>
                    <span className="text-4xl font-black leading-tight font-mono mt-2 mb-1">
                      {activeReport.report?.score || "N/A"}%
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      (activeReport.report?.score ?? 0) >= 85
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : (activeReport.report?.score ?? 0) >= 70
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : (activeReport.report?.score ?? 0) >= 60
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      {(activeReport.report?.score ?? 0) >= 85
                        ? "★ L1 Ready"
                        : (activeReport.report?.score ?? 0) >= 70
                        ? "✓ Qualified"
                        : (activeReport.report?.score ?? 0) >= 60
                        ? "⚠️ Conditional"
                        : "⛔ Needs Retake"}
                    </span>
                  </div>

                  {/* SUB-TRACK BREAKDOWN SCORES */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <div className="flex justify-between items-center text-[10px] uppercase font-mono font-bold">
                        <span className="text-slate-500 flex items-center gap-1">🛠️ Technical Aptitude</span>
                        <span className="text-indigo-600 font-extrabold">{activeReport.report?.technicalScore ?? activeReport.report?.score ?? 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${activeReport.report?.technicalScore ?? activeReport.report?.score ?? 0}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400">Coding correctness, math, algorithms and domain syntax metrics.</p>
                    </div>

                    <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <div className="flex justify-between items-center text-[10px] uppercase font-mono font-bold">
                        <span className="text-slate-500 flex items-center gap-1">💼 HR & Articulation</span>
                        <span className="text-purple-600 font-extrabold">{activeReport.report?.hrScore ?? activeReport.report?.score ?? 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all"
                          style={{ width: `${activeReport.report?.hrScore ?? activeReport.report?.score ?? 0}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans">Confidence level, verbal expression pacing, and situational culture fit.</p>
                    </div>
                  </div>
                </div>

                {/* EXECUTIVE BRIEF & SUMMARY NOTES */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2 relative">
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block font-mono">
                    Executive Recruitment Summary
                  </span>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed italic">
                    &ldquo;{activeReport.report?.summary}&rdquo;
                  </p>
                </div>

                {/* REAL-TIME CONVERSATION PATTERN & DNA ANALYTICS */}
                <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-blue-150 pb-2">
                    <Fingerprint className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-extrabold text-blue-950 uppercase font-sans tracking-wide">
                        Answering Pattern & Communication Diagnostics
                      </h4>
                      <p className="text-[9px] text-blue-700 font-medium">Linguistic analysis, conceptual brevity, and behavioral confidence indicators.</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {activeReport.report?.patternAnalysis || "Linguistic pattern diagnostic data is being calculated from transcript segments..."}
                  </p>
                </div>

                {/* 🤖 ROBOT SPEECH & VOICE DELIVERY DIAGNOSTICS CARD */}
                {activeReport.report?.voiceAnalysis && (
                  <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-indigo-400 animate-pulse" />
                        <div>
                          <h4 className="text-xs font-extrabold uppercase font-sans tracking-wider leading-none">
                            🤖 Humanoid Voice & Delivery Diagnostics
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-1">Real-time tone enunciation, pacing speed, and conversational enunciation analytics.</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-indigo-500/15 text-indigo-400 font-mono font-bold px-2.5 py-1 rounded border border-indigo-500/20 uppercase">
                        Active Speech Analysis
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                        <span className="block text-[8px] text-slate-400 uppercase font-mono tracking-wider">Speaking Speed</span>
                        <span className="text-lg font-black text-slate-100 font-mono block mt-1">
                          {activeReport.report.voiceAnalysis.paceWpm} <span className="text-[9px] text-slate-500 font-normal">WPM</span>
                        </span>
                        <span className={`inline-block text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full mt-1.5 ${
                          activeReport.report.voiceAnalysis.paceStatus.toLowerCase().includes("ideal")
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {activeReport.report.voiceAnalysis.paceStatus}
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                        <span className="block text-[8px] text-slate-400 uppercase font-mono tracking-wider">Enunciation Clarity</span>
                        <span className="text-lg font-black text-indigo-400 font-mono block mt-1">
                          {activeReport.report.voiceAnalysis.clarityScore}%
                        </span>
                        <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                          <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${activeReport.report.voiceAnalysis.clarityScore}%` }}></div>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                        <span className="block text-[8px] text-slate-400 uppercase font-mono tracking-wider">Voice Modulation</span>
                        <span className="text-xs font-extrabold text-slate-200 block mt-2 truncate">
                          {activeReport.report.voiceAnalysis.modulationStatus}
                        </span>
                        <span className="inline-block text-[8px] font-mono text-indigo-300 uppercase mt-1">Tone Check</span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                        <span className="block text-[8px] text-slate-400 uppercase font-mono tracking-wider">Filler words usage</span>
                        <span className="text-lg font-black text-slate-100 font-mono block mt-1">
                          {activeReport.report.voiceAnalysis.fillerCount} <span className="text-[9px] text-slate-500 font-normal">Freq</span>
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {activeReport.report.voiceAnalysis.fillersDetected.map((fil: string) => (
                            <span key={fil} className="text-[8px] font-mono bg-slate-800 px-1 py-0.2 rounded text-slate-400">
                              "{fil}"
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl space-y-2">
                        <h5 className="text-[10px] font-bold text-rose-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                          ⚠️ Speech & Pacing mistakes
                        </h5>
                        <ul className="space-y-1 pl-1 text-[10px] text-slate-300 leading-relaxed list-disc">
                          {activeReport.report.voiceAnalysis.mistakes.map((m: string, idx: number) => (
                            <li key={idx} className="ml-3">
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl space-y-2">
                        <h5 className="text-[10px] font-bold text-emerald-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                          💡 Speech Suggestions & Improvements
                        </h5>
                        <ul className="space-y-1 pl-1 text-[10px] text-slate-300 leading-relaxed list-disc">
                          {activeReport.report.voiceAnalysis.improvements.map((imp: string, idx: number) => (
                            <li key={idx} className="ml-3">
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* STRENGTHS AND WEAKNESS BRICKS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <UserCheck className="w-4.5 h-4.5 text-emerald-600" />
                      <h4 className="text-xs font-extrabold text-emerald-900 uppercase font-sans tracking-wide">
                        Evaluated Core Strengths
                      </h4>
                    </div>
                    <ul className="space-y-1.5 pl-1 text-[11px] text-emerald-800 leading-relaxed font-medium">
                      {(activeReport.report?.strengths || []).map((str, sIdx) => (
                        <li key={sIdx} className="flex gap-2 items-start">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-4.5 h-4.5 text-amber-600" />
                      <h4 className="text-xs font-extrabold text-amber-905 uppercase font-sans tracking-wide">
                        Core Gaps & Key Improvements
                      </h4>
                    </div>
                    <ul className="space-y-1.5 pl-1 text-[11px] text-amber-800 leading-relaxed font-medium">
                      {(activeReport.report?.improvements || []).map((imp, wIdx) => (
                        <li key={wIdx} className="flex gap-2 items-start">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* TARGETED FEEDBACK SUGGESTIONS BENTO */}
                {((activeReport.report?.hrSuggestions && activeReport.report.hrSuggestions.length > 0) || 
                  (activeReport.report?.techSuggestions && activeReport.report.techSuggestions.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-amber-50/30 border border-amber-200/80 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4.5 h-4.5 text-amber-600" />
                        <h4 className="text-xs font-extrabold text-amber-950 uppercase font-sans tracking-wide">
                          Actionable HR & Behavioral Tips
                        </h4>
                      </div>
                      <ul className="space-y-2 pl-1 text-[11px] text-amber-850 leading-relaxed font-medium">
                        {(activeReport.report?.hrSuggestions || []).map((sug, idx) => (
                          <li key={idx} className="flex gap-1.5 items-start">
                            <span className="text-amber-600 font-bold shrink-0 mt-0.5 font-mono">0{idx + 1}.</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-indigo-50/30 border border-indigo-200/80 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-4.5 h-4.5 text-indigo-600" />
                        <h4 className="text-xs font-extrabold text-indigo-950 uppercase font-sans tracking-wide">
                          Actionable Technical & Logic Guidelines
                        </h4>
                      </div>
                      <ul className="space-y-2 pl-1 text-[11px] text-indigo-850 leading-relaxed font-medium">
                        {(activeReport.report?.techSuggestions || []).map((sug, idx) => (
                          <li key={idx} className="flex gap-1.5 items-start">
                            <span className="text-indigo-600 font-bold shrink-0 mt-0.5 font-mono">0{idx + 1}.</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* PREMIUM QUESTIONS VS STUDENT ANSWERS VS IDEAL SOLUTIONS COMPARISON SECTION */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1">
                    <Award className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase font-sans tracking-wide">
                        📝 Question-by-Question Solution Comparison
                      </h4>
                      <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                        Compare your interview answers step-by-step with optimal technical or behavioral solutions.
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const comps = activeReport.report?.questionComparisons || (() => {
                      const list: any[] = [];
                      let lastQ = "";
                      for (const m of activeReport.messages || []) {
                        if (m.role === "assistant" || m.role === "model") {
                          lastQ = m.content;
                        } else if (m.role === "user" && lastQ) {
                          list.push({
                            question: lastQ,
                            studentAnswer: m.content,
                            idealAnswer: "A structured reference solution detailing core conceptual syntax, code execution steps, optimal parameters, or behavioral STAR matrices.",
                            comparisonAnalysis: "The candidate shows standard conceptual familiarity. Recommendation is to cite concrete python functions, numpy arrays, pandas vectorization or specific corporate placement situations.",
                            correctnessPercentage: 78
                          });
                          lastQ = "";
                        }
                      }
                      return list;
                    })();

                    if (!comps || comps.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic">
                          No distinct questions were found in this interview transcript.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {comps.map((item: any, idx: number) => {
                          const percentage = item.correctnessPercentage ?? 75;
                          let scoreBadgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                          if (percentage >= 85) scoreBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                          else if (percentage >= 70) scoreBadgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                          else if (percentage >= 55) scoreBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";

                          return (
                            <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs transition hover:border-slate-300">
                              {/* Accordion/Card Header */}
                              <div className="bg-slate-50/70 px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                                <div className="space-y-1">
                                  <span className="text-[10px] bg-slate-200/80 text-slate-700 font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                    Question 0{idx + 1}
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-800 leading-relaxed pt-1 font-sans">
                                    {item.question}
                                  </h5>
                                </div>
                                <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-full border shrink-0 ${scoreBadgeColor}`}>
                                  {percentage}% Accuracy
                                </span>
                              </div>

                              {/* Card Content body */}
                              <div className="p-4 space-y-3.5 bg-white text-xs">
                                {/* Student Answer */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-slate-455 font-mono text-[9px] uppercase font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    <span>Your Submitted Answer</span>
                                  </div>
                                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                                    {item.studentAnswer || "[No response provided or skipped]"}
                                  </div>
                                </div>

                                {/* Ideal Solution */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-emerald-650 font-mono text-[9px] uppercase font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Optimal Ideal Solution / Reference</span>
                                  </div>
                                  <div className="p-3 bg-emerald-50/30 border border-emerald-100/60 rounded-xl text-emerald-900 leading-relaxed font-sans font-semibold whitespace-pre-wrap">
                                    {item.idealAnswer}
                                  </div>
                                </div>

                                {/* Comparison Critique Analysis */}
                                <div className="space-y-1 bg-indigo-50/25 border border-indigo-100/60 p-3 rounded-xl">
                                  <div className="flex items-center gap-1.5 text-indigo-750 font-mono text-[9px] uppercase font-bold mb-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    <span>AI Comparative Evaluation & Feedback</span>
                                  </div>
                                  <p className="text-slate-650 leading-relaxed font-sans font-medium">
                                    {item.comparisonAnalysis}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* DETAILED EVALUATION MARKDOWN SECTION */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-2">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-3">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase font-sans">
                      Section-by-Section Assessment Transcript
                    </h4>
                  </div>

                  <div className="prose max-w-none">
                    {renderMarkdown(activeReport.report?.detailedEvaluation || "")}
                  </div>
                </div>

                {/* SHOW DIALOG TRANSCRIPT CONVERSATION LOGS */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 overflow-hidden">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase font-sans mb-3 flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-slate-600" /> Full Chat Room Dialog History
                  </h4>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                    {activeReport.messages.map((m, mIdx) => (
                      <div key={mIdx} className="text-xs space-y-0.5 font-sans leading-relaxed">
                        <span className={`font-mono text-[9px] uppercase tracking-wider ${
                          m.role === 'user' ? 'text-indigo-600 font-bold' : 'text-slate-500'
                        }`}>
                          {m.role === 'user' ? student.name : 'AI RECRUITER'}
                        </span>
                        <div className={`p-2 rounded-lg text-slate-700 ${
                          m.role === 'user' ? 'bg-indigo-50/50' : 'bg-white border rounded'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* DEFAULT FORM SETUP SCREEN */
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
                <Brain className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                    New Mock Recruiter Room Setup
                  </h3>
                  <p className="text-[10px] text-slate-400">Configure parameters before establishing AI session connection.</p>
                </div>
              </div>

              {/* OPERATING HOURS SYSTEM BANNER */}
              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                (currentTime.getHours() >= 7 && currentTime.getHours() < 24) || bypassTiming
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : "bg-rose-50/70 border-rose-200 text-rose-950"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    (currentTime.getHours() >= 7 && currentTime.getHours() < 24) || bypassTiming ? "bg-emerald-100 text-emerald-700 animate-pulse" : "bg-rose-100 text-rose-700"
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold uppercase font-sans tracking-wide">
                        Recruiter Room Hours (07:00 AM - 12:00 AM)
                      </span>
                      <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        (currentTime.getHours() >= 7 && currentTime.getHours() < 24) ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-850"
                      }`}>
                        {(currentTime.getHours() >= 7 && currentTime.getHours() < 24) ? "🟢 Open" : "🔴 Outside Hours"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Placement recruiters conduct live AI evaluation sessions from morning 07:00 AM to midnight 12:00 AM.
                      <span className="font-mono text-slate-800 block mt-0.5 font-bold">
                        Live Clock Time: {currentTime.toLocaleTimeString()} ({((currentTime.getHours() >= 7 && currentTime.getHours() < 24) || bypassTiming) ? "Available" : "On Standby"})
                      </span>
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setBypassTiming(!bypassTiming)}
                  className="text-[9px] font-mono font-bold bg-white text-zinc-700 hover:text-indigo-600 border px-2.5 py-1.5 rounded-xl shadow-xs self-stretch md:self-auto transition flex items-center justify-center gap-1 shrink-0"
                >
                  {bypassTiming ? "🔒 STRICT WINDOW ON" : "🔓 BYPASS WINDOW (TESTING)"}
                </button>
              </div>

              {/* DUAL MODE SELECTOR TAB BAR */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomMaterial(false);
                    setIsResumeMode(false);
                    setMaterialError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 ${
                    !useCustomMaterial && !isResumeMode
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🏫 Syllabus Tracks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomMaterial(true);
                    setIsResumeMode(false);
                    setMaterialError("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 ${
                    useCustomMaterial && !isResumeMode
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📁 Study Materials
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomMaterial(false);
                    setIsResumeMode(true);
                    setMaterialError("");
                    setCustomSubjectName("Resume-Based Interview");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 ${
                    isResumeMode
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📄 Resume Placement
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COLUMN 1: SUBJECT / SYLLABUS SELECTOR OR CUSTOM FILE UPLOADER */}
                {isResumeMode ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-950 font-mono">
                        Target Placement Role Title
                      </label>
                      <input
                        type="text"
                        value={customSubjectName === "Excel & CSV Data Diagnostics" ? "General Data Scientist placement" : customSubjectName}
                        onChange={(e) => setCustomSubjectName(e.target.value)}
                        placeholder="e.g. Associate Data Scientist, Python Developer"
                        className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
                      />
                    </div>

                    {/* Resume File Upload Selector */}
                    <div className="border border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/40 transition rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-2 relative border-dashed">
                      <FileCode className="w-7 h-7 text-indigo-500 animate-bounce" />
                      <div className="text-xs">
                        <span className="font-bold text-indigo-700 block">Select Professional Resume File</span>
                        <span className="text-[10px] text-zinc-500">Pick PDF, txt, md or docx representation file (.txt, .md, .js)</span>
                      </div>
                      <input
                        type="file"
                        accept=".txt,.md,.py,.js,text/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadedFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setCustomInterviewMaterial(evt.target?.result as string);
                            setCustomSubjectName("Resume: " + file.name.replace(/\.[^/.]+$/, ""));
                          };
                          reader.readAsText(file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {uploadedFileName && (
                        <span className="text-[9px] text-indigo-800 font-mono font-bold bg-indigo-100 px-2 py-0.5 rounded">
                          ✓ {uploadedFileName}
                        </span>
                      )}
                    </div>

                    {/* Resume paste textarea */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-extrabold text-slate-450 font-mono">
                        <label>Or Copy & Paste Resume Text Here</label>
                        {customInterviewMaterial && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomInterviewMaterial("");
                              setUploadedFileName("");
                            }}
                            className="text-rose-650 hover:text-rose-800 font-bold lowercase font-mono"
                          >
                            [clear]
                          </button>
                        )}
                      </div>
                      <textarea
                        value={customInterviewMaterial}
                        onChange={(e) => setCustomInterviewMaterial(e.target.value)}
                        placeholder="Paste your resume details, job achievements, bullet points, technical skills list, and database projects here..."
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-505 focus:outline-none leading-relaxed placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ) : !useCustomMaterial ? (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                      Syllabus Section / Core Subject
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SYLLABUS.map((subj) => {
                        const isSel = selectedSubject === subj.slug;
                        return (
                          <button
                            key={subj.slug}
                            type="button"
                            onClick={() => setSelectedSubject(subj.slug)}
                            className={`text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                              isSel
                                ? "border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-500"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50/80"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 text-xs truncate">
                              <span className={`p-1 rounded-md shrink-0 flex items-center justify-center ${isSel ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                                {subj.slug === "python" && <Code2 className="w-3.5 h-3.5" />}
                                {subj.slug === "numpy" && <Activity className="w-3.5 h-3.5" />}
                                {subj.slug === "pandas" && <FileCode className="w-3.5 h-3.5" />}
                                {subj.slug === "ml" && <Brain className="w-3.5 h-3.5" />}
                                {subj.slug === "dl" && <Brain className="w-3.5 h-3.5" />}
                                {subj.slug === "nlp" && <MessageSquare className="w-3.5 h-3.5" />}
                                {subj.slug === "genai" && <Sparkles className="w-3.5 h-3.5" />}
                                {subj.slug === "eda" && <TrendingUp className="w-3.5 h-3.5" />}
                              </span>
                              <span className="font-extrabold truncate leading-none">{subj.name}</span>
                            </div>
                            <span className="text-[9px] font-mono block mt-1 uppercase text-slate-400 font-semibold truncate leading-none">
                              Day {subj.startDay} - {subj.endDay}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Subject Title */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-950 font-mono">
                        Target Tech Subject / Topic Title
                      </label>
                      <input
                        type="text"
                        value={customSubjectName}
                        onChange={(e) => setCustomSubjectName(e.target.value)}
                        placeholder="e.g. Advanced Excel Formulas & Macros, Sales CSV"
                        className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
                      />
                    </div>

                    {/* File Drop / Select Container */}
                    <div className="border border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/60 transition rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-2 relative border-dashed">
                      <Upload className="w-7 h-7 text-indigo-500 animate-bounce" />
                      <div className="text-xs">
                        <span className="font-bold text-indigo-700 block">Select Placement Reference Document</span>
                        <span className="text-[10px] text-zinc-500">Pick raw study guide notes or text sheets (.txt, .csv, .py, .md)</span>
                      </div>
                      <input
                        type="file"
                        accept=".txt,.md,.py,.csv,.tsv,.json,.js,.html,text/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadedFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setCustomInterviewMaterial(evt.target?.result as string);
                            // Auto populate subject label if it matches defaults
                            const cleanedName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                            setCustomSubjectName(cleanedName.substring(0, 50).toUpperCase());
                          };
                          reader.readAsText(file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {uploadedFileName && (
                        <span className="text-[9px] text-indigo-800 font-mono font-bold bg-indigo-100 px-2 py-0.5 rounded">
                          ✓ {uploadedFileName}
                        </span>
                      )}
                    </div>

                    {/* Manual copy paste textarea */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-extrabold text-slate-450 font-mono">
                        <label>Or Paste Syllabus / PDF Extract / CSV Data</label>
                        {customInterviewMaterial && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomInterviewMaterial("");
                              setUploadedFileName("");
                            }}
                            className="text-rose-650 hover:text-rose-800 font-bold lowercase font-mono"
                          >
                            [clear]
                          </button>
                        )}
                      </div>
                      <textarea
                        value={customInterviewMaterial}
                        onChange={(e) => setCustomInterviewMaterial(e.target.value)}
                        placeholder="Paste PDF notes text paragraphs, Excel sheet formulas, CSV data tables, cheat sheets, or core concepts details..."
                        rows={5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-505 focus:outline-none leading-relaxed placeholder:text-slate-400"
                      />
                    </div>

                    {customInterviewMaterial && (
                      <div className="text-[10px] bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded border border-emerald-150 font-mono font-semibold flex items-center justify-between">
                        <span>Payload status: <strong>{customInterviewMaterial.length}</strong> characters uploaded</span>
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                )}

                {/* COLUMN 2: DIFFICULTY SELECTOR & WARNS */}
                <div className="space-y-4">
                  {/* ACADEMIC ELIGIBILITY STATUS CARD */}
                  {!useCustomMaterial && (
                    <div className="bg-slate-50 border border-slate-205 p-4 rounded-xl space-y-3 shadow-xs">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-450">
                          Interview Gateway Status
                        </span>
                        <span className={`text-[9px] font-mono font-black py-0.5 px-2.5 rounded-full ${
                          isEligible ? "bg-emerald-500/10 text-emerald-800 border border-emerald-500/20" : "bg-rose-500/10 text-rose-850 border border-rose-500/20"
                        }`}>
                          {isEligible ? "🔓 ELIGIBLE" : "🔒 BLOCKED"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                          <span className="text-[9px] text-slate-400 block font-mono font-semibold uppercase leading-none mb-1">Assessment Score</span>
                          <span className={`font-black ${isEligible ? "text-slate-900" : "text-amber-600"}`}>
                            {scoreVal !== null ? `${scoreVal}%` : "0% (No Record)"}
                          </span>
                          <span className="text-[8px] text-slate-400 block">(Minimum 60% required)</span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-150">
                          <span className="text-[9px] text-slate-400 block font-mono font-semibold uppercase leading-none mb-1">Chances Remaining</span>
                          <span className={`font-black ${maxAttemptsExhausted ? "text-rose-600" : "text-indigo-650"}`}>
                            {3 - currentSubjectAttempts} of 3 left
                          </span>
                          <span className="text-[8px] text-slate-400 block">({currentSubjectAttempts}/3 attempts used)</span>
                        </div>
                      </div>

                      {!isEligible && (
                        <p className="text-[10.5px] text-rose-700 leading-normal font-sans font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100/50">
                          ⚠️ <strong>Action Required:</strong> You must attempt and score at least 60% on the Comprehensive Assessment under the <strong>Subject Assessments</strong> tab to proceed, or ask instructor Vinay for an access bypass.
                        </p>
                      )}

                      {maxAttemptsExhausted && (
                        <p className="text-[10.5px] text-rose-700 leading-normal font-sans font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100/50">
                          ⚠️ <strong>Max attempts reached:</strong> You have exhausted all 3 interview chances. Contact Professor Vinay to grant a reset of your attempts.
                        </p>
                      )}

                      {student?.interviewRewritePermission && (
                        <div className="text-[10px] text-emerald-850 font-bold bg-emerald-100/60 p-2.5 rounded border border-emerald-250/50 flex items-center gap-1.5 font-mono animate-pulse">
                          ★ SPECIAL REWRITE PERMISSION: GRANTED BY MENTOR (Attempts limit bypassed)
                        </div>
                      )}

                      {matchingOverride?.eligibilityBypass && (
                        <div className="text-[10px] text-purple-850 font-bold bg-purple-100/60 p-2 rounded border border-purple-200/50 flex items-center gap-1 font-mono">
                          ★ ACTIVE OVERRIDE: INSTRUCTOR ELIGIBILITY BYPASS GRANTED
                        </div>
                      )}
                    </div>
                  )}

                  {/* INTERVIEW INTERVAL TYPE SELECTOR */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                      Interview Evaluation Interval
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <button
                        type="button"
                        onClick={() => setInterviewType("weekly")}
                        className={`py-3 rounded-xl border text-xs font-bold font-sans transition flex items-center justify-center gap-2 cursor-pointer ${
                          interviewType === "weekly"
                            ? "border-purple-600 bg-purple-50 text-purple-900 shadow-xs ring-1 ring-purple-600"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${interviewType === "weekly" ? "bg-purple-600 animate-pulse" : "bg-slate-300"}`}></span>
                        <span>Weekly Mock</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInterviewType("monthly")}
                        className={`py-3 rounded-xl border text-xs font-bold font-sans transition flex items-center justify-center gap-2 cursor-pointer ${
                          interviewType === "monthly"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-600"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${interviewType === "monthly" ? "bg-emerald-600 animate-pulse" : "bg-slate-300"}`}></span>
                        <span>Monthly Mock</span>
                      </button>
                    </div>
                  </div>

                  {/* INTERVIEW ROUND TRACK TYPE SELECTOR */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                      Placement Round Track Type
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-left">
                      <button
                        type="button"
                        onClick={() => setRoundType("technical")}
                        className={`py-3 rounded-xl border text-xs font-bold font-sans transition flex flex-col items-center justify-center cursor-pointer gap-1 ${
                          roundType === "technical"
                            ? "border-indigo-650 bg-indigo-50/80 text-indigo-950 shadow-xs ring-1 ring-indigo-500"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Code2 className={`w-3.5 h-3.5 ${roundType === "technical" ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-[10.5px] leading-none mt-0.5">Technical</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoundType("hr")}
                        className={`py-3 rounded-xl border text-xs font-bold font-sans transition flex flex-col items-center justify-center cursor-pointer gap-1 ${
                          roundType === "hr"
                            ? "border-indigo-650 bg-indigo-50/80 text-indigo-950 shadow-xs ring-1 ring-indigo-500"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <UserCheck className={`w-3.5 h-3.5 ${roundType === "hr" ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-[10.5px] leading-none mt-0.5">HR Round</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoundType("combined")}
                        className={`py-3 rounded-xl border text-xs font-bold font-sans transition flex flex-col items-center justify-center cursor-pointer gap-1 ${
                          roundType === "combined"
                            ? "border-indigo-650 bg-indigo-50/80 text-indigo-950 shadow-xs ring-1 ring-indigo-500"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${roundType === "combined" ? "text-indigo-600 animate-pulse" : "text-slate-400"}`} />
                        <span className="text-[10.5px] leading-none mt-0.5">Combined</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                      Placement Target Complexity Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Junior", "Mid-Level", "Senior"].map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setSelectedDifficulty(diff)}
                          className={`py-3.5 rounded-xl border text-xs font-bold font-sans transition flex flex-col items-center justify-center cursor-pointer gap-0.5 ${
                            selectedDifficulty === diff
                              ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{diff}</span>
                          <span className={`${
                            selectedDifficulty === diff ? "text-indigo-200" : "text-slate-400"
                          } text-[8px] uppercase tracking-widest font-mono font-normal`}>
                            {diff === "Junior" ? "Associate" : diff === "Mid-Level" ? "Engineer" : "Principal"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PREMIUM PROCTORING SECTION */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <div>
                          <h4 className="text-[10px] font-black uppercase font-sans tracking-wider text-slate-200 leading-none">
                            Premium Face Proctoring Mode
                          </h4>
                          <p className="text-[9px] text-indigo-200 mt-1 leading-tight">
                            Live face match & environment watchdog audio diagnostics.
                          </p>
                        </div>
                      </div>
                      
                      <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-wide ${
                        (hasCompletedPython || forceUnlockVisual)
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {(hasCompletedPython || forceUnlockVisual) ? "🔓 UNLOCKED" : "🔒 CONSTRAINED"}
                      </span>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10.5px]">
                          <p className="font-bold text-slate-100 font-sans leading-none">
                            Enable Video Biometrics & Audio Waves?
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                            Unlocks once Python is completed (to prevent tab-switching).
                          </p>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={isVisualRoom}
                            onChange={(e) => {
                              if (!hasCompletedPython && !forceUnlockVisual) {
                                alert("Please complete at least one Python quiz on your dayboard first or click the Master Demo Bypass!");
                                return;
                              }
                              setIsVisualRoom(e.target.checked);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                        </label>
                      </div>

                      {!hasCompletedPython && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-t border-slate-850 pt-2 text-[9px] text-indigo-200">
                          <span className="font-medium font-sans text-amber-500">
                            ⚠️ Python course incompleteness block.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextState = !forceUnlockVisual;
                              setForceUnlockVisual(nextState);
                              if (nextState) setIsVisualRoom(true);
                            }}
                            className="text-[8px] font-mono font-bold text-indigo-400 hover:text-white underline text-left cursor-pointer uppercase font-semibold leading-none"
                          >
                            {forceUnlockVisual ? "[re-lock block]" : "[⚡ bypass lock for demo]"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 leading-relaxed space-y-1 shrink-0">
                    <p className="font-bold flex items-center gap-1 text-amber-950 uppercase font-sans">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Interview Session Instructions:
                    </p>
                    <p className="text-[11px] text-amber-800 font-sans leading-tight">
                      {useCustomMaterial
                        ? "Gemini will customize all five interactive questions around your provided document formulas and datasets. Score progress will write to Class Records."
                        : "You can exit the room halfway or re-take subjects as many times as needed. Your scores write to the Batch performance dashboard."}
                    </p>
                  </div>

                  {materialError && (
                    <div className="text-xs bg-red-50 text-rose-600 border border-red-200 p-3 rounded-lg font-medium">
                      ❌ {materialError}
                    </div>
                  )}

                  <button
                    onClick={handleStartInterview}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-3"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    Enter AI Board Exam Room
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PAST HISTORICAL AI INTERVIEWS GRID */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-205 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-1">
              <History className="w-4 h-4 text-slate-600" />
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                Your Exam Room History
              </h3>
            </div>

            {loadingPast ? (
              <div className="text-xs text-slate-400 italic text-center py-6">
                Loading student transcript records...
              </div>
            ) : pastInterviews.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs leading-none font-medium">No saved mock interviews yet.</p>
                <p className="text-[10px] text-slate-400 leading-tight">Pick a subject on the left to start practice session.</p>
              </div>
            ) : (() => {
              const filteredPastInterviews = pastInterviews.filter(item => {
                if (pastInterviewFilter === "all") return true;
                const type = item.interviewType || "weekly";
                return type === pastInterviewFilter;
              });

              return (
                <div className="space-y-3">
                  {/* Segment filter buttons */}
                  <div className="flex border border-slate-150 gap-1 bg-slate-50/50 p-1 rounded-xl text-[9.5px] uppercase font-extrabold tracking-wider mb-2 text-left">
                    <button
                      type="button"
                      onClick={() => setPastInterviewFilter("all")}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        pastInterviewFilter === "all" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-850"
                      }`}
                    >
                      All ({pastInterviews.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPastInterviewFilter("weekly")}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        pastInterviewFilter === "weekly" ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-850"
                      }`}
                    >
                      Weekly ({pastInterviews.filter(item => (item.interviewType || "weekly") === "weekly").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPastInterviewFilter("monthly")}
                      className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                        pastInterviewFilter === "monthly" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-850"
                      }`}
                    >
                      Monthly ({pastInterviews.filter(item => item.interviewType === "monthly").length})
                    </button>
                  </div>

                  {filteredPastInterviews.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      No {pastInterviewFilter} mock interviews completed yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 text-left">
                      {filteredPastInterviews.map((item) => {
                        const dateLabel = new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveReport(item);
                              setIsInterviewing(false);
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 text-xs cursor-pointer ${
                              activeReport?.id === item.id
                                ? "border-indigo-600 bg-indigo-50/40"
                                : "border-slate-150 bg-slate-50/40 hover:bg-slate-50"
                            }`}
                          >
                            <div className="space-y-1 font-sans truncate pr-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-xs truncate">
                                  {getSubjectName(item.subject)}
                                </span>
                                <span className="text-[8px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase font-mono tracking-wider shrink-0">
                                  {item.difficulty}
                                </span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase font-mono tracking-wider shrink-0 ${
                                  (item.interviewType || "weekly") === "weekly"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {item.interviewType || "weekly"}
                                </span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase font-mono tracking-wider shrink-0 ${
                                  item.roundType === "hr"
                                    ? "bg-amber-100 text-amber-800"
                                    : item.roundType === "combined"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-indigo-100 text-indigo-800"
                                }`}>
                                  {item.roundType === "hr" ? "💼 HR" : item.roundType === "combined" ? "⚡ Combined" : "🛠️ Tech"}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium font-mono">{dateLabel}</p>
                            </div>

                            <div className="text-right flex items-center gap-1 shrink-0">
                              <div className="bg-white px-2.5 py-1.5 border border-indigo-150 rounded-lg text-center min-w-[44px]">
                                <span className="text-[8px] text-slate-400 block font-mono font-bold leading-none uppercase mb-0.5">SCORE</span>
                                <span className="text-xs font-extrabold text-indigo-600 font-mono">
                                  {item.report?.score || "N/A"}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    )}
  </div>
);
}
