import React, { useState, useEffect } from "react";
import {
  Users,
  Database,
  Lock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Search,
  CheckCircle2,
  Award
} from "lucide-react";
import TeacherDashboard from "./components/TeacherDashboard.jsx";
import StudentPortal from "./components/StudentPortal.jsx";
import { Student } from "./types.js";

type UserRole = "landing" | "student_login" | "teacher_login" | "student_active" | "teacher_active";

export default function App() {
  const [role, setRole] = useState<UserRole>("landing");

  // Load state from DB to display dropdown options
  const [batches, setBatches] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Authentication states
  const [selectedBatch, setSelectedBatch] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [teacherPass, setTeacherPass] = useState("");

  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  // Status alerts
  const [authError, setAuthError] = useState<string | null>(null);

  // OTP Verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otpDetails, setOtpDetails] = useState<{
    studentId: string;
    email: string;
    maskedEmail: string;
    simulatedOtp: string;
  } | null>(null);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    fetchBootData();
  }, []);

  const fetchBootData = async () => {
    try {
      const res = await fetch("/api/db");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
        setStudents(data.students || []);

        if (data.batches && data.batches.length > 0) {
          setSelectedBatch(data.batches[0]);
        }
      }
    } catch (e) {
      console.error("Boot initial setup failed:", e);
    }
  };

  // Student portal login processor (initiates OTP flow)
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanPhone = studentPhone.trim().replace(/\D/g, "");
    if (!selectedBatch || !studentRoll.trim() || !cleanPhone) {
      setAuthError("Please select a batch, enter your registered Roll number, and enter your Phone Number.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setAuthError("Mobile number must be exactly 10 digits.");
      return;
    }

    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rollNumber: studentRoll.trim(),
          phoneNumber: cleanPhone,
          batch: selectedBatch
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.otpSent) {
          setOtpSent(true);
          setOtpDetails({
            studentId: data.studentId,
            email: data.email,
            maskedEmail: data.maskedEmail,
            simulatedOtp: data.simulatedOtp
          });
          setEnteredOtp("");
        } else if (data.student) {
          setActiveStudent(data.student);
          setRole("student_active");
          setStudentRoll("");
          setStudentPhone("");
        }
      } else {
        setAuthError(data.error || "Roll Number or Phone Number does not match registered details for this batch.");
      }
    } catch (e) {
      setAuthError("Failed to authenticate to server databases.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!otpDetails || !enteredOtp.trim()) {
      setAuthError("Please enter the verification code sent to your email.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/student/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: otpDetails.studentId,
          otp: enteredOtp.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.student) {
        setActiveStudent(data.student);
        setRole("student_active");
        setStudentRoll("");
        setStudentPhone("");
        setOtpSent(false);
        setOtpDetails(null);
        setEnteredOtp("");
      } else {
        setAuthError(data.error || "Invalid verification code. Please check and try again.");
      }
    } catch (e) {
      setAuthError("Failed to verify secure code with server.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleBackToLoginInput = () => {
    setOtpSent(false);
    setOtpDetails(null);
    setEnteredOtp("");
    setAuthError(null);
  };

  // Teacher password processor
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: teacherPass })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRole("teacher_active");
          setTeacherPass("");
        }
      } else {
        setAuthError("Incorrect Teacher Pin Code. Please try again.");
      }
    } catch (e) {
      setAuthError("Failed to connect to teacher authentication API.");
    }
  };

  const handleSignOut = () => {
    setActiveStudent(null);
    setRole("landing");
    setAuthError(null);
    setOtpSent(false);
    setOtpDetails(null);
    setEnteredOtp("");
    fetchBootData(); // refresh
  };

  // Render Student Panel
  if (role === "student_active" && activeStudent) {
    return <StudentPortal student={activeStudent} onLogout={handleSignOut} />;
  }

  // Render Teacher Panel
  if (role === "teacher_active") {
    return <TeacherDashboard onLogout={handleSignOut} />;
  }

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col justify-between text-slate-800 font-sans">
      {/* Landing top branding bar */}
      <nav className="h-16 bg-slate-900 border-b border-slate-800 text-white flex justify-between items-center px-6 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-lg font-display select-none">QT</div>
          <div>
            <span className="font-extrabold font-display text-sm text-white tracking-tight leading-none block">Data Science Daily Test Portal</span>
            <span className="text-[10px] text-indigo-400 font-mono leading-none font-semibold">Quality Thought Academy</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono hidden sm:inline-block">Status: Live Training Slate</div>
      </nav>

      {/* Main Container Workspace */}
      <main className="flex-grow flex items-center justify-center py-10 px-4">
        {/* 1. SELECTION LANDING HERO SCREEN */}        {role === "landing" && (
          <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left intro text info */}
            <div className="md:col-span-7 space-y-6 text-center md:text-left">
              <div className="space-y-2">
                <span className="bg-indigo-100 text-indigo-900 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider inline-block font-mono">
                  ★ Academic Testing Portal ★
                </span>
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-black text-slate-900 tracking-tight leading-none">
                  <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-black font-display">QUALITY</span>
                  <span className="block bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 bg-clip-text text-transparent font-display font-black tracking-tight mt-1">
                    THOUGHT
                  </span>
                </h1>
                <p className="text-sm md:text-base font-extrabold text-slate-650 font-display tracking-tight mt-1 uppercase text-indigo-600">
                  Data Science & Machine Learning Academy
                </p>
              </div>
              
              <div className="h-1 w-20 bg-indigo-600 mx-auto md:mx-0 rounded-full"></div>

              <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-lg font-sans">
                A highly comprehensive, structured daily test system comprising over 200 Days of intensive assessments and programming. Master complete Python constructs, NumPy, Pandas operations, and production Machine Learning pipelines.
              </p>

              <div className="space-y-3 pt-2 text-left max-w-md mx-auto md:mx-0">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-[10px] font-black">✓</span>
                  Dynamic Curriculum Locking & Student Tracking
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-[10px] font-black">✓</span>
                  Instant Student Evaluation Feedback (8 MCQs + 2 Code Blocks)
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-[10px] font-black">✓</span>
                  Automated Unified Career Placement & Job Portal Matcher
                </div>
              </div>
            </div>

            {/* Right option box */}
            <div className="md:col-span-5 bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
              <div className="text-center md:text-left">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-widest block mb-1">
                  SECURE ACCESS
                </span>
                <h3 className="text-xl font-black text-slate-900 font-display">
                  Sign in to Portal Gateway
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setRole("student_login")}
                  className="w-full text-left p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-md transition duration-300 group cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-extrabold text-slate-800 text-lg flex items-center gap-2 font-display">
                      <Users className="w-5.5 h-5.5 text-indigo-600" />
                      I am a Student
                    </span>
                    <ArrowRight className="w-4.5 h-4.5 text-slate-350 group-hover:text-indigo-600 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium font-sans">
                    Log in with your roll number and batch assignment details to start daily evaluations.
                  </p>
                </button>

                <button
                  onClick={() => setRole("teacher_login")}
                  className="w-full text-left p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-indigo-500 hover:shadow-md transition duration-300 group cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-extrabold text-slate-800 text-lg flex items-center gap-2 font-display">
                      <Lock className="w-5.5 h-5.5 text-indigo-650" />
                      Instructor Panel
                    </span>
                    <ArrowRight className="w-4.5 h-4.5 text-slate-350 group-hover:text-indigo-600 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium font-sans">
                    Log in to unlock syllabus days, register students, configure batches, or view general reports.
                  </p>
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  Quality Thought Elite Data Science Program
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. STATE: STUDENT PORTAL LOGIN SCREEN */}
        {role === "student_login" && (
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-7 space-y-6 animate-zoom-in">
            <div className="text-center">
              <div className="inline-flex p-3 bg-indigo-50 text-indigo-655 rounded-full mb-3 shadow-xs">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student Portal Login</h2>
              <p className="text-xs text-slate-400 mt-1">Please select your batch, and enter your roll number and phone number below</p>
            </div>

            {authError && (
              <div className="bg-rose-50 text-rose-700 border border-rose-150 p-3 rounded-xl text-xs leading-relaxed font-semibold text-center">
                {authError}
              </div>
            )}

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-mono">Select Registered Batch</label>
                {batches.length === 0 ? (
                  <select disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-400">
                    <option>No active batches synced</option>
                  </select>
                ) : (
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700 font-sans cursor-pointer"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                  >
                    {batches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-mono">Unique Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DS2026-001"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-mono">Registered Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, "").substring(0, 10))}
                  maxLength={10}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700"
                />
                <span className="text-[9.5px] text-slate-400 mt-1 block leading-normal leading-relaxed">
                  Enforces security identity validation. First log-in dynamically links your mobile phone.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRole("landing")}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-xs transition uppercase tracking-wider font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl text-xs transition uppercase tracking-wider font-mono cursor-pointer shadow-xs"
                >
                  Sign In to Portal
                </button>
              </div>
            </form>

            <div className="text-center pt-3 border-t border-slate-150">
              <span className="text-[10px] text-slate-400 leading-normal block font-sans">
                No Roll Number yet? Ask the instructor Vinay to import you or paste student records inside his teacher panel.
              </span>
            </div>
          </div>
        )}

        {/* 3. STATE: TEACHER PORTAL LOGIN SCREEN */}
        {role === "teacher_login" && (
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-250 p-6 space-y-5 animate-zoom-in">
            <div className="text-center">
              <div className="inline-flex p-3 bg-slate-900 text-white rounded-full mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Instructor Control Login</h2>
              <p className="text-xs text-slate-400 mt-1">Provide password PIN code to manage locks and daily attendance logs</p>
            </div>

            {authError && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg text-xs leading-relaxed font-semibold">
                {authError}
              </div>
            )}

            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Teacher Code Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter Pin"
                  value={teacherPass}
                  onChange={(e) => setTeacherPass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono tracking-widest text-center"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRole("landing")}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded text-sm transition"
                >
                  Authenticate
                </button>
              </div>
            </form>

            <div className="bg-indigo-50 text-indigo-800 p-3.5 rounded-lg border border-indigo-100 text-[10px] leading-relaxed">
              <span className="font-bold block">Secure Access Active:</span>
              Please authenticate with the classroom PIN issued by the administration.
            </div>
          </div>
        )}
      </main>

      {/* Landing footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-center text-xs text-slate-400 font-sans print:hidden">
        Data Science Master Daily Exam System &bull; Class Course lock, Unlocking, Student portal. Persistent inside database configurations.
      </footer>
    </div>
  );
}
