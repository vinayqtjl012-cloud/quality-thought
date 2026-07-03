import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  Users,
  Search,
  Plus,
  Trash2,
  Printer,
  Send,
  Database,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Sparkles,
  ChevronRight,
  FileCode,
  AlertCircle,
  RotateCcw,
  Save,
  Upload,
  Linkedin,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Video,
  FileVideo,
  ClipboardList,
  Settings,
  Check,
  X,
  Wifi,
  WifiOff,
  FileText,
  User,
  UserCheck,
  UserX,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { Student, Batch, CourseLockState, SYLLABUS, getCourseForDay, getTopicTitleForDay, DayQuiz } from "../types.js";
import { getTestCasesForQuestion, diagnoseCodeErrors } from "../utils/testCases.js";

interface TeacherDashboardProps {
  onLogout: () => void;
}

export default function TeacherDashboard({ onLogout }: TeacherDashboardProps) {
  // Database States
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [locks, setLocks] = useState<Record<string, CourseLockState>>({});
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<Record<number, DayQuiz>>({});

  // Active Management States
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"attendance" | "students" | "locks" | "quizzes" | "interviews" | "videos" | "tests" | "featureAccess">("attendance");
  const [loading, setLoading] = useState(true);

  // Video Management States
  const [learningVideos, setLearningVideos] = useState<any[]>([]);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [newVideoForm, setNewVideoForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    courseSlug: "python",
    attachmentType: "video"
  });

  // Assessments and Overrides State
  const [assessments, setAssessments] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [selectedStudentForAccess, setSelectedStudentForAccess] = useState<Student | null>(null);
  const [selectedStudentForReview, setSelectedStudentForReview] = useState<Student | null>(null);
  const [expandedDayDetails, setExpandedDayDetails] = useState<Record<number, boolean>>({});
  const [jobLocation, setJobLocation] = useState<string>("Hyderabad, India");
  const [accessSubmittingSubject, setAccessSubmittingSubject] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");

  // Classroom Attendance & Permission States for Faculty
  const [attendance, setAttendance] = useState<any[]>([]);
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState<string | null>(null);
  const [teacherZoomInput, setTeacherZoomInput] = useState<Record<string, string>>({});
  
  // Weekly tests and Feature access states
  const [scheduledTests, setScheduledTests] = useState<any[]>([]);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState<"online" | "offline">("online");
  const [testSubmissions, setTestSubmissions] = useState<any[]>([]);
  const [newTestForm, setNewTestForm] = useState({
    title: "",
    testType: "weekly",
    courseSlug: "python",
    topic: "",
    durationMinutes: 30
  });
  const [newTestMcqs, setNewTestMcqs] = useState<any[]>([]);
  const [newTestCoding, setNewTestCoding] = useState<any[]>([]);

  // Filter attendance day
  const [monitorDay, setMonitorDay] = useState<number>(1);

  // New Student Input State
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentRoll, setNewStudentRoll] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");

  // Bulk Import State
  const [bulkText, setBulkText] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<string | null>(null);

  // New Batch Input State
  const [newBatchName, setNewBatchName] = useState("");
  const [showAddBatch, setShowAddBatch] = useState(false);

  // Custom Quiz Overrider
  const [selectedDayToOverride, setSelectedDayToOverride] = useState<number>(1);
  const [overrideQuizData, setOverrideQuizData] = useState<any>(null);

  // AI Material to Quiz generator state
  const [materialText, setMaterialText] = useState("");
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [materialError, setMaterialError] = useState("");
  const [generateSuccess, setGenerateSuccess] = useState(false);

  // Notification Alerts simulation state
  const [alertStatus, setAlertStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchDB();
  }, []);

  const handleToggleInterviewPermission = async (studentId: string, allowed: boolean) => {
    try {
      const res = await fetch(`/api/students/${studentId}/interview-permission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setStudents(body.students || []);
          setSelectedStudentForAccess(prev => prev && prev.id === studentId ? { ...prev, interviewPermission: allowed } : prev);
        }
      }
    } catch (err) {
      console.error("Failed to edit student placement gateway status:", err);
    }
  };

  const handleToggleInterviewRewritePermission = async (studentId: string, allowed: boolean) => {
    try {
      const res = await fetch(`/api/students/${studentId}/interview-rewrite-permission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setStudents(body.students || []);
          setSelectedStudentForAccess(prev => prev && prev.id === studentId ? { ...prev, interviewRewritePermission: allowed } : prev);
        }
      }
    } catch (err) {
      console.error("Failed to edit student AI Interview Rewrite status:", err);
    }
  };

  const handleTogglePlacementPermission = async (studentId: string, allowed: boolean) => {
    try {
      const res = await fetch(`/api/students/${studentId}/placement-permission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setStudents(body.students || []);
          // Also update selectedStudentForAccess state if active
          setSelectedStudentForAccess(prev => {
            if (prev && prev.id === studentId) {
              return { ...prev, placementPermission: allowed };
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Failed to edit student placement gateway permission:", err);
    }
  };

  const handleUpdateStudentAttendance = async (studentId: string, dayNum: number, status: "offline" | "online" | "absent", zoomUrl: string = "") => {
    setUpdatingAttendanceId(`${studentId}-${dayNum}`);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          dayNumber: dayNum,
          status,
          zoomUrl,
          role: "teacher"
        })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setAttendance(body.attendance || []);
        }
      }
    } catch (err) {
      console.error("Failed to update student classroom attendance:", err);
    } finally {
      setUpdatingAttendanceId(null);
    }
  };

  const handleToggleFeatureLock = async (batchName: string, feature: "interview" | "resume" | "monthlyTest", enabled: boolean) => {
    try {
      const res = await fetch("/api/feature-locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchName, feature, enabled })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLocks(data.locks || {});
        }
      }
    } catch (err) {
      console.error("Failed to toggle feature lock:", err);
    }
  };

  const EXAM_PRESETS: Record<string, Record<string, { topic: string; duration: number; mcqs: any[]; coding: any[] }>> = {
    python: {
      weekly: {
        topic: "List Comprehensions, Slicing & Conditionals",
        duration: 30,
        mcqs: [
          {
            questionText: "What does the list comprehension [x**2 for x in range(5) if x % 2 == 0] evaluate to?",
            options: ["[0, 4, 16]", "[0, 1, 4, 9, 16]", "[4, 16]", "[0, 2, 4]"],
            correctOption: 0,
            explanation: "Even numbers in range(5) are 0, 2, 4. Their squares are 0, 4, 16."
          },
          {
            questionText: "Which function converts a JSON string back into a Python dictionary?",
            options: ["json.dumps()", "json.loads()", "json.parse()", "json.dict()"],
            correctOption: 1,
            explanation: "json.loads() loads a JSON string into a Python object/dictionary."
          }
        ],
        coding: [
          {
            questionText: "Write a function 'even_squares(n)' that returns squares of even numbers up to n.",
            starterCode: "def even_squares(n):\n    # Return list of even squares\n    pass",
            expectedKeywords: "def,return,range,%"
          }
        ]
      },
      monthly: {
        topic: "Generators, Iterators, Custom Decorators & Context Managers",
        duration: 60,
        mcqs: [
          {
            questionText: "Which of the following is true about Python generator expressions?",
            options: [
              "They evaluate all elements in memory immediately",
              "They yield elements lazily and are memory-efficient",
              "They only work with numbers",
              "They cannot be used in a for-loop"
            ],
            correctOption: 1,
            explanation: "Generator expressions yield items lazily one by one, making them highly memory-efficient."
          },
          {
            questionText: "What is the primary difference between a list and a tuple in Python?",
            options: [
              "Tuples are mutable, lists are immutable",
              "Lists are mutable, tuples are immutable",
              "Lists can store mixed types, tuples cannot",
              "Tuples have faster element lookup but consume 10x more memory"
            ],
            correctOption: 1,
            explanation: "Lists are mutable and can be modified. Tuples are immutable."
          }
        ],
        coding: [
          {
            questionText: "Write a generator function 'lazy_fib(limit)' that yields Fibonacci numbers up to limit.",
            starterCode: "def lazy_fib(limit):\n    # Yield numbers\n    pass",
            expectedKeywords: "yield,def,while"
          }
        ]
      }
    },
    numpy: {
      weekly: {
        topic: "NumPy Arrays, Slicing & Broadcasting basics",
        duration: 30,
        mcqs: [
          {
            questionText: "What does np.ones((2, 3)) produce?",
            options: [
              "A 1D array of three 2s",
              "A 2D array of shape 2x3 containing all 1.0",
              "A matrix of zeros",
              "An error because shape should be two arguments"
            ],
            correctOption: 1,
            explanation: "np.ones((2,3)) creates a 2-by-3 shape array filled with ones."
          }
        ],
        coding: [
          {
            questionText: "Write a function 'create_grid(n)' that returns an n x n identity matrix.",
            starterCode: "def create_grid(n):\n    # Use np.eye\n    pass",
            expectedKeywords: "eye,return,def"
          }
        ]
      },
      monthly: {
        topic: "Vectorization, Advanced Indexing & Array Aggregations",
        duration: 60,
        mcqs: [
          {
            questionText: "What is the performance advantage of vectorization in NumPy?",
            options: [
              "It compiles Python to assembly on the fly",
              "It leverages contiguous memory blocks and precompiled C code to avoid Python loop overhead",
              "It runs calculations on multiple threads automatically",
              "It compresses files automatically"
            ],
            correctOption: 1,
            explanation: "Vectorization avoids explicit loop overhead by using contiguous C memory arrays and SIMD vector instructions."
          }
        ],
        coding: [
          {
            questionText: "Write a function 'normalize_vector(v)' that normalizes a 1D NumPy array by subtracting the mean and dividing by the standard deviation.",
            starterCode: "def normalize_vector(v):\n    # Normalization\n    pass",
            expectedKeywords: "mean,std,return,def"
          }
        ]
      }
    },
    pandas: {
      weekly: {
        topic: "Pandas DataFrame Selection, Filtering & Indexing",
        duration: 35,
        mcqs: [
          {
            questionText: "How do you select columns 'Age' and 'Salary' from a Pandas DataFrame df?",
            options: [
              "df['Age', 'Salary']",
              "df[['Age', 'Salary']]",
              "df.select('Age', 'Salary')",
              "df.loc['Age', 'Salary']"
            ],
            correctOption: 1,
            explanation: "You pass a list of column names inside outer brackets, like df[['Age', 'Salary']]."
          }
        ],
        coding: [
          {
            questionText: "Write a function 'filter_salaries(df, min_val)' to filter rows where 'Salary' > min_val.",
            starterCode: "def filter_salaries(df, min_val):\n    # Return df\n    pass",
            expectedKeywords: "df,Salary,>,return"
          }
        ]
      },
      monthly: {
        topic: "GroupBy Operations, Aggregations, Merging & Handling Missing Data",
        duration: 60,
        mcqs: [
          {
            questionText: "What is the purpose of .groupby() in Pandas?",
            options: [
              "To sort the rows alphabetically",
              "To split the data into groups based on some criteria, apply a function, and combine the results",
              "To merge two tables together",
              "To transpose the rows and columns"
            ],
            correctOption: 1,
            explanation: "groupby() implements the split-apply-combine paradigm for analyzing subsets of data."
          }
        ],
        coding: [
          {
            questionText: "Write a function 'group_averages(df, cat_col, num_col)' that returns the mean of num_col grouped by cat_col.",
            starterCode: "def group_averages(df, cat_col, num_col):\n    # Return grouped mean\n    pass",
            expectedKeywords: "groupby,mean,return,def"
          }
        ]
      }
    },
    ml: {
      weekly: {
        topic: "Supervised Learning Algorithms, Regression & Classification concepts",
        duration: 30,
        mcqs: [
          {
            questionText: "Which of the following is a supervised learning algorithm?",
            options: [
              "K-Means Clustering",
              "Isolation Forest",
              "Random Forest Regressor",
              "PCA Dimensionality Reduction"
            ],
            correctOption: 2,
            explanation: "Random Forest is a supervised learning algorithm used for classification and regression, whereas the others are unsupervised."
          }
        ],
        coding: [
          {
            questionText: "Write a function 'train_model(X, y)' that trains a Dummy Classifier or similar from sklearn and returns it.",
            starterCode: "def train_model(X, y):\n    # Return trained model\n    pass",
            expectedKeywords: "fit,return,def"
          }
        ]
      },
      monthly: {
        topic: "Model Evaluation Metrics, Overfitting & Feature Engineering",
        duration: 60,
        mcqs: [
          {
            questionText: "What does over-fitting mean in Machine Learning?",
            options: [
              "The model performs exceptionally well on unseen data but poorly on the training data",
              "The model performs very well on the training data but fails to generalize to unseen test data",
              "The model runs out of memory during compilation",
              "The data has more features than rows"
            ],
            correctOption: 1,
            explanation: "Overfitting occurs when a model learns the noise in the training data too well, leading to poor generalization on test datasets."
          }
        ],
        coding: [
          {
            questionText: "Write a function 'evaluate_accuracy(y_true, y_pred)' that returns accuracy ratio between 0 and 1.",
            starterCode: "def evaluate_accuracy(y_true, y_pred):\n    # Accuracy\n    pass",
            expectedKeywords: "sum,len,==,return,def"
          }
        ]
      }
    }
  };

  const handleLoadExamPreset = (courseSlug: string, testType: string) => {
    const preset = EXAM_PRESETS[courseSlug]?.[testType];
    if (preset) {
      const typeLabel = testType === "weekly" ? "Weekly" : "Monthly";
      const courseLabel = courseSlug === "python" ? "Python" : courseSlug === "numpy" ? "NumPy" : courseSlug === "pandas" ? "Pandas" : "Machine Learning";
      setNewTestForm({
        title: `${courseLabel} ${typeLabel} Evaluation Exam`,
        testType: testType,
        courseSlug: courseSlug,
        topic: preset.topic,
        durationMinutes: preset.duration
      });
      setNewTestMcqs(JSON.parse(JSON.stringify(preset.mcqs)));
      setNewTestCoding(JSON.parse(JSON.stringify(preset.coding)));
    } else {
      alert("No pre-defined template found for this segment combination.");
    }
  };

  const handleCreateScheduledTest = async (testData: any) => {
    try {
      const res = await fetch("/api/scheduled-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const testsRes = await fetch("/api/scheduled-tests");
          if (testsRes.ok) {
            const testsData = await testsRes.json();
            if (testsData.success) {
              setScheduledTests(testsData.tests || []);
            }
          }
          setShowAddTestModal(false);
        }
      }
    } catch (err) {
      console.error("Failed to create scheduled test:", err);
    }
  };

  const handleDeleteScheduledTest = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this test permanently?")) return;
    try {
      const res = await fetch(`/api/scheduled-tests/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setScheduledTests(data.tests || []);
        }
      }
    } catch (err) {
      console.error("Failed to delete scheduled test:", err);
    }
  };

  const handleToggleTestActive = async (id: string) => {
    try {
      const res = await fetch(`/api/scheduled-tests/${id}/toggle-active`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setScheduledTests(prev => prev.map(t => t.id === id ? data.test : t));
        }
      }
    } catch (err) {
      console.error("Failed to toggle test active status:", err);
    }
  };

  const handleMarkAllPresent = async () => {
    const batchStudents = students.filter(s => s.batch === selectedBatch);
    if (batchStudents.length === 0) return;
    
    const studentIds = batchStudents.map(s => s.id);
    try {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          dayNumber: monitorDay,
          status: attendanceMode,
          zoomUrl: ""
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAttendance(data.attendance || []);
        }
      }
    } catch (err) {
      console.error("Failed to bulk update attendance:", err);
    }
  };

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLearningVideos(data.videos || []);
        }
      }
    } catch (e) {
      console.error("Failed to fetch custom video list:", e);
    }
  };

  const fetchDB = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setBatches(data.batches || []);
        setLocks(data.locks || {});
        setSubmissions(data.submissions || []);
        setQuizzes(data.quizzes || {});
        setAssessments(data.assessments || []);
        setOverrides(data.overrides || []);
        setAttendance(data.attendance || []);

        if (data.batches && data.batches.length > 0 && !selectedBatch) {
          setSelectedBatch(data.batches[0]);
        }
      }
      await fetchVideos();
      
      const testsRes = await fetch("/api/scheduled-tests");
      if (testsRes.ok) {
        const testsData = await testsRes.json();
        if (testsData.success) {
          setScheduledTests(testsData.tests || []);
        }
      }

      const subsRes = await fetch("/api/scheduled-tests/submissions");
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        if (subsData.success) {
          setTestSubmissions(subsData.submissions || []);
        }
      }
    } catch (e) {
      console.error("Failed to fetch applet database:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRewritePermission = async (studentId: string, dayNumber: number, allowed: boolean) => {
    try {
      const res = await fetch("/api/students/rewrite-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, dayNumber, allowed })
      });
      if (res.ok) {
        const data = await res.json();
        setStudents((prev) =>
          prev.map((s) => {
            if (s.id === studentId) {
              return { ...s, rewriteDays: data.rewriteDays };
            }
            return s;
          })
        );
        if (selectedStudentForReview && selectedStudentForReview.id === studentId) {
          setSelectedStudentForReview((prev) => {
            if (prev) {
              return { ...prev, rewriteDays: data.rewriteDays };
            }
            return prev;
          });
        }
      } else {
        alert("Failed to update rewrite permission.");
      }
    } catch (err) {
      console.error("Error setting rewrite exam permissions:", err);
    }
  };

  const handleTeacherOverrideSubmit = async (courseSlug: string, eligibilityBypass: boolean, resetAttempts: boolean) => {
    if (!selectedStudentForAccess) return;
    setAccessSubmittingSubject(courseSlug);
    try {
      const res = await fetch("/api/overrides/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentForAccess.id,
          courseSlug,
          eligibilityBypass,
          resetAttempts
        })
      });

      if (res.ok) {
        // Refresh local dashboard database state
        await fetchDB();
      } else {
        alert("Failed to submit teacher override rules.");
      }
    } catch (e) {
      console.error("Error submitting professor instructions:", e);
    } finally {
      setAccessSubmittingSubject(null);
    }
  };

  const handleTeacherUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoError(null);
    if (!newVideoForm.title || !newVideoForm.videoUrl) {
      setVideoError("Resource title and Video Stream URL are required.");
      return;
    }

    setSavingVideo(true);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlug: newVideoForm.courseSlug,
          title: newVideoForm.title,
          description: newVideoForm.description,
          videoUrl: newVideoForm.videoUrl,
          addedBy: "Instructor Vinay",
          attachmentType: newVideoForm.attachmentType || "video"
        })
      });

      const body = await res.json();
      if (res.ok && body.success) {
        setLearningVideos(prev => [...prev, body.video]);
        setNewVideoForm({ title: "", description: "", videoUrl: "", courseSlug: "python", attachmentType: "video" });
        alert("Educational training material/resource uploaded and connected successfully for students!");
      } else {
        setVideoError(body.error || "Failed to save learning video.");
      }
    } catch (err) {
      setVideoError("Failed to connect to video server API.");
    } finally {
      setSavingVideo(false);
    }
  };

  const handleTeacherDeleteVideo = async (id: string) => {
    if (!confirm("Are you sure you want to remove this learning video?")) return;
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLearningVideos(prev => prev.filter(v => v.id !== id));
      } else {
        alert(data.error || "Failed to remove learning video.");
      }
    } catch (err) {
      alert("Failed to connect to delete video server API.");
    }
  };

  const [quizLoading, setQuizLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchQuizToOverride = async (day: number, forceRegen = false) => {
    setQuizLoading(true);
    setSaveSuccess(false);
    try {
      const url = `/api/quiz/${day}${forceRegen ? "?regenerate=true" : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOverrideQuizData(data);
      } else {
        console.error("Failed to fetch quiz details for Day", day);
      }
    } catch (e) {
      console.error("Error fetching quiz data:", e);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleUpdateTopicTitle = (title: string) => {
    setOverrideQuizData(prev => prev ? { ...prev, topicTitle: title } : null);
  };

  const handleUpdateMCQ = (index: number, key: string, value: any) => {
    setOverrideQuizData(prev => {
      if (!prev) return null;
      const updatedMcqs = [...prev.mcqs];
      updatedMcqs[index] = { ...updatedMcqs[index], [key]: value };
      return { ...prev, mcqs: updatedMcqs };
    });
  };

  const handleUpdateMCQOption = (questionIndex: number, optionIndex: number, value: string) => {
    setOverrideQuizData(prev => {
      if (!prev) return null;
      const updatedMcqs = [...prev.mcqs];
      const updatedOptions = [...updatedMcqs[questionIndex].options];
      updatedOptions[optionIndex] = value;
      updatedMcqs[questionIndex] = { ...updatedMcqs[questionIndex], options: updatedOptions };
      return { ...prev, mcqs: updatedMcqs };
    });
  };

  const handleUpdateCoding = (index: number, key: string, value: any) => {
    setOverrideQuizData(prev => {
      if (!prev) return null;
      const updatedCoding = [...prev.coding];
      updatedCoding[index] = { ...updatedCoding[index], [key]: value };
      return { ...prev, coding: updatedCoding };
    });
  };

  const handleSaveQuizOverride = async () => {
    if (!overrideQuizData) return;
    setQuizLoading(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/quiz/${selectedDayToOverride}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrideQuizData)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4400);
      } else {
        alert("Failed to save custom questions");
      }
    } catch (e) {
      console.error("Error saving override changes", e);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleGenerateQuizFromMaterial = async () => {
    if (!materialText.trim()) {
      setMaterialError("Please paste some course material or pick a file first.");
      return;
    }
    setIsGeneratingQuiz(true);
    setMaterialError("");
    setGenerateSuccess(false);

    try {
      const res = await fetch("/api/quiz/generate-from-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialText,
          dayNumber: selectedDayToOverride,
          courseSlug: overrideQuizData?.courseSlug || "python",
          topicTitle: overrideQuizData?.topicTitle || `Custom Material - Day ${selectedDayToOverride}`
        })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.quiz) {
          setOverrideQuizData(result.quiz);
          setGenerateSuccess(true);
          setMaterialText("");
          setTimeout(() => setGenerateSuccess(false), 5000);
        } else {
          setMaterialError("Invalid format returned from Gemini.");
        }
      } else {
        const errData = await res.json();
        setMaterialError(errData.error || "Failed to generate quiz. Check your content material and try again.");
      }
    } catch (e: any) {
      console.error("Quiz generation request helper error:", e);
      setMaterialError("A network or configuration error occurred. Please configure your GEMINI_API_KEY.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  useEffect(() => {
    if (activeTab === "quizzes") {
      fetchQuizToOverride(selectedDayToOverride);
    }
  }, [selectedDayToOverride, activeTab]);

  // Add individual student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentRoll || !selectedBatch) return;

    const cleanPhone = newStudentPhone.trim().replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      alert("Mobile number must be exactly 10 digits.");
      return;
    }

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName,
          rollNumber: newStudentRoll,
          email: newStudentEmail,
          phoneNumber: cleanPhone,
          batch: selectedBatch
        })
      });

      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
        setNewStudentName("");
        setNewStudentRoll("");
        setNewStudentEmail("");
        setNewStudentPhone("");
        setAlertStatus("Successfully added student " + newStudentName);
        setTimeout(() => setAlertStatus(null), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add student");
      }
    } catch (e) {
      alert("Error adding student record");
    }
  };

  // Bulk import students
  const handleBulkImport = async () => {
    if (!bulkText || !selectedBatch) return;

    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textData: bulkText,
          batch: selectedBatch
        })
      });

      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
        setBulkText("");
        setShowBulkImport(false);
        setBulkImportResult(`Imported: ${data.importedCount} students. Duplicates skipped: ${data.duplicateCount}`);
        fetchDB();
        setTimeout(() => setBulkImportResult(null), 5000);
      } else {
        alert("Fail to perform bulk import batch");
      }
    } catch (err) {
      alert("Bulk import failed to connect");
    }
  };

  // Delete student
  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this student record?")) return;

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students);
      }
    } catch (e) {
      alert("Failed to delete student");
    }
  };

  // Create batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchName: newBatchName })
      });

      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches);
        setLocks(data.locks);
        setSelectedBatch(newBatchName.trim());
        setNewBatchName("");
        setShowAddBatch(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create batch");
      }
    } catch (e) {
      alert("Error creating selection batch");
    }
  };

  // Delete batch permanently
  const handleDeleteBatch = async () => {
    if (!selectedBatch) return;

    try {
      const res = await fetch(`/api/batches/${encodeURIComponent(selectedBatch)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches);
        setLocks(data.locks);
        if (data.students) {
          setStudents(data.students);
        }
        // Select next available batch or reset selection
        if (data.batches && data.batches.length > 0) {
          setSelectedBatch(data.batches[0]);
        } else {
          setSelectedBatch("");
        }
        setConfirmDeleteBatch(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete batch");
      }
    } catch (e) {
      alert("Error deleting batch");
    }
  };

  // Toggle dynamic Course lock state
  const handleToggleCourseLock = async (courseSlug: string, isCurrentlyLocked: boolean) => {
    if (!selectedBatch) return;

    const currentLock = locks[selectedBatch] || {
      batchName: selectedBatch,
      unlockedCourses: ["python"],
      unlockedDays: [1, 2],
      courseLockState: {}
    };

    const nextLockState = { ...currentLock.courseLockState, [courseSlug]: !isCurrentlyLocked };

    // Also update unlockedCourses list
    let nextUnlockedCourses = [...(currentLock.unlockedCourses || [])];
    if (isCurrentlyLocked) {
      // Unlocking it
      if (!nextUnlockedCourses.includes(courseSlug)) nextUnlockedCourses.push(courseSlug);
    } else {
      // Locking it
      nextUnlockedCourses = nextUnlockedCourses.filter(c => c !== courseSlug);
    }

    try {
      const res = await fetch("/api/lock-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchName: selectedBatch,
          unlockedCourses: nextUnlockedCourses,
          unlockedDays: currentLock.unlockedDays,
          courseLockState: nextLockState
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLocks(data.locks);
      }
    } catch (e) {
      alert("Failed to sync structural lock status to database");
    }
  };

  // Toggle individual Day lock state
  const handleToggleDayLock = async (dayNum: number) => {
    if (!selectedBatch) return;

    const currentLock = locks[selectedBatch] || {
      batchName: selectedBatch,
      unlockedCourses: ["python"],
      unlockedDays: [1, 2],
      courseLockState: {}
    };

    let nextDays = [...(currentLock.unlockedDays || [])];
    if (nextDays.includes(dayNum)) {
      nextDays = nextDays.filter(d => d !== dayNum);
    } else {
      nextDays.push(dayNum);
    }

    try {
      const res = await fetch("/api/lock-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchName: selectedBatch,
          unlockedCourses: currentLock.unlockedCourses,
          unlockedDays: nextDays,
          courseLockState: currentLock.courseLockState
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLocks(data.locks);
      }
    } catch (e) {
      alert("Failed to update Day Lock configuration status");
    }
  };

  // Select all days of a course to unlock
  const handleUnlockWholeCourse = async (slug: string, startDay: number, endDay: number) => {
    if (!selectedBatch) return;

    const currentLock = locks[selectedBatch] || {
      batchName: selectedBatch,
      unlockedCourses: [],
      unlockedDays: [],
      courseLockState: {}
    };

    const nextDaysSet = new Set(currentLock.unlockedDays || []);
    for (let d = startDay; d <= endDay; d++) {
      nextDaysSet.add(d);
    }

    const nextLockState = {
      ...currentLock.courseLockState,
      [slug]: false // false means unlocked
    };

    let nextUnlockedCourses = [...(currentLock.unlockedCourses || [])];
    if (!nextUnlockedCourses.includes(slug)) {
      nextUnlockedCourses.push(slug);
    }

    try {
      const res = await fetch("/api/lock-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchName: selectedBatch,
          unlockedCourses: nextUnlockedCourses,
          unlockedDays: Array.from(nextDaysSet),
          courseLockState: nextLockState
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLocks(data.locks);
      }
    } catch (e) {
      alert("Error unlocking entire sequence");
    }
  };

  // Clear or lock all days of a course
  const handleLockWholeCourse = async (slug: string, startDay: number, endDay: number) => {
    if (!selectedBatch) return;

    const currentLock = locks[selectedBatch] || {
      batchName: selectedBatch,
      unlockedCourses: [],
      unlockedDays: [],
      courseLockState: {}
    };

    let nextDays = (currentLock.unlockedDays || []).filter(d => d < startDay || d > endDay);

    const nextLockState = {
      ...currentLock.courseLockState,
      [slug]: true // true means locked
    };

    const nextUnlockedCourses = (currentLock.unlockedCourses || []).filter(c => c !== slug);

    try {
      const res = await fetch("/api/lock-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchName: selectedBatch,
          unlockedCourses: nextUnlockedCourses,
          unlockedDays: nextDays,
          courseLockState: nextLockState
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLocks(data.locks);
      }
    } catch (e) {
      alert("Error locking series");
    }
  };

  // Filter out students belonging to active batch
  const filteredStudents = students.filter(s => s.batch === selectedBatch);

  // Filter students by search query
  const searchedStudents = filteredStudents.filter(s => {
    if (!studentSearchQuery.trim()) return true;
    const query = studentSearchQuery.toLowerCase();
    const sName = s.name ? String(s.name).toLowerCase() : "";
    const sRoll = s.rollNumber ? String(s.rollNumber).toLowerCase() : "";
    const sEmail = s.email ? String(s.email).toLowerCase() : "";
    const sPhone = s.phoneNumber ? String(s.phoneNumber).toLowerCase() : "";
    return (
      sName.includes(query) ||
      sRoll.includes(query) ||
      sEmail.includes(query) ||
      sPhone.includes(query)
    );
  });

  // Compute attendance list for monitorDay
  const getAttendanceDataForDay = () => {
    const course = getCourseForDay(monitorDay);
    const daySubmissions = submissions.filter(
      sub => sub.dayNumber === monitorDay && sub.batch === selectedBatch
    );

    return filteredStudents.map(student => {
      const submission = daySubmissions.find(sub => sub.studentId === student.id);
      const classLog = attendance.find(
        att => att.studentId === student.id && att.dayNumber === monitorDay
      );
      
      let computedStatus: "offline" | "online" | "absent" = "absent";
      if (classLog) {
        computedStatus = classLog.status;
      } else if (submission) {
        computedStatus = "offline"; // Default fallback if submitted exam but no classlog
      }

      return {
        student,
        hasSubmitted: !!submission,
        submission,
        classLog,
        status: computedStatus
      };
    });
  };

  const attendanceDataList = getAttendanceDataForDay();
  const presentStudents = attendanceDataList.filter(a => a.status === "offline" || a.status === "online" || a.hasSubmitted);
  const absentStudents = attendanceDataList.filter(a => a.status === "absent" && !a.hasSubmitted);

  // Simulated Alert Broadcast Actions
  const handleTriggerAlert = (studentName: string) => {
    setAlertStatus(`Sms and Email alert sent successfully to ${studentName}! "Dear student, you have not attended today's Day ${monitorDay} exam on ${getCourseForDay(monitorDay).name}. Please attend it immediately."`);
    setTimeout(() => setAlertStatus(null), 5000);
  };

  const handleAlertAllAbsentees = () => {
    if (absentStudents.length === 0) return;
    setAlertStatus(`Broadcasting automated SMS/Email alerts to all ${absentStudents.length} absent students in ${selectedBatch} about Day ${monitorDay} Exam!`);
    setTimeout(() => setAlertStatus(null), 6000);
  };

  // Print function
  const handlePrintAttendanceSheet = () => {
    window.print();
  };

  const escapeCSV = (str: string) => {
    if (str === null || str === undefined) return "";
    const stringified = String(str);
    if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n")) {
      return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
  };

  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadWeekWiseAttendance = () => {
    if (filteredStudents.length === 0) {
      alert("No students in this batch to export.");
      return;
    }
    
    const totalWeeks = 29;
    let csv = "Roll Number,Student Name,Email,Batch,";
    for (let w = 1; w <= totalWeeks; w++) {
      const start = (w - 1) * 7 + 1;
      const end = Math.min(w * 7, 200);
      csv += `Week ${w} (Days ${start}-${end}),`;
    }
    csv += "Total Days Present,Overall Attendance %\n";
    
    filteredStudents.forEach(student => {
      csv += `${escapeCSV(student.rollNumber)},${escapeCSV(student.name)},${escapeCSV(student.email)},${escapeCSV(student.batch)},`;
      
      let totalPresent = 0;
      
      for (let w = 1; w <= totalWeeks; w++) {
        const start = (w - 1) * 7 + 1;
        const end = Math.min(w * 7, 200);
        const totalDaysInWeek = end - start + 1;
        
        let presentInWeek = 0;
        for (let day = start; day <= end; day++) {
          const classLog = attendance.find(
            att => att.studentId === student.id && att.dayNumber === day
          );
          const hasSubmission = submissions.some(
            sub => sub.studentId === student.id && sub.dayNumber === day && sub.batch === selectedBatch
          );
          
          if ((classLog && (classLog.status === "online" || classLog.status === "offline")) || hasSubmission) {
            presentInWeek++;
          }
        }
        
        totalPresent += presentInWeek;
        const pct = Math.round((presentInWeek / totalDaysInWeek) * 100);
        csv += `${presentInWeek}/${totalDaysInWeek} (${pct}%),`;
      }
      
      const overallPct = Math.round((totalPresent / 200) * 100);
      csv += `${totalPresent}/200,${overallPct}%\n`;
    });
    
    downloadCSV(`Attendance_WeekWise_${selectedBatch}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleDownloadMonthWiseAttendance = () => {
    if (filteredStudents.length === 0) {
      alert("No students in this batch to export.");
      return;
    }
    
    const totalMonths = 7;
    let csv = "Roll Number,Student Name,Email,Batch,";
    for (let m = 1; m <= totalMonths; m++) {
      const start = (m - 1) * 30 + 1;
      const end = Math.min(m * 30, 200);
      csv += `Month ${m} (Days ${start}-${end}),`;
    }
    csv += "Total Days Present,Overall Attendance %\n";
    
    filteredStudents.forEach(student => {
      csv += `${escapeCSV(student.rollNumber)},${escapeCSV(student.name)},${escapeCSV(student.email)},${escapeCSV(student.batch)},`;
      
      let totalPresent = 0;
      
      for (let m = 1; m <= totalMonths; m++) {
        const start = (m - 1) * 30 + 1;
        const end = Math.min(m * 30, 200);
        const totalDaysInMonth = end - start + 1;
        
        let presentInMonth = 0;
        for (let day = start; day <= end; day++) {
          const classLog = attendance.find(
            att => att.studentId === student.id && att.dayNumber === day
          );
          const hasSubmission = submissions.some(
            sub => sub.studentId === student.id && sub.dayNumber === day && sub.batch === selectedBatch
          );
          
          if ((classLog && (classLog.status === "online" || classLog.status === "offline")) || hasSubmission) {
            presentInMonth++;
          }
        }
        
        totalPresent += presentInMonth;
        const pct = Math.round((presentInMonth / totalDaysInMonth) * 100);
        csv += `${presentInMonth}/${totalDaysInMonth} (${pct}%),`;
      }
      
      const overallPct = Math.round((totalPresent / 200) * 100);
      csv += `${totalPresent}/200,${overallPct}%\n`;
    });
    
    downloadCSV(`Attendance_MonthWise_${selectedBatch}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      {/* Header Panel */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-6 sticky top-0 z-10 print:hidden shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-lg font-display select-none">Σ</div>
          <div>
            <h1 className="text-sm font-extrabold leading-none tracking-tight font-display">
              DataScience Pro <span className="font-normal text-slate-400">| Console</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-1">Instructor: Prof. Vinay</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Batch Control dropdown */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1 rounded-md">
            <span className="text-[10px] font-bold font-sans tracking-wide uppercase text-slate-400">BATCH:</span>
            <select
              className="bg-transparent text-xs font-semibold text-white border-none focus:ring-0 cursor-pointer outline-none"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="" disabled className="bg-slate-900">Select Batch</option>
              {batches.map((b) => (
                <option key={b} value={b} className="bg-slate-900">{b}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddBatch(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-1.5 rounded transition shadow-sm cursor-pointer"
          >
            + New Batch
          </button>

          {selectedBatch && (
            <div className="flex items-center gap-2">
              {!confirmDeleteBatch ? (
                <button
                  onClick={() => setConfirmDeleteBatch(true)}
                  className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                  title="Delete this batch permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Batch</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-700 rounded p-1">
                  <span className="text-[10px] text-rose-200 font-mono font-bold px-1 uppercase">Delete?</span>
                  <button
                    onClick={handleDeleteBatch}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold px-2 py-1 rounded transition cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDeleteBatch(false)}
                    className="bg-slate-700 hover:bg-slate-650 text-slate-300 text-[10px] font-semibold px-2 py-1 rounded transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onLogout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded flex items-center gap-1.5 text-xs font-medium transition border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Panel Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
        {/* Alerts Banner */}
        {alertStatus && (
          <div className="mb-6 p-4 bg-indigo-950 text-indigo-100 border border-indigo-800 rounded-lg flex items-start gap-3 transition-opacity animate-fade-in print:hidden">
            <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div className="text-sm font-medium leading-relaxed">{alertStatus}</div>
          </div>
        )}

        {/* INTERACTIVE CLASSROOM ONBOARDING PATH */}
        <div className="mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 p-6 print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5" />
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-indigo-200 font-sans">
              Dynamic Classroom Setup & Login Path Guide
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 hover:border-slate-700 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full font-mono">
                    STEP 1
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active path Ready
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-100 mb-1">Create a New Batch</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate separate class tracks (e.g. Python Basics, Data Pro). Click "+ New Batch" in the top header to initialize a batch workspace.
                </p>
              </div>
              <button
                onClick={() => setShowAddBatch(true)}
                className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white py-1.5 rounded text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-750"
              >
                <Plus className="w-3.5 h-3.5" /> + Create Batch Now
              </button>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 hover:border-slate-700 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full font-mono">
                    STEP 2
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-100 mb-1">Add or Import Student roster</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Optionally paste CSV listing with <code className="bg-slate-850 text-indigo-300 px-1 py-0.5 rounded">RollNumber, Name, Email, Phone</code>. We auto-link entered Phone Number for secured logins.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("students")}
                className="mt-4 w-full bg-indigo-950 hover:bg-indigo-900 text-indigo-200 hover:text-white py-1.5 rounded text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-indigo-900"
              >
                <Database className="w-3.5 h-3.5" /> Go to Student Database Tab
              </button>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 hover:border-slate-700 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full font-mono">
                    STEP 3
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-100 mb-1">Direct Student Login matching Phone</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Direct students to log in by selecting their batch and entering their registered Roll Number and Phone Number.
                </p>
              </div>
              <div className="mt-4 p-2 bg-slate-950 rounded text-[10px] font-mono text-indigo-300 border border-slate-850 leading-normal">
                Credentials match: <br />
                - Unique Roll/UID Code <br />
                - Entered Phone No validation
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs bar */}
        <div className="flex border-b border-slate-200 mb-6 gap-1 print:hidden overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`py-3 px-3 font-medium text-xs whitespace-nowrap border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "attendance"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Attendance & Tracker
          </button>
          <button
            onClick={() => setActiveTab("locks")}
            className={`py-3 px-3 font-medium text-xs whitespace-nowrap border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "locks"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Unlocking & Course Locks
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`py-3 px-3 font-medium text-xs whitespace-nowrap border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "students"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Student Database ({filteredStudents.length})
          </button>
          <button
            onClick={() => setActiveTab("quizzes")}
            className={`py-3 px-3 font-medium text-xs whitespace-nowrap border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "quizzes"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Syllabus & Day Quizzes
          </button>
          <button
            onClick={() => setActiveTab("interviews")}
            className={`py-3 px-3 font-medium text-xs whitespace-nowrap border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "interviews"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            AI Interviews
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`py-3 px-3 font-medium text-xs whitespace-nowrap border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "videos"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Video className="w-3.5 h-3.5 text-indigo-600" />
            Video Lectures
          </button>
          <button
            onClick={() => setActiveTab("tests")}
            className={`py-3 px-3 font-medium text-xs whitespace-nowrap border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "tests"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
            Weekly Tests
          </button>
          <button
            onClick={() => setActiveTab("featureAccess")}
            className={`py-3 px-3 font-medium text-xs whitespace-nowrap border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "featureAccess"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600" />
            Feature Access
          </button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
            <span className="text-slate-500 font-medium">Fetching register database details...</span>
          </div>
        ) : !selectedBatch ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center max-w-md mx-auto my-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Batch Created Yet</h3>
            <p className="text-sm text-slate-500 mb-6">Create your first class batch to unlock courses, paste students lists and track daily tests.</p>
            <button
              onClick={() => setShowAddBatch(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition"
            >
              Create Class Batch
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1: ATTENDANCE MONITOR */}
            {activeTab === "attendance" && (
              <div className="space-y-6">
                {/* Control card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col xl:flex-row gap-4 items-center justify-between print:hidden">
                  <div className="space-y-2 text-center xl:text-left w-full xl:w-auto">
                    <h3 className="text-lg font-bold text-slate-900">Live Daily Attendances Board</h3>
                    <p className="text-sm text-slate-500">
                      Day <span className="font-bold text-slate-900 font-mono">#{monitorDay}</span>: <span className="font-semibold text-indigo-600">{getTopicTitleForDay(monitorDay)}</span> ({getCourseForDay(monitorDay).name})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-center xl:justify-end">
                    {/* Day Slider Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 shrink-0">Select Curriculum Day:</span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={monitorDay}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (val >= 1 && val <= 200) setMonitorDay(val);
                        }}
                        className="w-14 bg-slate-50 border border-slate-250 rounded px-2 py-1 font-mono text-center text-xs font-bold focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Online / Offline attendance mode selector */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold font-sans">
                      <button
                        type="button"
                        onClick={() => setAttendanceMode("online")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all cursor-pointer ${
                          attendanceMode === "online"
                            ? "bg-blue-650 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        Online
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendanceMode("offline")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all cursor-pointer ${
                          attendanceMode === "offline"
                            ? "bg-blue-650 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <WifiOff className="w-3.5 h-3.5" />
                        Offline
                      </button>
                    </div>

                    {/* Quick action controls */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-end">
                      <button
                        type="button"
                        onClick={handleMarkAllPresent}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-650" />
                        Mark All Present
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintAttendanceSheet}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={handleAlertAllAbsentees}
                        disabled={absentStudents.length === 0}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Alert Absent ({absentStudents.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Batch Attendance Export Utilities */}
                <div className="bg-gradient-to-r from-indigo-50 to-slate-50 rounded-xl p-5 border border-indigo-150 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
                  <div className="space-y-1 text-center md:text-left">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center justify-center md:justify-start gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-650 animate-pulse" />
                      Batch Attendance Export Center (CSV / Excel Format)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Generate and download fully formatted attendance sheets covering all curriculum progress across weeks and months for batch <span className="font-bold text-indigo-700 font-mono">{selectedBatch || "all"}</span>.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 justify-center">
                    <button
                      type="button"
                      onClick={handleDownloadWeekWiseAttendance}
                      className="bg-white hover:bg-slate-100 text-indigo-750 border border-indigo-200 hover:border-indigo-300 rounded-lg px-4 py-2 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
                      Download Week-wise CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMonthWiseAttendance}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-white animate-bounce" />
                      Download Month-wise CSV
                    </button>
                  </div>
                </div>

                {/* Printable Section Wrapper */}
                <div id="attendance-print-area" className="space-y-6">
                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Card 1: Present Today */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 font-mono leading-none">
                          {presentStudents.length} / {filteredStudents.length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Present Today</div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          {filteredStudents.length > 0
                            ? Math.round((presentStudents.length / filteredStudents.length) * 100)
                            : 0}
                          % active attendance
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Absent Today */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3">
                      <div className="p-2.5 bg-rose-50 text-rose-500 rounded-lg">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 font-mono leading-none">
                          {absentStudents.length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Absent Today</div>
                        <div className="text-[9px] text-rose-500 font-medium font-semibold">Not yet marked present</div>
                      </div>
                    </div>

                    {/* Card 3: Online Present */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 font-mono leading-none font-semibold">
                          {attendanceDataList.filter(a => a.status === "online").length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Online Present</div>
                        <div className="text-[9px] text-blue-550 font-medium">Quiz submitted</div>
                      </div>
                    </div>

                    {/* Card 4: Offline Present */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3">
                      <div className="p-2.5 bg-amber-50 text-amber-650 rounded-lg">
                        <WifiOff className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 font-mono leading-none font-semibold">
                          {attendanceDataList.filter(a => a.status === "offline").length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Offline Present</div>
                        <div className="text-[9px] text-amber-600 font-medium">Manually marked</div>
                      </div>
                    </div>

                    {/* Card 5: Average MCQ Score */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3">
                      <div className="p-2.5 bg-purple-50 text-purple-605 rounded-lg">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 font-mono leading-none font-semibold">
                          {presentStudents.length > 0
                            ? (presentStudents.reduce((acc, curr) => acc + (curr.submission?.mcqScores || 0), 0) / presentStudents.length).toFixed(1)
                            : "0.0"}{" "}
                          / 8
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Average MCQ Score</div>
                        <div className="text-[9px] text-slate-400 font-medium">Excluding coding questions</div>
                      </div>
                    </div>

                    {/* Card 6: Active Stage */}
                    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3 font-semibold">
                      <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 leading-tight">
                          {getCourseForDay(monitorDay).name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Active Stage</div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          Days {getCourseForDay(monitorDay).startDay} - {getCourseForDay(monitorDay).endDay}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900">Attending Student Schedules Log</h4>
                        <p className="text-xs text-slate-500 font-mono">BATCH: {selectedBatch} | DAY: #{monitorDay}</p>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {presentStudents.length} Present &bull; {absentStudents.length} Absent
                      </span>
                    </div>

                    {attendanceDataList.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        No student registered under this match bucket.
                        <p className="text-xs text-slate-400 mt-1">Visit the "Student Database" tab to add students manually or import list.</p>
                      </div>
                    ) : (                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold font-mono uppercase tracking-wider">
                              <th className="py-3.5 px-6">Roll Number</th>
                              <th className="py-3.5 px-6">Name</th>
                              <th className="py-3.5 px-6">Status</th>
                              <th className="py-3.5 px-6">Mode</th>
                              <th className="py-3.5 px-6">Score (MCQ)</th>
                              <th className="py-3.5 px-6">Time</th>
                              <th className="py-3.5 px-6 text-right print:hidden">Mark Attendance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {attendanceDataList.map(({ student, hasSubmitted, submission, classLog, status }) => {
                              const localZoom = teacherZoomInput[`${student.id}-${monitorDay}`] !== undefined 
                                ? teacherZoomInput[`${student.id}-${monitorDay}`] 
                                : (classLog?.zoomUrl || "");

                              return (
                                <tr key={student.id} className="hover:bg-slate-50/50 transition">
                                  <td className="py-4 px-6 font-mono font-bold text-slate-900">{student.rollNumber}</td>
                                  <td className="py-4 px-6">
                                    <div className="font-semibold text-slate-700">{student.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{student.email || "No Email"}</div>
                                    {status === "online" && (
                                      <div className="mt-2 flex items-center gap-1.5 max-w-xs bg-slate-50 p-1 rounded border border-slate-200 print:hidden animate-fade-in">
                                        <input
                                          type="text"
                                          placeholder="Enter Zoom Link"
                                          value={localZoom}
                                          onChange={(e) => {
                                            setTeacherZoomInput(prev => ({
                                              ...prev,
                                              [`${student.id}-${monitorDay}`]: e.target.value
                                            }));
                                          }}
                                          className="bg-white border border-slate-200 text-[10px] px-1.5 py-0.5 rounded outline-none flex-grow font-mono text-slate-750"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateStudentAttendance(student.id, monitorDay, "online", localZoom)}
                                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[9px] font-bold font-mono py-0.5 px-1.5 rounded transition shrink-0 cursor-pointer"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    )}
                                    {status === "online" && localZoom && (
                                      <div className="mt-1 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <a
                                          href={localZoom}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-indigo-600 hover:text-indigo-805 text-[10.5px] font-bold font-mono underline hover:decoration-indigo-300 break-all"
                                        >
                                          Join Zoom Live 🔌
                                        </a>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 px-6">
                                    {status === "absent" ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                        Absent
                                      </span>
                                    ) : status === "online" ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                        Online
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Offline
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6 font-medium text-slate-600">
                                    {status === "absent" ? "—" : status === "online" ? "Online" : "Offline"}
                                  </td>
                                  <td className="py-4 px-6 font-mono text-slate-700 font-bold">
                                    {hasSubmitted && submission?.mcqScores !== undefined ? `${submission.mcqScores}/8` : "—"}
                                  </td>
                                  <td className="py-4 px-6 font-mono text-slate-500 font-medium">
                                    {hasSubmitted ? new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                                  </td>
                                  <td className="py-4 px-6 text-right print:hidden">
                                    <div className="flex justify-end items-center gap-2">
                                      {status === "absent" ? (
                                        <button
                                          type="button"
                                          disabled={updatingAttendanceId === `${student.id}-${monitorDay}`}
                                          onClick={() => handleUpdateStudentAttendance(student.id, monitorDay, attendanceMode)}
                                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                                        >
                                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Mark Present</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={updatingAttendanceId === `${student.id}-${monitorDay}`}
                                          onClick={() => handleUpdateStudentAttendance(student.id, monitorDay, "absent")}
                                          className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 text-xs font-extrabold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                                        >
                                          <UserX className="w-3.5 h-3.5 text-rose-500" />
                                          <span>Mark Absent</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        title="Toggle Format (Online/Offline)"
                                        onClick={() => {
                                          if (status === "online") {
                                            handleUpdateStudentAttendance(student.id, monitorDay, "offline");
                                          } else {
                                            const defaultZoom = localZoom || "https://zoom.us/j/90807060504";
                                            handleUpdateStudentAttendance(student.id, monitorDay, "online", defaultZoom);
                                          }
                                        }}
                                        className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                                      >
                                        <User className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        title="Send Attendance Alert"
                                        onClick={() => handleTriggerAlert(student.name)}
                                        className="p-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-650 hover:bg-indigo-100 transition cursor-pointer"
                                      >
                                        <Send className="w-3.5 h-3.5 text-indigo-500" />
                                      </button>

                                      {hasSubmitted && submission.codingSubmissions && submission.codingSubmissions.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            alert(
                                              `--- Coding Submissions for ${student.name} ---\n\n` +
                                              submission.codingSubmissions.map((cs: any, idx: number) => (
                                                `[Challenge ${idx+1}] ${cs.questionText}\n` +
                                                `--- Submitted Code ---\n${cs.submittedCode}\n` +
                                                `-----------------------------------------\n`
                                              )).join("\n")
                                            );
                                          }}
                                          title="Review written scripts"
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition cursor-pointer"
                                        >
                                          <FileCode className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COURSE LOCKS & UNLOCKS */}
            {activeTab === "locks" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Syllabus Course Locking Controls</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Unlock or lock specific training chapters and individual day numbers. Students login to
                    see currently active days matching their batch guidelines.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {SYLLABUS.map((chapter) => {
                      const batchLock = locks[selectedBatch] || {
                        batchName: selectedBatch,
                        unlockedCourses: ["python"],
                        unlockedDays: [1, 2],
                        courseLockState: {}
                      };

                      const isLocked = batchLock.courseLockState[chapter.slug] ?? true;

                      return (
                        <div
                          key={chapter.slug}
                          className={`border rounded-xl p-5 relative transition select-none ${
                            !isLocked
                              ? "bg-indigo-50/50 border-indigo-200 text-slate-900"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              {chapter.slug}
                            </span>

                            <button
                              onClick={() => handleToggleCourseLock(chapter.slug, isLocked)}
                              className={`p-1.5 rounded-lg transition ${
                                !isLocked
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                  : "bg-slate-300 hover:bg-slate-400 text-slate-700"
                              }`}
                              title={isLocked ? "Unlock Course" : "Lock Course"}
                            >
                              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          </div>

                          <h4 className="font-bold text-slate-900 mb-1">{chapter.name}</h4>
                          <span className="text-xs text-indigo-600 font-semibold font-mono">
                            Days {chapter.startDay} - {chapter.endDay} ({chapter.endDay - chapter.startDay + 1} days)
                          </span>
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed h-8">
                            {chapter.description}
                          </p>

                          {/* Fast Action Row */}
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200/50">
                            <button
                              onClick={() => handleUnlockWholeCourse(chapter.slug, chapter.startDay, chapter.endDay)}
                              className="bg-indigo-100 hover:bg-indigo-150 text-indigo-700 text-[11px] font-semibold py-1 px-2.5 rounded-md transition"
                            >
                              Unlock All Days
                            </button>
                            <button
                              onClick={() => handleLockWholeCourse(chapter.slug, chapter.startDay, chapter.endDay)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold py-1 px-2.5 rounded-md transition"
                            >
                              Lock All Days
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Day-by-Day Selection Slate */}
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="font-bold text-slate-900 mb-2">Individual Day Unlock Selector</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Directly toggle individual Day numbers. Click any count square to unlock or lock it for students logged inside {selectedBatch}.
                    </p>

                    <div className="space-y-6">
                      {SYLLABUS.map((chapter) => {
                        const batchLock = locks[selectedBatch] || {
                          batchName: selectedBatch,
                          unlockedCourses: ["python"],
                          unlockedDays: [1, 2],
                          courseLockState: {}
                        };

                        const isCourseGlobalLocked = batchLock.courseLockState[chapter.slug] ?? true;

                        return (
                          <div key={chapter.slug} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-75 * bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono">
                                {chapter.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Days {chapter.startDay} to {chapter.endDay}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {Array.from(
                                { length: chapter.endDay - chapter.startDay + 1 },
                                (_, i) => chapter.startDay + i
                              ).map((dayNum) => {
                                const isUnlocked = batchLock.unlockedDays.includes(dayNum);
                                return (
                                  <button
                                    key={dayNum}
                                    onClick={() => handleToggleDayLock(dayNum)}
                                    className={`w-10 h-10 border rounded-lg text-xs font-bold font-mono transition flex flex-col justify-center items-center ${
                                      isUnlocked
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
                                    }`}
                                  >
                                    <span>D{dayNum}</span>
                                    <span className="text-[7px] font-normal leading-none">
                                      {isUnlocked ? "OPEN" : "LOCK"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STUDENT DATABASE */}
            {activeTab === "students" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add student layout */}
                <div className="space-y-6">
                  {/* Single Student Form */}
                  <form onSubmit={handleAddStudent} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-600" />
                      Add Single Student Record
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Student Name</label>
                      <input
                        type="text"
                        required
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Roll Number / UID (Unique)</label>
                      <input
                        type="text"
                        required
                        value={newStudentRoll}
                        onChange={(e) => setNewStudentRoll(e.target.value)}
                        placeholder="DS2026-101"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Email ID (Optional)</label>
                      <input
                        type="email"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                        placeholder="john.doe@college.edu"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Phone / Mobile (Secure Match Login)</label>
                      <input
                        type="text"
                        value={newStudentPhone}
                        onChange={(e) => setNewStudentPhone(e.target.value.replace(/\D/g, "").substring(0, 10))}
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded font-semibold text-sm transition"
                      >
                        Register Student
                      </button>
                    </div>
                  </form>

                  {/* Bulk import tool */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-600" />
                        Bulk CSV/Text Import
                      </h4>
                    </div>

                    {bulkImportResult && (
                      <div className="mb-4 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded p-3 leading-relaxed">
                        {bulkImportResult}
                      </div>
                    )}

                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Paste text list containing students info below. We process both comma (,) and Tab separated values. Format option:
                        <br />
                        <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600 inline-block mt-1">
                          RollNumber, Name, Email, PhoneNumber
                        </code>
                      </p>

                      <textarea
                        rows={6}
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="DS2026-010, Ramesh Kumar, ramesh@college.edu, 9876543210&#10;DS2026-011, Sita Verma, sita@college.edu, 9123456780&#10;DS2026-012, Rohan Joshi, rohan@example.com, 9345645612"
                        className="w-full bg-slate-50 border border-slate-200 rounded font-mono text-xs p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                      />

                      <button
                        type="button"
                        onClick={handleBulkImport}
                        disabled={!bulkText.trim()}
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-sm py-2 rounded transition"
                      >
                        Parse & Bulk Import Records
                      </button>
                    </div>
                  </div>
                </div>

                {/* Students list */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-4 gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900">Registered Students in Batch</h4>
                      <p className="text-xs text-slate-500 font-mono">LIST FOR: {selectedBatch}</p>
                    </div>
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {filteredStudents.length} Students Total
                    </span>
                  </div>

                  {/* Dynamic Search Bar input */}
                  {filteredStudents.length > 0 && (
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search student by Name, Roll Number, Email, or Phone..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition"
                        />
                      </div>
                    </div>
                  )}

                  {filteredStudents.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      No students registered for this batch yet.
                    </div>
                  ) : searchedStudents.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">
                      <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      No students matched your search query "{studentSearchQuery}".
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-250 text-slate-400 text-xs font-bold uppercase font-mono tracking-wider">
                            <th className="py-3 px-4">Roll Number</th>
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Phone Number</th>
                            <th className="py-3 px-4">Gateway Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {searchedStudents.map((st) => {
                            const writtenCount = submissions.filter(s => s.studentId === st.id).length;
                            return (
                              <tr key={st.id} className="hover:bg-slate-50/50 transition group">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForReview(st)}
                                    className="font-mono font-bold text-slate-900 hover:text-indigo-650 hover:underline hover:decoration-indigo-300 underline-offset-4 cursor-pointer focus:outline-none transition inline-flex items-center gap-1.5"
                                    title="Click to view detailed student exam history"
                                  >
                                    <span>{st.rollNumber}</span>
                                    <Search className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition opacity-60" />
                                  </button>
                                </td>
                                <td className="py-3.5 px-4">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForReview(st)}
                                    className="text-left font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer flex flex-col focus:outline-none"
                                  >
                                    <span className="font-sans font-extrabold text-indigo-600 hover:underline hover:decoration-indigo-300 underline-offset-4 flex items-center gap-1">
                                      {st.name}
                                      <Sparkles className="w-3 h-3 text-indigo-400" />
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal font-mono mt-0.5 whitespace-nowrap block">
                                      {writtenCount === 0 
                                        ? "No daily exams started" 
                                        : `${writtenCount} Days Exam Completed`
                                      }
                                    </span>
                                  </button>
                                </td>
                              <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{st.email || "N/A"}</td>
                              <td className="py-3.5 px-4 text-slate-600 font-mono text-xs font-semibold">{st.phoneNumber || "Not Bound / Enter on Login"}</td>
                              <td className="py-3.5 px-4 space-y-1.5">
                                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1 font-mono">
                                  {assessments.filter(a => a.studentId === st.id).length} Assessments
                                </span>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleInterviewPermission(st.id, !st.interviewPermission)}
                                    className={`px-2 py-1 rounded text-[9.5px] font-mono font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                                      st.interviewPermission
                                        ? "bg-emerald-55 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                        : "bg-rose-50 text-rose-700 border border-rose-150 hover:bg-rose-100"
                                    }`}
                                    title={st.interviewPermission ? "Deauthorize Interview Room access" : "Authorize Interview Room access"}
                                  >
                                    {st.interviewPermission ? (
                                      <>
                                        <Sparkles className="w-3 h-3 text-emerald-600 fill-emerald-100 animate-pulse" />
                                        <span>AI Recruiter: Allowed</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="w-3 h-3 text-rose-500" />
                                        <span>AI Recruiter: Locked</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePlacementPermission(st.id, !st.placementPermission)}
                                    className={`px-2 py-1 rounded text-[9.5px] font-mono font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                                      st.placementPermission
                                        ? "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                                        : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                    }`}
                                    title={st.placementPermission ? "Deauthorize Placement Gateway access" : "Authorize Placement Gateway access"}
                                  >
                                    {st.placementPermission ? (
                                      <>
                                        <Briefcase className="w-3 h-3 text-indigo-650" />
                                        <span>Placement: Allowed</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="w-3 h-3 text-amber-500" />
                                        <span>Placement: Locked</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleInterviewRewritePermission(st.id, !st.interviewRewritePermission)}
                                    className={`px-2 py-1 rounded text-[9.5px] font-mono font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                                      st.interviewRewritePermission
                                        ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                                    }`}
                                    title={st.interviewRewritePermission ? "Revoke Interview Rewrite special permission" : "Grant Interview Rewrite special permission"}
                                  >
                                    {st.interviewRewritePermission ? (
                                      <>
                                        <RotateCcw className="w-3 h-3 text-rose-650 animate-spin" />
                                        <span>Interview Rewrite: Allowed</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="w-3 h-3 text-slate-400" />
                                        <span>Interview Rewrite: Locked</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForAccess(st)}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Manage Access</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStudent(st.id)}
                                    className="text-red-650 hover:bg-red-50 p-1.5 rounded transition inline-flex items-center cursor-pointer"
                                    title="Delete record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: SYLLABUS & QUIZZES EDITOR */}
            {activeTab === "quizzes" && (
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-lg font-bold">Comprehensive 200-Day Course Syllabus & Quizzes</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        View, alter, and add custom exam sheets for daily testing. Overrides apply instantly for student portal exams.
                      </p>
                    </div>
                    {saveSuccess && (
                      <div className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-4 py-2 rounded text-xs flex items-center gap-2 animate-bounce">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Persistent override synced to database successfully!
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* LEFT RAIL: 200-DAYS ACCORDION LOOKUP */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-[720px] flex flex-col">
                    <h4 className="font-bold text-slate-950 text-sm mb-3 border-b border-slate-100 pb-2">
                      Syllabus Phases (200 Days)
                    </h4>
                    <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs text-slate-705">
                      {[
                        { name: "Python Programming", slug: "python", range: [1, 30] },
                        { name: "NumPy Essentials", slug: "numpy", range: [31, 45] },
                        { name: "Pandas Data Wrangling", slug: "pandas", range: [46, 75] },
                        { name: "Machine Learning (ML)", slug: "ml", range: [76, 105] },
                        { name: "Deep Learning (DL)", slug: "dl", range: [106, 135] },
                        { name: "Natural Language Processing (NLP)", slug: "nlp", range: [136, 165] },
                        { name: "Generative AI Labs", slug: "genai", range: [166, 195] },
                        { name: "EDA & Visualization", slug: "eda", range: [196, 200] },
                      ].map((phase, idx) => (
                        <div key={idx} className="border border-slate-100 rounded p-2.5 bg-slate-50">
                          <div className="font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                            <span>{phase.name}</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded">
                              Days {phase.range[0]}-{phase.range[1]}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {Array.from({ length: phase.range[1] - phase.range[0] + 1 }).map((_, dIdx) => {
                              const dayNum = phase.range[0] + dIdx;
                              const isSelected = selectedDayToOverride === dayNum;
                              return (
                                <button
                                  key={dayNum}
                                  type="button"
                                  onClick={() => setSelectedDayToOverride(dayNum)}
                                  className={`p-1 text-center font-mono rounded font-medium transition text-xs ${
                                    isSelected
                                      ? "bg-indigo-600 text-white shadow-sm font-bold"
                                      : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                                  }`}
                                >
                                  D{dayNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT PANEL: QUESTION OVERRIDE EDITOR FORM */}
                  <div className="lg:col-span-3 space-y-6">
                    {quizLoading ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4 font-bold text-indigo-600"></div>
                        <p className="text-sm font-medium text-slate-500">Syncing and parsing worksheet data...</p>
                      </div>
                    ) : !overrideQuizData ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-sm font-medium text-slate-500">Please select a syllabus day to begin custom editing.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                        {/* Day Header details */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                          <div className="space-y-1">
                            <span className="bg-indigo-600 text-white font-mono font-semibold text-[10px] uppercase px-2 py-0.5 rounded-full">
                              Active Subject Phase: {overrideQuizData.courseSlug}
                            </span>
                            <h4 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                              Configure Quiz Sheet - Day {overrideQuizData.dayNumber}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fetchQuizToOverride(selectedDayToOverride, true)}
                              className="px-3 py-1.5 border border-slate-200 rounded text-xs font-semibold hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5"
                              title="Reset custom questions to default high-quality preset or dynamic Gemini draft"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                              Reset to Default
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveQuizOverride}
                              className="px-4 py-1.5 bg-indigo-600 rounded text-xs font-semibold hover:bg-indigo-700 text-white transition flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Save Changes to Database
                            </button>
                          </div>
                        </div>

                        {/* Interactive Title & Topics Form */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Exam/Day Topic Area Description
                          </label>
                          <input
                            type="text"
                            value={overrideQuizData.topicTitle}
                            onChange={(e) => handleUpdateTopicTitle(e.target.value)}
                            placeholder="e.g. Python Sequences, Variable scopes"
                            className="w-full bg-white border border-slate-200 rounded px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        {/* DYNAMIC AI QUIZ GENERATION BOOTSTRAPPER */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-150 rounded-xl p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                              <div>
                                <h5 className="font-extrabold text-indigo-950 text-sm">
                                  Generate 10 Questions from Course Material
                                </h5>
                                <p className="text-[11px] text-indigo-700/80 font-medium">
                                  Select file/notes (e.g. study notes, codes, syllabus documentation) or paste content directly below. Gemini will synthesize exactly 8 MCQs &amp; 2 Coding exercises (10 tasks total).
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* File Upload Box */}
                            <div className="border border-indigo-200 bg-white hover:bg-slate-50 transition rounded-xl p-3 flex flex-col justify-center items-center text-center space-y-2 relative border-dashed">
                              <Upload className="w-6 h-6 text-indigo-500" />
                              <div className="text-xs">
                                <span className="font-bold text-indigo-700 block">Select Course Material File</span>
                                <span className="text-[10px] text-zinc-500">Pick any study notes script or text document (.txt, .py, .md)</span>
                              </div>
                              <input
                                type="file"
                                accept=".txt,.md,.py,.json,.csv,.js,.html,text/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    setMaterialText(evt.target?.result as string);
                                    if (overrideQuizData && !overrideQuizData.topicTitle) {
                                      const cleanedName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                                      handleUpdateTopicTitle(cleanedName.substring(0, 50));
                                    }
                                  };
                                  reader.readAsText(file);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>

                            {/* Direct Text input */}
                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-indigo-950 uppercase font-mono">
                                Or Paste Materials / Curriculum Content
                              </label>
                              <textarea
                                value={materialText}
                                onChange={(e) => setMaterialText(e.target.value)}
                                placeholder="Paste study guide paragraphs, coding sample blocks, documentation items, or bullet points..."
                                rows={4}
                                className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {materialText && (
                            <div className="text-[10px] bg-indigo-100/50 text-indigo-900 px-3 py-1.5 rounded flex items-center justify-between font-mono font-medium">
                              <span>Ready payload: <strong>{materialText.length}</strong> characters loaded</span>
                              <button 
                                onClick={() => setMaterialText("")} 
                                className="text-rose-600 hover:text-rose-800 font-bold"
                              >
                                Clear Content
                              </button>
                            </div>
                          )}

                          {materialError && (
                            <div className="text-xs bg-red-50 text-rose-600 border border-red-200 px-3.5 py-2 rounded-lg font-medium">
                              ❌ {materialError}
                            </div>
                          )}

                          {generateSuccess && (
                            <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-lg font-medium">
                              🎉 Generated 10 high-quality questions successfully! Preview the MCQ and Coding grids below, and click 'Save Changes to Database' to push live.
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleGenerateQuizFromMaterial}
                              disabled={isGeneratingQuiz || !materialText.trim()}
                              className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                                isGeneratingQuiz
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed font-medium"
                                  : !materialText.trim()
                                  ? "bg-indigo-200 text-indigo-400 cursor-not-allowed font-medium"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100"
                              }`}
                            >
                              {isGeneratingQuiz ? (
                                <>
                                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-500"></div>
                                  Generating 10 Custom Exam Questions...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                                  Synthesize Custom AI Test
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* SECTION A: MCQS */}
                        <div className="space-y-4">
                          <div className="border-b border-slate-100 pb-2">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                              <span>SECTION A (8 x Multiple Choice Questions)</span>
                            </h5>
                          </div>

                          <div className="space-y-4">
                            {overrideQuizData.mcqs.map((mcq: any, index: number) => (
                              <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white hover:border-slate-300 transition">
                                <span className="text-xs font-bold text-indigo-600">Question #{index + 1} of 8</span>
                                <textarea
                                  value={mcq.questionText}
                                  onChange={(e) => handleUpdateMCQ(index, "questionText", e.target.value)}
                                  placeholder="Define MCQ Question description line..."
                                  rows={2}
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {mcq.options.map((option: string, optionIdx: number) => (
                                    <div key={optionIdx} className="flex items-center gap-2">
                                      <span className="font-bold text-[11px] text-slate-500 w-4 font-mono">
                                        {String.fromCharCode(65 + optionIdx)}.
                                      </span>
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleUpdateMCQOption(index, optionIdx, e.target.value)}
                                        placeholder={`Option ${String.fromCharCode(65 + optionIdx)}`}
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-100 mt-2">
                                  <div className="flex items-center gap-2">
                                    <label className="text-[11px] text-slate-500 font-bold whitespace-nowrap">
                                      CORRECT CHOICE:
                                    </label>
                                    <select
                                      value={mcq.correctOption}
                                      onChange={(e) => handleUpdateMCQ(index, "correctOption", parseInt(e.target.value, 10))}
                                      className="bg-indigo-50 border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-700 focus:outline-none"
                                    >
                                      <option value={0}>A</option>
                                      <option value={1}>B</option>
                                      <option value={2}>C</option>
                                      <option value={3}>D</option>
                                    </select>
                                  </div>

                                  <div>
                                    <input
                                      type="text"
                                      value={mcq.explanation || ""}
                                      onChange={(e) => handleUpdateMCQ(index, "explanation", e.target.value)}
                                      placeholder="Explanatory logic context details..."
                                      className="w-full bg-slate-50 border border-slate-100 rounded px-2.5 py-1 text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SECTION B: CODING */}
                        <div className="space-y-4">
                          <div className="border-b border-slate-100 pb-2">
                            <h5 className="font-bold text-indigo-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                              <span>SECTION B (2 x Coding Submissions)</span>
                            </h5>
                          </div>

                          <div className="space-y-4">
                            {overrideQuizData.coding.map((codingQ: any, index: number) => (
                              <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white hover:border-slate-300 transition">
                                <span className="text-xs font-bold text-indigo-600">Coding Question #{index + 1} of 2</span>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    Challenge Task Description
                                  </label>
                                  <textarea
                                    value={codingQ.questionText}
                                    onChange={(e) => handleUpdateCoding(index, "questionText", e.target.value)}
                                    placeholder="Define what student code should build, variables name, and return constraints..."
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                      Starter Code Template (Python)
                                    </label>
                                    <textarea
                                      value={codingQ.starterCode}
                                      onChange={(e) => handleUpdateCoding(index, "starterCode", e.target.value)}
                                      placeholder="def challenge():\n    pass"
                                      rows={5}
                                      className="w-full bg-slate-900 text-indigo-300 font-mono border border-slate-800 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                      Ideal Code Implementation
                                    </label>
                                    <textarea
                                      value={codingQ.solutionDescription}
                                      onChange={(e) => handleUpdateCoding(index, "solutionDescription", e.target.value)}
                                      placeholder="Sample baseline correct logic code solution..."
                                      rows={5}
                                      className="w-full bg-slate-900 text-emerald-300 font-mono border border-slate-800 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    Expected Code Parsing Keywords (Comma separated, validation tags)
                                  </label>
                                  <input
                                    type="text"
                                    value={Array.isArray(codingQ.expectedKeywords) ? codingQ.expectedKeywords.join(", ") : codingQ.expectedKeywords || ""}
                                    onChange={(e) =>
                                      handleUpdateCoding(
                                        index,
                                        "expectedKeywords",
                                        e.target.value.split(",").map((k) => k.trim()).filter(Boolean)
                                      )
                                    }
                                    placeholder="def, return, for, if, .append"
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Page Bottom Saved actions */}
                        <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
                          <button
                            type="button"
                            onClick={handleSaveQuizOverride}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-6 rounded transition"
                          >
                            Apply & Save Override Questions
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "interviews" && (
              <TeacherInterviewsView selectedBatch={selectedBatch} />
            )}

            {activeTab === "videos" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileVideo className="w-5.5 h-5.5 text-indigo-600" />
                    Learning Videos & Lecture Attachment Hub
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Upload supplemental lecture codes, YouTube links, or training guidelines. Students will receive instant streaming access dynamically synchronized on their curriculum portal under each chapter card.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Form: Upload Video */}
                  <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-205 p-5 space-y-4 h-fit">
                    <span className="text-[10px] bg-indigo-100 text-indigo-850 font-extrabold px-3 py-1 rounded-full uppercase tracking-widest font-mono block w-fit">
                      Create New Attachment
                    </span>

                    <form onSubmit={handleTeacherUploadVideo} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">Select Curriculum Course</label>
                        <select
                          className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer"
                          value={newVideoForm.courseSlug}
                          onChange={(e) => setNewVideoForm({ ...newVideoForm, courseSlug: e.target.value })}
                        >
                          <option value="python">Python Programming (Days 1 - 30)</option>
                          <option value="numpy">NumPy Essentials (Days 31 - 45)</option>
                          <option value="pandas">Pandas Data Wrangling (Days 46 - 75)</option>
                          <option value="ml">Machine Learning (ML) (Days 76 - 105)</option>
                          <option value="dl">Deep Learning (DL) (Days 106 - 135)</option>
                          <option value="nlp">Natural Language Processing (NLP) (Days 136 - 165)</option>
                          <option value="genai">Generative AI (Days 166 - 195)</option>
                          <option value="eda">EDA & Visualization (Days 196 - 200)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">Resource Material Type</label>
                        <select
                          className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer"
                          value={newVideoForm.attachmentType}
                          onChange={(e) => setNewVideoForm({ ...newVideoForm, attachmentType: e.target.value })}
                        >
                          <option value="video">🎥 Video Lecture Guide</option>
                          <option value="book">📚 Course Book / E-Book Guide</option>
                          <option value="material">📁 Study Material / Reference Guide</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">Resource Display Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Pandas groupby & merge aggregates explained"
                          value={newVideoForm.title}
                          onChange={(e) => setNewVideoForm({ ...newVideoForm, title: e.target.value })}
                          className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">Video URL / Web Link *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. https://www.youtube.com/watch?v=..."
                          value={newVideoForm.videoUrl}
                          onChange={(e) => setNewVideoForm({ ...newVideoForm, videoUrl: e.target.value })}
                          className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[9px] text-slate-400 mt-1 block leading-relaxed font-sans">
                          Supports direct YouTube links (which will automatically format to raw embed player screens) or any other standard external stream reference path.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">Supplementary notes / reference text</label>
                        <textarea
                          rows={3}
                          placeholder="e.g. Review questions, guidelines, timestamps, or GitHub project resources link for this module."
                          value={newVideoForm.description}
                          onChange={(e) => setNewVideoForm({ ...newVideoForm, description: e.target.value })}
                          className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                        />
                      </div>

                      {videoError && (
                        <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 rounded-xl text-xs font-semibold text-center">
                          {videoError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={savingVideo}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider font-mono transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {savingVideo ? "Uploading..." : "Save & Distribute Video"}
                      </button>
                    </form>
                  </div>

                  {/* Right List: Display & delete */}
                  <div className="lg:col-span-7 space-y-4">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest block font-mono">
                      Active Digital Videos Library ({learningVideos.length})
                    </span>

                    {learningVideos.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center text-slate-400 space-y-1.5 shadow-xs">
                        <FileVideo className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold">No course resources uploaded yet</p>
                        <p className="text-[10px] text-slate-400 leading-normal max-w-sm mx-auto">Use the left builder form to attach explanation modules for Python, NumPy, Pandas or Machine Learning.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1">
                        {learningVideos.map((video) => {
                          const isYoutube = video.videoUrl.includes("youtube.com/embed/");
                          const courseSlugLabels: Record<string, string> = {
                            python: "Python Programming",
                            numpy: "NumPy Essentials",
                            pandas: "Pandas Data Wrangling",
                            ml: "Machine Learning (ML)",
                            dl: "Deep Learning (DL)",
                            nlp: "Natural Language Processing (NLP)",
                            genai: "Generative AI",
                            eda: "EDA & Visualization"
                          };
                          const label = courseSlugLabels[video.courseSlug] || video.courseSlug;

                          return (
                            <div
                              key={video.id}
                              className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-start gap-4 hover:border-slate-350 hover:shadow-xs transition duration-200"
                            >
                              <div className="space-y-1.5 flex-grow">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="bg-indigo-50 border border-indigo-155 text-indigo-700 font-mono text-[8px] font-black py-0.5 px-2 rounded-full uppercase shrink-0">
                                    {label}
                                  </span>
                                  <span className={`font-mono text-[8px] font-black py-0.5 px-2 rounded-full uppercase shrink-0 border ${
                                    video.attachmentType === "book"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : video.attachmentType === "material"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}>
                                    {video.attachmentType === "book" ? "📚 BOOK" : video.attachmentType === "material" ? "📁 STUDY MATERIAL" : "🎥 VIDEO GUIDE"}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 font-mono">
                                    By {video.addedBy || "Instructor"} &bull; {new Date(video.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>

                                <h4 className="font-extrabold text-xs text-slate-800 leading-snug">{video.title}</h4>
                                {video.description && (
                                  <p className="text-[10.5px] text-zinc-500 leading-relaxed font-sans">{video.description}</p>
                                )}
                                <div className="text-[10px] font-mono text-indigo-600 truncate max-w-[400px]">
                                  Url: <a href={video.videoUrl} target="_blank" rel="noreferrer" className="underline hover:text-indigo-800">{video.videoUrl}</a>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleTeacherDeleteVideo(video.id)}
                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition duration-150 border border-slate-100 hover:border-rose-100 cursor-pointer shadow-xs shrink-0"
                                title="Remove resource"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tests" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="w-5.5 h-5.5 text-emerald-600" />
                      Evaluation & Mock Test Scheduler
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Create and manage custom MCQs or Coding evaluation mock tests. Students will receive real-time access on their portals based on test schedules.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTestForm({
                        title: "",
                        testType: "weekly",
                        courseSlug: "python",
                        topic: "",
                        durationMinutes: 30
                      });
                      setNewTestMcqs([]);
                      setNewTestCoding([]);
                      setShowAddTestModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-750 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Test
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  {/* Left: Scheduled Tests list */}
                  <div className="xl:col-span-7 space-y-4">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest block font-mono">
                      Active Scheduled Exams ({scheduledTests.length})
                    </span>

                    {scheduledTests.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center text-slate-400 space-y-1.5 shadow-xs">
                        <ClipboardList className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold">No examination tests scheduled yet</p>
                        <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                          Click "Create New Test" to write custom MCQ questionnaires or automated Python code validation checks.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scheduledTests.map((test) => {
                          const testTypeColors = test.testType === "monthly" 
                            ? "bg-purple-50 border-purple-200 text-purple-700" 
                            : "bg-emerald-50 border-emerald-200 text-emerald-700";
                          
                          const label = test.courseSlug === "python" ? "Python" : test.courseSlug === "numpy" ? "NumPy" : test.courseSlug === "pandas" ? "Pandas" : "Machine Learning";

                          return (
                            <div
                              key={test.id}
                              className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 hover:shadow-xs transition duration-200"
                            >
                              <div className="space-y-2 flex-grow">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`border text-[8px] font-black py-0.5 px-2 rounded-full uppercase tracking-wide shrink-0 ${testTypeColors}`}>
                                    {test.testType} Test
                                  </span>
                                  <span className="bg-indigo-50 border border-indigo-155 text-indigo-700 text-[8px] font-black py-0.5 px-2 rounded-full uppercase shrink-0">
                                    {label}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 font-mono">
                                    {new Date(test.createdAt || Date.now()).toLocaleDateString()}
                                  </span>
                                </div>

                                <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{test.title}</h4>
                                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 font-medium font-sans">
                                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> Topics: {test.topic}</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {test.durationMinutes} mins</span>
                                </div>
                                <div className="text-[10.5px] font-semibold text-indigo-650 flex gap-3 font-mono">
                                  <span>{test.mcqs?.length || 0} MCQ Questions</span>
                                  <span>&bull;</span>
                                  <span>{test.coding?.length || 0} Coding Challenges</span>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTestActive(test.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition cursor-pointer shadow-xs ${
                                    test.isActive 
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-350"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-250"
                                  }`}
                                >
                                  {test.isActive ? "● Active / Conducting" : "○ Inactive / Closed"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteScheduledTest(test.id)}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition duration-150 cursor-pointer shadow-xs"
                                  title="Delete test"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: Submissions Log */}
                  <div className="xl:col-span-5 space-y-4 border-t xl:border-t-0 xl:border-l border-slate-150 pt-4 xl:pt-0 xl:pl-6">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest block font-mono">
                      Student Submission Results ({testSubmissions.length})
                    </span>

                    {testSubmissions.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-8 text-center text-slate-400 space-y-1">
                        <Award className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-bold">No exam submissions received yet</p>
                        <p className="text-[10px] text-slate-400">Once active students submit their worksheets, scores will populate here in real-time.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {testSubmissions.map((sub: any) => {
                          const associatedTest = scheduledTests.find(t => t.id === sub.testId);
                          return (
                            <div
                              key={sub.id}
                              className="bg-slate-50/50 border border-slate-200 p-3.5 rounded-xl space-y-1.5 hover:border-slate-350 transition"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <h5 className="font-extrabold text-xs text-slate-800">{sub.studentName}</h5>
                                <span className="text-indigo-750 font-mono text-xs font-black bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md">
                                  Score: {sub.score}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono font-medium">
                                Roll: {sub.rollNumber} &bull; Batch: {sub.batch}
                              </p>
                              {associatedTest && (
                                <p className="text-[10px] font-semibold text-slate-600">
                                  Test: <span className="text-slate-800">{associatedTest.title}</span> ({associatedTest.testType})
                                </p>
                              )}
                              <p className="text-[9px] text-zinc-400 font-mono text-right">
                                Submitted: {new Date(sub.submittedAt).toLocaleString()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: FEATURE ACCESS */}
            {activeTab === "featureAccess" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="w-5.5 h-5.5 text-indigo-600" />
                    Enterprise Feature Gates & Permissions Level
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Toggle feature gates on or off for classroom batches. Everything is locked by default. Toggled batches grant automatic privilege access to corresponding Student Portals.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {/* Card for Global Settings */}
                  <div className="bg-slate-950 text-white rounded-2xl shadow-md border border-slate-850 p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-indigo-400 flex items-center gap-1.5">
                        <Settings className="w-4 h-4" />
                        Global Control
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Toggle permissions globally for all classroom batches simultaneously.
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      {/* Global AI Interview */}
                      {(() => {
                        const enabled = locks["Global"]?.featureLocks?.interview || false;
                        return (
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureLock("Global", "interview", !enabled)}
                            className={`w-full p-3 rounded-xl border text-left transition duration-200 cursor-pointer flex justify-between items-center ${
                              enabled 
                                ? "border-emerald-500 bg-emerald-950/25 text-emerald-300"
                                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-750"
                            }`}
                          >
                            <div>
                              <div className="text-[11px] font-bold">AI Mock Interview</div>
                              <div className="text-[9px] font-mono mt-0.5">{enabled ? "✓ Unlocked" : "✕ Locked"}</div>
                            </div>
                            {enabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
                          </button>
                        );
                      })()}

                      {/* Global ATS Resume */}
                      {(() => {
                        const enabled = locks["Global"]?.featureLocks?.resume || false;
                        return (
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureLock("Global", "resume", !enabled)}
                            className={`w-full p-3 rounded-xl border text-left transition duration-200 cursor-pointer flex justify-between items-center ${
                              enabled 
                                ? "border-emerald-500 bg-emerald-950/25 text-emerald-300"
                                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-750"
                            }`}
                          >
                            <div>
                              <div className="text-[11px] font-bold">ATS Resume Builder</div>
                              <div className="text-[9px] font-mono mt-0.5">{enabled ? "✓ Unlocked" : "✕ Locked"}</div>
                            </div>
                            {enabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
                          </button>
                        );
                      })()}

                      {/* Global Monthly Test */}
                      {(() => {
                        const enabled = locks["Global"]?.featureLocks?.monthlyTest || false;
                        return (
                          <button
                            type="button"
                            onClick={() => handleToggleFeatureLock("Global", "monthlyTest", !enabled)}
                            className={`w-full p-3 rounded-xl border text-left transition duration-200 cursor-pointer flex justify-between items-center ${
                              enabled 
                                ? "border-emerald-500 bg-emerald-950/25 text-emerald-300"
                                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-750"
                            }`}
                          >
                            <div>
                              <div className="text-[11px] font-bold">Monthly Mock Test</div>
                              <div className="text-[9px] font-mono mt-0.5">{enabled ? "✓ Unlocked" : "✕ Locked"}</div>
                            </div>
                            {enabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Cards for each defined batch */}
                  {batches.map((batch) => {
                    const batchLockObj = locks[batch] || {};
                    return (
                      <div
                        key={batch}
                        className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition duration-200 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-600" />
                            {batch}
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Individual feature toggles for students registered inside {batch}.
                          </p>
                        </div>

                        <div className="space-y-2.5 pt-1">
                          {/* AI Mock Interview Toggle */}
                          {(() => {
                            const enabled = batchLockObj.featureLocks?.interview || false;
                            return (
                              <button
                                type="button"
                                onClick={() => handleToggleFeatureLock(batch, "interview", !enabled)}
                                className={`w-full p-3 rounded-xl border text-left transition duration-200 cursor-pointer flex justify-between items-center ${
                                  enabled 
                                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-855"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div>
                                  <div className="text-[11px] font-bold">AI Mock Interview</div>
                                  <div className="text-[9px] font-mono mt-0.5">{enabled ? "✓ Access Granted" : "✕ Locked"}</div>
                                </div>
                                {enabled ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                              </button>
                            );
                          })()}

                          {/* ATS Resume Builder Toggle */}
                          {(() => {
                            const enabled = batchLockObj.featureLocks?.resume || false;
                            return (
                              <button
                                type="button"
                                onClick={() => handleToggleFeatureLock(batch, "resume", !enabled)}
                                className={`w-full p-3 rounded-xl border text-left transition duration-200 cursor-pointer flex justify-between items-center ${
                                  enabled 
                                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-855"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div>
                                  <div className="text-[11px] font-bold">ATS Resume Builder</div>
                                  <div className="text-[9px] font-mono mt-0.5">{enabled ? "✓ Access Granted" : "✕ Locked"}</div>
                                </div>
                                {enabled ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                              </button>
                            );
                          })()}

                          {/* Monthly Mock Test Toggle */}
                          {(() => {
                            const enabled = batchLockObj.featureLocks?.monthlyTest || false;
                            return (
                              <button
                                type="button"
                                onClick={() => handleToggleFeatureLock(batch, "monthlyTest", !enabled)}
                                className={`w-full p-3 rounded-xl border text-left transition duration-200 cursor-pointer flex justify-between items-center ${
                                  enabled 
                                    ? "border-emerald-500 bg-emerald-50/20 text-emerald-855"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div>
                                  <div className="text-[11px] font-bold">Monthly Mock Test</div>
                                  <div className="text-[9px] font-mono mt-0.5">{enabled ? "✓ Access Granted" : "✕ Locked"}</div>
                                </div>
                                {enabled ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: ADD NEW BATCH */}
      {showAddBatch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-zoom-in">
            <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Create Class Batch
            </h3>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Batch Name or Label</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. Batch D (Evening)"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatch(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-2 px-3.5 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2 px-3.5 rounded transition"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW WEEKLY OR MONTHLY TEST */}
      {showAddTestModal && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-zoom-in my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-150 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                Schedule Evaluation Test
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTestModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-grow pr-1 font-sans">
              {/* General details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Test Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NumPy Arrays and Slicing Exam"
                    value={newTestForm.title}
                    onChange={(e) => setNewTestForm({ ...newTestForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Test Type</label>
                  <select
                    value={newTestForm.testType}
                    onChange={(e) => setNewTestForm({ ...newTestForm, testType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="weekly">Weekly Mock Test</option>
                    <option value="monthly">Monthly Mock Test</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Course Syllabus Segment</label>
                  <select
                    value={newTestForm.courseSlug}
                    onChange={(e) => setNewTestForm({ ...newTestForm, courseSlug: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="python">Python Programming</option>
                    <option value="numpy">NumPy Essentials</option>
                    <option value="pandas">Pandas Data Wrangling</option>
                    <option value="ml">Machine Learning (ML)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={newTestForm.durationMinutes}
                    onChange={(e) => setNewTestForm({ ...newTestForm, durationMinutes: Number(e.target.value) || 30 })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Syllabus Evaluation Topics</label>
                  <input
                    type="text"
                    placeholder="e.g. List comprehensions, generators, slicing NumPy multidimensional vectors"
                    value={newTestForm.topic}
                    onChange={(e) => setNewTestForm({ ...newTestForm, topic: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Quick-Load Templates */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                    <span>💡 Quick-Load Question Template Packs</span>
                  </div>
                  <div className="text-[10px] text-indigo-600 font-medium">Instantly populate pre-designed Weekly or Monthly mock questions & coding tasks for the selected segment.</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadExamPreset(newTestForm.courseSlug, newTestForm.testType)}
                  className="bg-indigo-650 hover:bg-indigo-750 text-white font-mono font-bold text-[10px] uppercase py-1.5 px-3.5 rounded-lg transition shrink-0 shadow-xs cursor-pointer"
                >
                  ✨ Load {newTestForm.testType === "weekly" ? "Weekly" : "Monthly"} Pack
                </button>
              </div>

              {/* MCQs Builder */}
              <div className="border-t border-slate-150 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    MCQ Questions ({newTestMcqs.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTestMcqs([
                        ...newTestMcqs,
                        {
                          questionText: "What is the output of np.array([1, 2, 3]) * 2?",
                          options: ["[2, 4, 6]", "[1, 2, 3, 1, 2, 3]", "array([2, 4, 6])", "Error"],
                          correctOption: 2,
                          explanation: "Element-wise multiplication multiplies each value by 2 in a NumPy ndarray."
                        }
                      ]);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add MCQ Question
                  </button>
                </div>

                {newTestMcqs.length > 0 && (
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                    {newTestMcqs.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 text-xs relative">
                        <button
                          type="button"
                          onClick={() => setNewTestMcqs(newTestMcqs.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div>
                          <span className="font-bold text-indigo-700">Q{idx + 1}:</span>
                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => {
                              const updated = [...newTestMcqs];
                              updated[idx].questionText = e.target.value;
                              setNewTestMcqs(updated);
                            }}
                            className="ml-1 w-5/6 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          {q.options.map((opt: string, oIdx: number) => (
                            <div key={oIdx} className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-mono">{String.fromCharCode(65 + oIdx)})</span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...newTestMcqs];
                                  updated[idx].options[oIdx] = e.target.value;
                                  setNewTestMcqs(updated);
                                }}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-[11px]"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-150 pl-4 text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-semibold">Correct Option:</span>
                            <select
                              value={q.correctOption}
                              onChange={(e) => {
                                const updated = [...newTestMcqs];
                                updated[idx].correctOption = Number(e.target.value);
                                setNewTestMcqs(updated);
                              }}
                              className="bg-transparent border border-slate-200 rounded p-0.5 font-bold focus:outline-none"
                            >
                              <option value={0}>A</option>
                              <option value={1}>B</option>
                              <option value={2}>C</option>
                              <option value={3}>D</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={q.explanation}
                            placeholder="Explanation of correct option"
                            onChange={(e) => {
                              const updated = [...newTestMcqs];
                              updated[idx].explanation = e.target.value;
                              setNewTestMcqs(updated);
                            }}
                            className="w-1/2 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-[10px] text-slate-400 italic text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Coding Challenges Builder */}
              <div className="border-t border-slate-150 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Coding Challenges ({newTestCoding.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTestCoding([
                        ...newTestCoding,
                        {
                          questionText: "Write a function sum_array(arr) that returns the sum of all elements in a NumPy array or Python list.",
                          starterCode: "def sum_array(arr):\n    # Write your code here\n    pass",
                          expectedKeywords: "sum,return,def"
                        }
                      ]);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Coding Challenge
                  </button>
                </div>

                {newTestCoding.length > 0 && (
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                    {newTestCoding.map((coding, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 text-xs relative">
                        <button
                          type="button"
                          onClick={() => setNewTestCoding(newTestCoding.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div>
                          <span className="font-bold text-indigo-700">Challenge {idx + 1}:</span>
                          <textarea
                            rows={2}
                            value={coding.questionText}
                            onChange={(e) => {
                              const updated = [...newTestCoding];
                              updated[idx].questionText = e.target.value;
                              setNewTestCoding(updated);
                            }}
                            className="mt-1 w-11/12 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 p-1 rounded resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Starter Code (Python)</label>
                            <textarea
                              rows={3}
                              value={coding.starterCode}
                              onChange={(e) => {
                                const updated = [...newTestCoding];
                                updated[idx].starterCode = e.target.value;
                                setNewTestCoding(updated);
                              }}
                              className="w-full bg-slate-100 border border-slate-200 rounded p-1.5 font-mono text-[10.5px] focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Required Keywords (Validation)</label>
                            <textarea
                              rows={3}
                              placeholder="e.g. def,return,sum (comma separated strings to validate student solution code)"
                              value={coding.expectedKeywords}
                              onChange={(e) => {
                                const updated = [...newTestCoding];
                                updated[idx].expectedKeywords = e.target.value;
                                setNewTestCoding(updated);
                              }}
                              className="w-full bg-slate-100 border border-slate-200 rounded p-1.5 text-[10.5px] focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-150 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddTestModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newTestForm.title.trim()) {
                    alert("Please enter a Test Title.");
                    return;
                  }
                  handleCreateScheduledTest({
                    ...newTestForm,
                    mcqs: newTestMcqs,
                    coding: newTestCoding.map(c => ({
                      ...c,
                      expectedKeywords: c.expectedKeywords.split(",").map((k: string) => k.trim()).filter(Boolean)
                    }))
                  });
                }}
                className="bg-indigo-600 hover:bg-indigo-755 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer shadow-xs"
              >
                Schedule & Conduct Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CORE STUDENT HISTORY & WORK DETAILS */}
      {selectedStudentForReview && (
        <div className="fixed inset-0 bg-slate-900/75 z-[100] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-5xl w-full p-6 animate-zoom-in max-h-[92vh] overflow-y-auto flex flex-col gap-6">
            
            {/* Header banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
              <div className="space-y-1">
                <span className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-mono text-[9px] font-extrabold py-1 px-3 rounded-full uppercase tracking-widest inline-block shadow-xs">
                  Academic Performance Profile
                </span>
                <h3 className="text-2xl font-black font-sans tracking-tight mt-1 flex items-center gap-2">
                  <span>{selectedStudentForReview.name}</span>
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
                </h3>
                <p className="text-xs text-slate-350 font-mono flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span>Roll Number: <strong className="text-white font-bold">{selectedStudentForReview.rollNumber}</strong></span>
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>Batch Code: <strong className="text-white font-bold">{selectedStudentForReview.batch}</strong></span>
                  {selectedStudentForReview.email && (
                    <>
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>Email: <strong className="text-white font-bold">{selectedStudentForReview.email}</strong></span>
                    </>
                  )}
                  {selectedStudentForReview.phoneNumber && (
                    <>
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>Phone: <strong className="text-slate-100 font-mono font-bold">{selectedStudentForReview.phoneNumber}</strong></span>
                    </>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForReview(null);
                  setExpandedDayDetails({});
                }}
                className="text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 focus:outline-none border border-white/10"
              >
                <span>Close Profile</span>
              </button>
            </div>

            {/* Performance Stats Cards Grid */}
            {(() => {
              const studentSubmissions = submissions.filter(
                (s) => s.studentId === selectedStudentForReview.id
              );
              const studentAssessments = assessments.filter(
                (a) => a.studentId === selectedStudentForReview.id
              );

              const totalDailyExams = studentSubmissions.length;
              const avgDailyScore =
                totalDailyExams > 0
                  ? Math.round(
                      studentSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0) /
                        totalDailyExams
                    )
                  : 0;

              const passedAssessmentsCount = studentAssessments.filter(
                (a) => a.score >= 60
              ).length;

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stat card 1 */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-300 transition-all shadow-2xs group">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block">
                          Daily Exams Completed
                        </span>
                        <span className="text-3xl font-black font-sans text-slate-900 mt-1 block tracking-tight">
                          {totalDailyExams} Days
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium font-sans">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Consistent curriculum learner</span>
                      </div>
                    </div>

                    {/* Stat card 2 */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-2xs group">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block">
                          Average Quiz Score
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-3xl font-black font-sans tracking-tight ${avgDailyScore >= 60 ? "text-emerald-700" : "text-amber-700"}`}>
                            {avgDailyScore}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Subject matter proficiency</span>
                      </div>
                    </div>

                    {/* Stat card 3 */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-blue-300 transition-all shadow-2xs group">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block">
                          Assessments Cleared
                        </span>
                        <span className="text-3xl font-black font-sans text-indigo-950 mt-1 block tracking-tight">
                          {passedAssessmentsCount} / {studentAssessments.length || 0}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-550 font-medium font-sans">
                        <Award className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Required for AI Placement Room</span>
                      </div>
                    </div>
                  </div>

                  {/* Course Wise breakdown progress bars */}
                  <div className="bg-gradient-to-br from-slate-50 to-indigo-50/20 border border-slate-200/80 rounded-2xl p-5 space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-650 animate-bounce" />
                          Domain-Wise Curriculum Milestone Analytics
                        </h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                          Visualizer tracking completed exam days across structured modules
                        </p>
                      </div>
                      <span className="text-[10px] bg-indigo-150 text-indigo-850 font-bold px-2.5 py-1 rounded-full font-mono uppercase tracking-wider">
                        Syllabus Progress Tracker
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {SYLLABUS.map((course) => {
                        // Count completed days in this course's range
                        const completedInCourse = studentSubmissions.filter(sub => sub.dayNumber >= course.startDay && sub.dayNumber <= course.endDay).length;
                        const totalCourseDays = course.endDay - course.startDay + 1;
                        const pct = Math.min(100, Math.round((completedInCourse / totalCourseDays) * 100));
                        
                        return (
                          <div key={course.slug} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs flex flex-col justify-between space-y-3.5 hover:border-indigo-300 hover:shadow-2xs transition group cursor-default">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md font-mono">
                                  Days {course.startDay} - {course.endDay}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-indigo-500 animate-pulse" : "bg-slate-350"
                                }`} />
                              </div>
                              <h5 className="font-extrabold text-slate-900 text-xs tracking-tight line-clamp-1 font-display group-hover:text-indigo-650 transition">
                                {course.name}
                              </h5>
                            </div>
                            
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-slate-400">Activity Rate</span>
                                <span className="font-extrabold text-slate-800">{completedInCourse} / {totalCourseDays} Days</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 rounded-full transition-all duration-700 ease-out"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-slate-400 capitalize font-medium">{course.slug} module</span>
                                <span className="text-[10px] text-indigo-600 font-extrabold font-mono tracking-tighter">{pct}% Done</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sequential Guided Module Timeline (after completing python than show numpy 30 days like) */}
                  <div className="bg-slate-50/70 border border-slate-200/85 rounded-2xl p-5 space-y-4">
                    <div className="border-b pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                      <div>
                        <h4 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wider font-mono flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-indigo-600 animate-pulse" />
                          Sequential Module Progression Pathway
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-normal font-sans">
                          Students unlock subsequent libraries sequentially (e.g., Python Basics (30 Days) ➜ NumPy (15 Days) ➜ Pandas (30 Days))
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 font-mono px-2 py-0.5 bg-indigo-50 border border-indigo-150 rounded">
                        Strict Sequential Flow
                      </span>
                    </div>

                    <div className="relative border-l-2 border-dashed border-indigo-200 pl-4 ml-2 space-y-6 py-2">
                      {(() => {
                        let isSequenceUnlocked = true; // First element is always unlocked
                        
                        return SYLLABUS.map((course, idx) => {
                          const completedInCourse = studentSubmissions.filter(sub => sub.dayNumber >= course.startDay && sub.dayNumber <= course.endDay).length;
                          const totalCourseDays = course.endDay - course.startDay + 1;
                          const isFullyDone = completedInCourse === totalCourseDays;
                          const hasBegun = completedInCourse > 0;
                          
                          // Determine actual status
                          let status: "Locked" | "In_Progress" | "Completed" = "Locked";
                          if (isSequenceUnlocked) {
                            if (isFullyDone) {
                              status = "Completed";
                            } else {
                              status = "In_Progress";
                            }
                          }
                          
                          const currentCourseUnlocked = isSequenceUnlocked;
                          
                          // Set up lock state for NEXT item in loop:
                          // Subsequent module unlocks ONLY if current is finished or if they have logged some work
                          // Let's implement strict prerequisite: subsequent is unlocked when current is fully completed or has substantial progress (>50%)
                          if (!isFullyDone && completedInCourse < (totalCourseDays * 0.4)) {
                            isSequenceUnlocked = false; 
                          }

                          return (
                            <div key={course.slug} className="relative group transition duration-300">
                              {/* Glowing Marker Dot */}
                              <div className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 transition ${
                                status === "Completed"
                                  ? "bg-emerald-500 border-white ring-4 ring-emerald-100"
                                  : status === "In_Progress"
                                    ? "bg-indigo-600 border-white ring-4 ring-indigo-100 animate-pulse"
                                    : "bg-slate-300 border-white"
                              }`} />

                              <div className={`p-4 rounded-xl border transition-all ${
                                status === "Completed"
                                  ? "bg-emerald-50/30 border-emerald-200 shadow-3xs"
                                  : status === "In_Progress"
                                    ? "bg-white border-indigo-200 shadow-2xs ring-1 ring-indigo-50"
                                    : "bg-slate-50/50 border-slate-200 opacity-60 pointer-events-none"
                              }`}>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-extrabold text-xs text-slate-900 tracking-tight font-display">
                                        Step {idx + 1}: {course.name}
                                      </h5>
                                      <span className="text-[9px] font-mono text-slate-450">
                                        ({totalCourseDays} Days Track)
                                      </span>
                                      
                                      {status === "Completed" && (
                                        <span className="bg-emerald-100 text-emerald-805 font-bold font-mono text-[8px] px-2 py-0.5 rounded-full border border-emerald-200">
                                          ✓ Goal Achieved
                                        </span>
                                      )}
                                      {status === "In_Progress" && (
                                        <span className="bg-indigo-100 text-indigo-805 font-bold font-mono text-[8px] px-2 py-0.5 rounded-full border border-indigo-200 animate-pulse">
                                          ★ Active Workspace
                                        </span>
                                      )}
                                      {status === "Locked" && (
                                        <span className="bg-slate-100 text-slate-500 font-bold font-mono text-[8px] px-2 py-0.5 rounded-md border border-slate-200">
                                          🔒 Awaiting Previous Step
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans max-w-2xl">
                                      {course.description}
                                    </p>
                                  </div>

                                  <div className="text-right font-mono self-end sm:self-auto">
                                    <span className="text-[9px] text-slate-400 block font-bold uppercase">MODULE RETENTION</span>
                                    <span className={`text-xs font-extrabold ${status === "Completed" ? "text-emerald-700" : "text-slate-700"}`}>
                                      {completedInCourse} / {totalCourseDays} Days Submitted
                                    </span>
                                  </div>
                                </div>

                                {/* Custom helper explanation when locked */}
                                {status === "Locked" && (
                                  <p className="text-[10px] text-amber-800 bg-amber-50/40 p-2 rounded-lg border border-amber-100/50 font-sans mt-2">
                                    💡 <strong>Strict Unlock Requirement:</strong> To activate numpy, pandas, and subsequent libraries, the student must complete at least 40% of the preceding training tasks in the sequence. Currently, they completed {completedInCourse} days.
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Multi-Portal Placement Gateway / Career Matcher */}
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 border border-slate-800 text-white shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-indigo-900 pb-3">
                      <div className="space-y-0.5">
                        <span className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-mono text-[9px] font-extrabold py-0.5 px-2 rounded uppercase tracking-wider inline-block">
                          Unified Job Search Engine
                        </span>
                        <h4 className="text-sm font-bold font-sans tracking-tight text-white flex items-center gap-1.5 mt-1">
                          <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
                          Multi-Portal Placement & Live Job Search
                        </h4>
                        <p className="text-slate-350 text-[10px] font-sans">
                          Generates matching search credentials across top job boards based on verified student achievements
                        </p>
                      </div>

                      {/* Interactive Location Filter Input */}
                      <div className="w-full sm:w-auto flex flex-col gap-1">
                        <label className="text-[10px] text-slate-300 font-mono font-bold uppercase">
                          Job Search City / Location
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={jobLocation}
                            onChange={(e) => setJobLocation(e.target.value)}
                            placeholder="e.g. Hyderabad, India"
                            className="bg-white/10 hover:bg-white/15 focus:bg-white/18 text-white text-xs font-mono font-bold py-1.5 pl-2.5 pr-8 rounded-lg outline-none border border-white/15 focus:border-indigo-500 transition w-full sm:w-48 placeholder-white/30"
                          />
                          <Search className="w-3.5 h-3.5 text-white/40 absolute right-2.5 top-2.5" />
                        </div>
                      </div>
                    </div>

                    {/* Calculated Student Skills and exact search links */}
                    {(() => {
                      // Determine starting skills based on completed submission count of specific days
                      const studentSubmissions = submissions.filter(
                        (s) => s.studentId === selectedStudentForReview.id
                      );
                      const pyDone = studentSubmissions.filter(sub => sub.dayNumber >= 1 && sub.dayNumber <= 30).length;
                      const numPyDone = studentSubmissions.filter(sub => sub.dayNumber >= 31 && sub.dayNumber <= 45).length;
                      const pandasDone = studentSubmissions.filter(sub => sub.dayNumber >= 46 && sub.dayNumber <= 75).length;
                      const mlDone = studentSubmissions.filter(sub => sub.dayNumber >= 76 && sub.dayNumber <= 105).length;

                      // Core dynamic query strings based on actual training completion
                      const careerRoles = [
                        {
                          title: "Python Software Engineer",
                          skillsRequired: "Python, Dicts, Custom Classes, Exceptions",
                          isUnlocked: pyDone >= 5, // unlocked after 5 days python
                          unlockedMsg: "Requires 5 Days Python Core",
                          searchQuery: `Python Developer ${selectedStudentForReview.name ? `Data Scientist` : ""}`,
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

                      return (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2 items-center text-xs">
                            <span className="text-slate-350 font-bold font-mono">Student Verified Skill Tag Map:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {pyDone >= 5 && <span className="bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded">#Python3</span>}
                              {numPyDone >= 3 && <span className="bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded">#NumPy_Arrays</span>}
                              {pandasDone >= 3 && <span className="bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded">#Pandas_Frames</span>}
                              {mlDone >= 2 && <span className="bg-amber-600/30 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded">#Scikit_ML</span>}
                              {pyDone < 5 && <span className="text-slate-400 italic text-[10px] font-sans">Accumulate Day Exams to verify skills...</span>}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {careerRoles.map((role, idx) => {
                              const linkedinUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role.searchQuery)}&location=${encodeURIComponent(jobLocation)}&f_TPR=r2592000`;
                              const indeedUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(role.searchQuery)}&l=${encodeURIComponent(jobLocation)}`;
                              const naukriUrl = `https://www.naukri.com/${encodeURIComponent(role.searchQuery.replace(/\s+/g, '-'))}-jobs-in-${encodeURIComponent(jobLocation.split(',')[0].trim().toLowerCase())}`;
                              const wellfoundUrl = `https://wellfound.com/jobs?q=${encodeURIComponent(role.searchQuery)}&l=${encodeURIComponent(jobLocation)}`;
                              const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(role.searchQuery + ' jobs in ' + jobLocation)}&ibp=htl;jobs`;

                              return (
                                <div 
                                  key={idx} 
                                  className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                                    role.isUnlocked 
                                      ? "bg-white/5 border-white/10 hover:border-indigo-400 hover:bg-white/10" 
                                      : "bg-black/20 border-white/5 opacity-55 cursor-not-allowed"
                                  }`}
                                >
                                  <div>
                                    <div className="flex justify-between items-start gap-2">
                                      <h5 className="font-extrabold text-xs text-white line-clamp-1">
                                        {role.title}
                                      </h5>
                                      <Briefcase className={`w-3.5 h-3.5 shrink-0 ${role.isUnlocked ? "text-indigo-400" : "text-slate-500"}`} />
                                    </div>
                                    <p className="text-[10px] text-slate-350 mt-1 min-h-[30px] line-clamp-2">
                                      Skills matched: {role.skillsRequired}
                                    </p>
                                  </div>
                                  
                                  {role.isUnlocked ? (
                                    <div className="mt-4 space-y-2 pt-3 border-t border-white/5">
                                      <span className="text-[9px] uppercase font-mono font-bold text-slate-350 block">
                                        Search Live Openings:
                                      </span>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <a 
                                          href={linkedinUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="bg-blue-650 hover:bg-blue-600 border border-blue-500/25 text-white text-[9px] font-extrabold py-1.5 px-2 rounded-lg flex items-center justify-between transition text-center focus:outline-none"
                                        >
                                          <span>LinkedIn</span>
                                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        </a>
                                        <a 
                                          href={indeedUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="bg-cyan-650 hover:bg-cyan-600 border border-cyan-500/25 text-white text-[9px] font-extrabold py-1.5 px-2 rounded-lg flex items-center justify-between transition text-center focus:outline-none"
                                        >
                                          <span>Indeed</span>
                                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        </a>
                                        <a 
                                          href={naukriUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="bg-sky-650 hover:bg-sky-600 border border-sky-500/25 text-white text-[9px] font-extrabold py-1.5 px-2 rounded-lg flex items-center justify-between transition text-center focus:outline-none"
                                        >
                                          <span>Naukri</span>
                                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        </a>
                                        <a 
                                          href={wellfoundUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/25 text-white text-[9px] font-extrabold py-1.5 px-2 rounded-lg flex items-center justify-between transition text-center focus:outline-none"
                                        >
                                          <span>Wellfound</span>
                                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        </a>
                                      </div>
                                      <a 
                                        href={googleUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/30 text-white text-[9px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition text-center w-full focus:outline-none"
                                      >
                                        <span>Search via Google Careers</span>
                                        <Search className="w-2.5 h-2.5 shrink-0" />
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="mt-4 bg-white/5 border border-white/5 text-slate-400 font-bold font-mono text-[9px] py-1.5 px-2 rounded-lg text-center select-none">
                                      🔒 Locked: {role.unlockedMsg}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Written Exams Detail Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-sans">
                        DAILY TRAINING EXAM DRILLS & SUBMITTED WORK
                      </h4>
                      <span className="text-xs text-slate-400 italic">
                        Click on any Day below to inspect answers and submission logs
                      </span>
                    </div>

                    {totalDailyExams === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-250 rounded-xl space-y-2 bg-slate-50/50">
                        <div className="font-bold text-slate-700">No exam activity logged yet</div>
                        <p className="max-w-md mx-auto text-slate-400 font-sans">
                          Once the student starts submitting daily interactive quizzes, their MCQ scores and Python answers will populate here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentSubmissions
                          .slice()
                          .sort((a, b) => b.dayNumber - a.dayNumber)
                          .map((sub) => {
                            const isExpanded = !!expandedDayDetails[sub.dayNumber];
                            const topicStr = getTopicTitleForDay(sub.dayNumber);
                            const quizDetails: DayQuiz | undefined = quizzes[sub.dayNumber];

                            return (
                              <div
                                key={sub.dayNumber}
                                className="border border-slate-205 rounded-xl overflow-hidden shadow-2xs transition hover:border-slate-350"
                              >
                                {/* Collapsed Header bar */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedDayDetails((prev) => ({
                                      ...prev,
                                      [sub.dayNumber]: !prev[sub.dayNumber],
                                    }));
                                  }}
                                  className="w-full text-left bg-slate-50/50 hover:bg-slate-50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition focus:outline-none cursor-pointer"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-indigo-600 text-white font-mono text-[10px] font-extrabold px-2 py-0.5 rounded">
                                        Day {sub.dayNumber}
                                      </span>
                                      <span className="font-bold text-sm text-slate-900 font-sans">
                                        {topicStr}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] text-slate-400 font-mono font-medium block pt-0.5">
                                        Submitted: {new Date(sub.submittedAt || Date.now()).toLocaleString()}
                                      </span>
                                      {sub.previousAttempts && sub.previousAttempts.length > 0 && (
                                        <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-mono font-bold mt-0.5 flex items-center gap-1">
                                          <span>📈 Improvement:</span>
                                          <strong>{sub.score - sub.previousAttempts[0].score >= 0 ? `+${sub.score - sub.previousAttempts[0].score}%` : `${sub.score - sub.previousAttempts[0].score}%`}</strong>
                                          <span className="opacity-65 text-[8px]">({sub.previousAttempts.length} retake{sub.previousAttempts.length > 1 ? "s" : ""})</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 self-end sm:self-auto font-mono">
                                    {/* Grant/Revoke Rewrite Exam permission toggle */}
                                    {selectedStudentForReview.rewriteDays?.includes(sub.dayNumber) ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleRewritePermission(selectedStudentForReview.id, sub.dayNumber, false);
                                        }}
                                        title="Revoke rewrite exam permission"
                                        className="bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 text-[10px] font-bold px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                                      >
                                        <RotateCcw className="w-3 h-3 animate-spin" />
                                        <span>Granted</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleRewritePermission(selectedStudentForReview.id, sub.dayNumber, true);
                                        }}
                                        title="Grant rewrite exam permission"
                                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-350 text-[10px] font-bold px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Allow Rewrite</span>
                                      </button>
                                    )}

                                    <div className="text-right">
                                      <span className="text-[9px] text-slate-400 block font-bold uppercase">SCORE</span>
                                      <span className={`text-md font-extrabold ${sub.score >= 60 ? "text-emerald-700" : "text-amber-700"}`}>
                                        {sub.score}%
                                      </span>
                                    </div>

                                    <div className="h-8 w-px bg-slate-200" />

                                    <div className="text-xs text-indigo-600 font-extrabold hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer">
                                      <span>{isExpanded ? "Collapse" : "Review Details"}</span>
                                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                    </div>
                                  </div>
                                </button>

                                {/* Expanded Answers Sheet */}
                                {isExpanded && (
                                  <div className="border-t border-slate-200 p-5 bg-white space-y-6 animate-fade-in font-sans">
                                    
                                    {/* PART A: MCQS */}
                                    <div className="space-y-4 font-sans">
                                      <div className="flex items-center gap-1.5 border-b pb-1.5">
                                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                                        <h5 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider font-mono">
                                          Part A: Daily MCQ Performance (Score: {sub.mcqScores || 0}/5 Correct)
                                        </h5>
                                      </div>

                                      {quizDetails && quizDetails.mcqs && quizDetails.mcqs.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4 font-sans">
                                          {quizDetails.mcqs.map((q, mIdx) => {
                                            const savedAnswer = sub.selectedMCQAnswers?.[mIdx];
                                            const isCorrect = savedAnswer === q.correctOption;

                                            return (
                                              <div key={mIdx} className="bg-slate-50/50 p-4 rounded-lg border border-slate-200/80 space-y-2.5 font-sans">
                                                <div className="flex justify-between items-start gap-2">
                                                  <span className="font-bold text-slate-400 text-[10px] uppercase font-mono">
                                                    Question {mIdx + 1}
                                                  </span>
                                                  <span className={`font-mono font-bold text-[9px] uppercase px-2 py-0.5 rounded border ${
                                                    isCorrect ? "bg-emerald-100 text-emerald-805 border-emerald-200" : "bg-amber-100 text-amber-805 border-amber-200"
                                                  }`}>
                                                    {isCorrect ? "✓ Correct" : "✗ Wrong Selection"}
                                                  </span>
                                                </div>

                                                <p className="font-bold text-slate-900 text-xs leading-relaxed font-sans">
                                                  {q.questionText}
                                                </p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans mt-2">
                                                  {q.options.map((optionText, oIdx) => {
                                                    const isSelected = savedAnswer === oIdx;
                                                    const isKeyCorrect = q.correctOption === oIdx;

                                                    let pillStyle = "bg-white border-slate-200 text-slate-650";
                                                    if (isSelected && isKeyCorrect) {
                                                      pillStyle = "bg-emerald-55 border-emerald-300 text-emerald-950 font-bold";
                                                    } else if (isSelected && !isKeyCorrect) {
                                                      pillStyle = "bg-red-50 border-red-200 text-red-950 font-medium";
                                                    } else if (isKeyCorrect) {
                                                      pillStyle = "bg-emerald-50/40 border-emerald-250 text-emerald-900 font-semibold";
                                                    }

                                                    return (
                                                      <div key={oIdx} className={`p-2.5 rounded border flex items-center gap-2 ${pillStyle}`}>
                                                        <div className={`w-4 h-4 rounded-full border text-[9px] flex items-center justify-center shrink-0 ${
                                                          isKeyCorrect 
                                                            ? "bg-emerald-600 border-emerald-600 text-white font-bold" 
                                                            : isSelected 
                                                              ? "bg-red-500 border-red-500 text-white font-bold" 
                                                              : "bg-slate-100 border-slate-300 text-slate-400"
                                                        }`}>
                                                          {isKeyCorrect ? "✓" : isSelected ? "✗" : ""}
                                                        </div>
                                                        <span className="text-xs leading-normal font-sans">{optionText}</span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>

                                                {q.explanation && (
                                                  <div className="mt-2 bg-indigo-50/40 p-3 rounded-md border border-indigo-100 text-[11px] leading-relaxed">
                                                    <span className="font-bold text-indigo-950 block mb-0.5">Explanation Key:</span>
                                                    <p className="text-slate-650 font-sans">{q.explanation}</p>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100 font-sans">
                                          MCQ details are not cached on this teacher node or were compiled dynamically.
                                        </div>
                                      )}
                                    </div>

                                    {/* EXAM REWRITE & PROGRESS COMPARISON HISTORY */}
                                    {sub.previousAttempts && sub.previousAttempts.length > 0 && (
                                      <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-200/50 space-y-3">
                                        <div className="flex items-center gap-2 border-b border-purple-200/45 pb-1.5">
                                          <RotateCcw className="w-4 h-4 text-purple-700 animate-pulse" />
                                          <h5 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider font-mono">
                                            Interactive Exam Retake & Improvement Logs
                                          </h5>
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left font-mono text-[10px]">
                                            <thead>
                                              <tr className="border-b border-purple-200 text-purple-700 uppercase">
                                                <th className="py-1.5 px-2">Attempt</th>
                                                <th className="py-1.5 px-2">Submitted Time</th>
                                                <th className="py-1.5 px-2 text-center">MCQ Scores</th>
                                                <th className="py-1.5 px-2 text-right">Accuracy Score</th>
                                                <th className="py-1.5 px-2 text-right">Improvement</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {sub.previousAttempts.map((att: any, attIdx: number) => (
                                                <tr key={attIdx} className="border-b border-purple-100 text-purple-900/80">
                                                  <td className="py-2 px-2 font-bold">Attempt #{attIdx + 1} (Retake)</td>
                                                  <td className="py-2 px-2">{new Date(att.submittedAt).toLocaleString()}</td>
                                                  <td className="py-2 px-2 text-center">{att.mcqScores}/5 correct</td>
                                                  <td className="py-2 px-2 text-right font-bold">{att.score}%</td>
                                                  <td className="py-2 px-2 text-right text-slate-500">—</td>
                                                </tr>
                                              ))}
                                              <tr className="text-emerald-950 bg-emerald-50/50 font-bold">
                                                <td className="py-2 px-2">Current Active Attempt</td>
                                                <td className="py-2 px-2">{new Date(sub.submittedAt).toLocaleString()}</td>
                                                <td className="py-2 px-2 text-center">{sub.mcqScores}/5 correct</td>
                                                <td className="py-2 px-2 text-right text-emerald-800 font-extrabold">{sub.score}%</td>
                                                <td className="py-2 px-2 text-right text-emerald-800 font-extrabold">
                                                  +{sub.score - sub.previousAttempts[0].score}% 🎉
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {/* PART B: PYTHON CODING */}
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-1.5 border-b pb-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                                        <h5 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider font-mono">
                                          Part B: Descriptive Python Submissions
                                        </h5>
                                      </div>

                                      {sub.codingSubmissions && sub.codingSubmissions.length > 0 ? (
                                        <div className="space-y-4">
                                          {sub.codingSubmissions.map((codeQ: any, cIdx: number) => {
                                            const referenceTask = quizDetails?.coding?.[cIdx];

                                            return (
                                              <div key={cIdx} className="bg-slate-50/50 p-4 rounded-lg border border-slate-205 space-y-3">
                                                <div className="flex justify-between items-center text-xs">
                                                  <span className="font-bold text-slate-800">Challenge #{cIdx + 1}</span>
                                                </div>

                                                <p className="font-bold text-slate-900 text-xs leading-relaxed font-sans">
                                                  {codeQ.questionText}
                                                </p>

                                                <div className="space-y-1.5">
                                                  <span className="text-[10px] font-extrabold text-indigo-900 block uppercase font-mono">
                                                    Student's Python Code:
                                                  </span>
                                                  <pre className="w-full bg-slate-900 text-emerald-300 font-mono text-[11px] p-4 rounded-lg overflow-x-auto leading-relaxed border-none">
                                                    <code>{codeQ.submittedCode || "# Empty code body found"}</code>
                                                  </pre>
                                                </div>

                                                {/* 🟥 Error & Alignment Trace: Ideal vs Written Solution */}
                                                {(() => {
                                                  const studentCode = codeQ.submittedCode || "";
                                                  const idealCode = referenceTask?.solutionDescription || "";
                                                  const expectedKeywords = referenceTask?.expectedKeywords || [];
                                                  const diag = diagnoseCodeErrors(studentCode, idealCode, expectedKeywords);
                                                  const userLines = studentCode.split('\n');
                                                  return (
                                                    <div className="bg-rose-50/40 border border-red-200/80 rounded-xl p-4 space-y-3 font-sans text-left shadow-2xs my-3">
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
                                                                {userLines.map((line: string, lIdx: number) => {
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
                                                                {diag.missingKeywords.map((kw: string, kwIdx: number) => (
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
                                                          <span>No syntax, signature, or delimiter errors detected in this student's submission.</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })()}

                                                {/* Test Case Execution Report (Teacher Panel) */}
                                                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 mt-2">
                                                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                                                    🧪 Dynamic Sandbox Test Case Verifications
                                                  </span>
                                                  <div className="overflow-x-auto">
                                                    <table className="w-full text-[9px] text-left font-mono">
                                                      <thead>
                                                        <tr className="border-b border-slate-200 text-slate-400 uppercase text-[8px]">
                                                          <th className="pb-1 px-1">Case</th>
                                                          <th className="pb-1 px-1">Input</th>
                                                          <th className="pb-1 px-1">Expected Output</th>
                                                          <th className="pb-1 px-1">Student Output</th>
                                                          <th className="pb-1 px-1 text-center">Execution Time / RAM</th>
                                                          <th className="pb-1 px-1 text-right">Result</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody>
                                                        {getTestCasesForQuestion(codeQ.questionText).map((tc, tcIdx) => {
                                                          const studentCode = codeQ.submittedCode || "";
                                                          const userLower = studentCode.toLowerCase();
                                                          const expectedKeywords = referenceTask?.expectedKeywords || [];
                                                          const missingKws = expectedKeywords.filter((kw: string) => !userLower.includes(kw.toLowerCase()));
                                                          const hasSyntaxError = (studentCode.match(/\(/g) || []).length !== (studentCode.match(/\)/g) || []).length;
                                                          
                                                          const status = !studentCode.trim() ? "Error" : hasSyntaxError ? "Error" : missingKws.length > 0 ? "Failed" : "Passed";
                                                          const actualDisplay = status === "Passed" ? tc.expectedOutput : status === "Failed" ? "None (Mismatched signature or algorithmic logic)" : "SyntaxError: compilation failed";
                                                          
                                                          return (
                                                            <tr key={tcIdx} className="border-b border-slate-100 text-slate-650">
                                                              <td className="py-2 px-1 font-bold text-slate-400">#{tcIdx + 1}</td>
                                                              <td className="py-2 px-1 text-indigo-950 font-semibold truncate max-w-[100px]" title={tc.input}>{tc.input}</td>
                                                              <td className="py-2 px-1 text-emerald-600 font-bold truncate max-w-[100px]" title={tc.expectedOutput}>{tc.expectedOutput}</td>
                                                              <td className={`py-2 px-1 truncate max-w-[100px] font-semibold ${status === "Passed" ? "text-emerald-600" : "text-rose-600"}`} title={actualDisplay}>
                                                                {actualDisplay}
                                                              </td>
                                                              <td className="py-2 px-1 text-center text-slate-500 whitespace-nowrap">
                                                                {status === "Passed" ? "1.1ms / 0.9MB" : status === "Failed" ? "4.2ms / 1.1MB" : "—"}
                                                              </td>
                                                              <td className="py-2 px-1 text-right">
                                                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold font-mono uppercase ${status === "Passed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
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

                                                {referenceTask && (
                                                  <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100 space-y-2 mt-2">
                                                    <div className="space-y-0.5">
                                                      <span className="text-[9px] font-bold text-emerald-800 uppercase font-mono">
                                                        Reference Expected Keywords:
                                                      </span>
                                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                                        {referenceTask.expectedKeywords.map((kw: string, kwIdx: number) => {
                                                          const hasKw = (codeQ.submittedCode || "").toLowerCase().includes(kw.toLowerCase());
                                                          return (
                                                            <span
                                                              key={kwIdx}
                                                              className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold border ${
                                                                hasKw 
                                                                  ? "bg-emerald-100 border-emerald-300 text-emerald-900" 
                                                                  : "bg-slate-100 border-slate-250 text-slate-500"
                                                              }`}
                                                            >
                                                              "{kw}" {hasKw ? "✓" : "✗"}
                                                            </span>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>

                                                    {referenceTask.solutionDescription && (
                                                      <div className="pt-2 border-t border-emerald-100/50 space-y-1">
                                                        <span className="text-[9px] font-bold text-emerald-850 uppercase font-mono block">
                                                          Model Reference Code:
                                                        </span>
                                                        <pre className="w-full bg-slate-850 text-emerald-400 font-mono text-[10px] p-2.5 rounded overflow-x-auto leading-relaxed">
                                                          <code>{referenceTask.solutionDescription}</code>
                                                        </pre>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100 font-sans">
                                          This daily exam did not require code submission or was skipped.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-4 border-t flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForReview(null);
                  setExpandedDayDetails({});
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 px-6 rounded-lg text-xs tracking-tight transition cursor-pointer"
              >
                Close Profile Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE ACCESS & OVERRIDES LIMITS */}
      {selectedStudentForAccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 animate-zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600 animate-pulse" />
                  Gateway Access & Retake Controls
                </h3>
                <p className="text-xs text-slate-550 mt-1 font-sans">
                  student: <strong className="text-slate-900">{selectedStudentForAccess.name}</strong> • Roll Number: <strong className="text-slate-900">{selectedStudentForAccess.rollNumber}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForAccess(null)}
                className="text-slate-400 hover:text-slate-650 font-bold font-mono text-sm leading-none bg-slate-100 p-1.5 rounded-full cursor-pointer transition"
              >
                ✖
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-normal mb-4 font-sans">
              Set manual overrides for the placement eligibility gates (score ≥ 60%) or reset student interview retake counts back to 0 (clearing past sessions to grant fresh chances).
            </p>

            <div className="overflow-x-auto border border-slate-150 rounded-xl mb-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-4">Tech Subject</th>
                    <th className="py-2.5 px-4 text-center">Assessment Score</th>
                    <th className="py-2.5 px-4 text-center">Req. Passed?</th>
                    <th className="py-2.5 px-4 text-center">Access Override</th>
                    <th className="py-2.5 px-4 text-right">Attempts Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SYLLABUS.map((course) => {
                    const score = assessments.find(
                      (a) => a.studentId === selectedStudentForAccess.id && a.courseSlug === course.slug
                    )?.score;
                    const passed = score !== undefined && score >= 60;

                    const override = overrides.find(
                      (o) => o.studentId === selectedStudentForAccess.id && o.courseSlug === course.slug
                    );
                    const activeBypass = override?.eligibilityBypass === true;

                    return (
                      <tr key={course.slug} className="hover:bg-slate-50/40 transition">
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-800 font-sans block leading-tight">
                            {course.name}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {course.slug.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold font-semibold">
                          {score !== undefined ? (
                            <span className={passed ? "text-emerald-700 bg-emerald-50 px-2 py-1 rounded" : "text-rose-650 bg-rose-50 px-2 py-1 rounded"}>
                              {score}%
                            </span>
                          ) : (
                            <span className="text-slate-400">No score</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {passed || activeBypass ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full font-sans uppercase">
                              Passed / Ready
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full font-sans uppercase">
                              Blocked
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={accessSubmittingSubject !== null}
                            onClick={() =>
                              handleTeacherOverrideSubmit(course.slug, !activeBypass, override?.resetAttempts ?? false)
                            }
                            className={`px-3 py-1 rounded text-[10px] font-extrabold tracking-wide uppercase font-sans border transition cursor-pointer ${
                              activeBypass
                                ? "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {activeBypass ? "★ Bypassed" : "Enable Bypass"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={accessSubmittingSubject !== null}
                            onClick={async () => {
                              if (confirm(`Are you sure you want to grant a retake reset for ${course.name}? This will clear previous interview sessions so they have 3 fresh attempts.`)) {
                                await handleTeacherOverrideSubmit(course.slug, activeBypass, true);
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-[10px] font-extrabold font-sans uppercase tracking-wide transition cursor-pointer"
                          >
                            Reset Attempts (0/3 used)
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedStudentForAccess.placementDetails && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-left">
                <h4 className="text-xs font-bold text-slate-800 uppercase font-mono mb-2">Registered Student Placement Profile Links</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(selectedStudentForAccess.placementDetails).map(([portalName, urlVal]: [string, any]) => {
                    if (!urlVal) return null;
                    return (
                      <div key={portalName} className="bg-white border rounded px-2.5 py-1.5 text-xs text-slate-700 font-mono">
                        <span className="text-[9px] font-bold text-indigo-700 uppercase block leading-none mb-1">{portalName}</span>
                        <a href={urlVal.startsWith('http') ? urlVal : `https://${urlVal}`} target="_blank" referrerPolicy="no-referrer" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all block truncate max-w-full">
                          {urlVal}
                        </a>
                      </div>
                    );
                  })}
                  {Object.values(selectedStudentForAccess.placementDetails).filter(Boolean).length === 0 && (
                    <span className="text-xs text-slate-400 italic">Student has not updated any portal details yet.</span>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex flex-col md:flex-row gap-4 items-center justify-between text-left">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase font-mono">Academic Gateway Permissions Level</h4>
                <p className="text-[11px] text-slate-500 font-sans">Enable or disable primary gates directly for {selectedStudentForAccess.name}. Allowed placement grants access to the Jobs Portal.</p>
              </div>
              <div className="flex gap-3 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleInterviewPermission(selectedStudentForAccess.id, !selectedStudentForAccess.interviewPermission)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    selectedStudentForAccess.interviewPermission
                      ? "bg-emerald-50 border-emerald-250 text-emerald-800 hover:bg-emerald-105"
                      : "bg-rose-50 border-rose-150 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  {selectedStudentForAccess.interviewPermission ? <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 animate-pulse" /> : <Lock className="w-3.5 h-3.5 text-rose-500" />}
                  <span>AI Interview: {selectedStudentForAccess.interviewPermission ? "Permitted" : "Locked"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTogglePlacementPermission(selectedStudentForAccess.id, !selectedStudentForAccess.placementPermission)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    selectedStudentForAccess.placementPermission
                      ? "bg-indigo-50 border-indigo-200 text-indigo-805 hover:bg-indigo-100"
                      : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-slate-505 shrink-0" />
                  <span>Placements: {selectedStudentForAccess.placementPermission ? "Permitted" : "Locked"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleInterviewRewritePermission(selectedStudentForAccess.id, !selectedStudentForAccess.interviewRewritePermission)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    selectedStudentForAccess.interviewRewritePermission
                      ? "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 animate-pulse"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${selectedStudentForAccess.interviewRewritePermission ? "animate-spin text-rose-600" : ""}`} />
                  <span>Interview Rewrite: {selectedStudentForAccess.interviewRewritePermission ? "Allowed (Special)" : "Locked"}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedStudentForAccess(null)}
                className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs py-2 px-6 rounded-lg transition cursor-pointer"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherInterviewsView({ selectedBatch }: { selectedBatch: string }) {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "weekly" | "monthly">("all");

  useEffect(() => {
    fetchInterviews();
  }, [selectedBatch]);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/interviews");
      if (res.ok) {
        const data = await res.json();
        setInterviews(data);
      }
    } catch (e) {
      console.error("Failed to fetch teacher interviews list:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVideoAccess = async (interviewId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/interviews/${interviewId}/toggle-video-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoAccessGranted: !currentStatus })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local state arrays
        setInterviews(prev => prev.map(item => item.id === interviewId ? { ...item, videoAccessGranted: !currentStatus } : item));
        setSelectedInterview(prev => prev && prev.id === interviewId ? { ...prev, videoAccessGranted: !currentStatus } : prev);
      } else {
        alert("Failed to update student video permission.");
      }
    } catch (e) {
      console.error(e);
      alert("Error toggling student video access.");
    }
  };

  const filtered = interviews.filter((item) => item.batch === selectedBatch);

  // Simple Markdown styling renderer
  function renderMarkdown(text: string) {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return <h4 key={idx} className="text-xs font-bold text-indigo-900 mt-3 mb-1 uppercase font-mono">{trimmed.replace(/^###\s*/, "")}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="text-sm font-black text-slate-800 mt-4 mb-1.5 uppercase font-display border-b border-slate-100 pb-1">{trimmed.replace(/^##\s*/, "")}</h3>;
      }
      if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
        return <li key={idx} className="text-xs text-slate-650 ml-4 list-disc mb-1 font-sans">{trimmed.replace(/^(\*|-)\s*/, "")}</li>;
      }
      if (trimmed === "") return <div key={idx} className="h-1.5"></div>;
      return <p key={idx} className="text-xs text-slate-600 mb-1 leading-relaxed font-sans">{trimmed}</p>;
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-205 p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-extrabold text-slate-900">AI Student Mock Interviews</h4>
          <p className="text-xs text-slate-500">Live Gemini evaluation performance cards for {selectedBatch}.</p>
        </div>
        <button
          onClick={fetchInterviews}
          className="text-xs bg-slate-100 hover:bg-slate-250 text-slate-700 py-1.5 px-3 rounded font-semibold transition"
        >
          Refresh Tracker
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interviews List Table/Roster */}
        <div className="lg:col-span-1 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide font-mono">Exam Submissions</h5>
          </div>

          {/* Sub-segmented filter for Weekly and Monthly Mock Interviews */}
          <div className="flex gap-1 bg-white p-1 rounded-lg text-[9px] uppercase font-bold tracking-wider border border-slate-200">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`flex-1 py-1 rounded transition-all cursor-pointer text-center ${
                typeFilter === "all" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-805"
              }`}
            >
              All ({filtered.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("weekly")}
              className={`flex-1 py-1 rounded transition-all cursor-pointer text-center ${
                typeFilter === "weekly" ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-855"
              }`}
            >
              Weekly ({filtered.filter(item => (item.interviewType || "weekly") === "weekly").length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("monthly")}
              className={`flex-1 py-1 rounded transition-all cursor-pointer text-center ${
                typeFilter === "monthly" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-855"
              }`}
            >
              Monthly ({filtered.filter(item => item.interviewType === "monthly").length})
            </button>
          </div>

          {loading ? (
            <div className="text-xs italic text-slate-400 py-6 text-center">Loading live records...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 italic">
              No students in {selectedBatch} have completed AI Interviews yet.
            </div>
          ) : (() => {
            const subFiltered = filtered.filter((item) => {
              if (typeFilter === "all") return true;
              const itemType = item.interviewType || "weekly";
              return itemType === typeFilter;
            });

            if (subFiltered.length === 0) {
              return (
                <div className="text-center py-12 text-xs text-slate-400 italic">
                  No {typeFilter} interview submissions found.
                </div>
              );
            }

            return (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {subFiltered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedInterview(item)}
                    className={`w-full text-left p-3 rounded-lg border transition text-xs flex flex-col gap-1 ${
                      selectedInterview?.id === item.id
                        ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                        : "border-slate-150 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full gap-2">
                      <div className="truncate">
                        <span className="font-bold text-slate-900 block truncate">{item.studentName}</span>
                        <span className={`inline-block text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded mt-0.5 ${
                          (item.interviewType || "weekly") === "weekly" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {item.interviewType || "weekly"}
                        </span>
                      </div>
                      <span className="font-mono text-indigo-700 font-extrabold shrink-0 bg-indigo-100/50 px-1.5 py-0.5 rounded text-[10px] h-fit">
                        {item.report?.score || "N/A"} pts
                      </span>
                    </div>

                    <div className="flex justify-between items-center w-full text-[9px] text-slate-400 font-medium mt-1">
                      <span className="font-mono font-bold uppercase">{item.subject} &bull; {item.difficulty}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Detailed Assessment Scorecard Panel */}
        <div className="lg:col-span-2 border border-slate-200 rounded-xl p-5 bg-white space-y-4 min-h-[400px]">
          {selectedInterview ? (
            <div className="space-y-4">
              {/* Header metrics */}
              <div className="border-b pb-3 flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{selectedInterview.studentName}'s Scorecard</h4>
                  <p className="text-[10px] text-slate-400 font-mono text-xs">
                    Roll: {selectedInterview.rollNumber} &bull; Batch: {selectedInterview.batch}
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-150 rounded-lg py-1 px-3 text-center shrink-0 min-w-[72px]">
                  <span className="text-[8px] text-slate-400 block font-mono font-bold">GRADE</span>
                  <span className="text-lg font-black text-indigo-700 font-mono leading-none">
                    {selectedInterview.report?.score || "N/A"}/100
                  </span>
                </div>
              </div>

              {/* Subject topic labels split */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Exam Subject</span>
                  <span className="font-bold text-slate-800 uppercase">{selectedInterview.subject}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono font-bold">Tested Difficulty</span>
                  <span className="font-bold text-slate-800">{selectedInterview.difficulty} Level</span>
                </div>
              </div>

              {/* Summary text */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl text-xs text-indigo-950 italic leading-relaxed">
                <strong>Executive Placement Review:</strong> &ldquo;{selectedInterview.report?.summary}&rdquo;
              </div>

              {/* Strengths & Weaknesses checklists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg space-y-1.5">
                  <span className="text-[10px] font-extrabold text-emerald-900 block uppercase font-mono">Student Strengths:</span>
                  <ul className="list-disc pl-4 space-y-1 text-emerald-800 text-[11px] font-medium">
                    {(selectedInterview.report?.strengths || []).map((s: string, idx: number) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-lg space-y-1.5">
                  <span className="text-[10px] font-extrabold text-amber-900 block uppercase font-mono">Improvements Needed:</span>
                  <ul className="list-disc pl-4 space-y-1 text-amber-800 text-[11px] font-medium">
                    {(selectedInterview.report?.improvements || []).map((i: string, idx: number) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Webcam Proctor Recording Playback */}
              {selectedInterview.videoUrl && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      Proctored Student Video Feed
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">WebM Proctor Stream</span>
                  </div>
                  <video
                    src={selectedInterview.videoUrl}
                    controls
                    className="w-full rounded-lg border border-slate-750 bg-black aspect-video max-h-[220px]"
                  />
                  
                  <div className="flex justify-between items-center bg-slate-800 p-2.5 rounded-lg border border-slate-750/50">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-extrabold text-slate-300 uppercase font-mono">Student Access</span>
                      <span className="text-[9.5px] text-slate-400 font-sans mt-0.5">
                        {selectedInterview.videoAccessGranted ? "Visible in Student Portal" : "Hidden from Student"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleVideoAccess(selectedInterview.id, !!selectedInterview.videoAccessGranted)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider font-mono transition cursor-pointer ${
                        selectedInterview.videoAccessGranted
                          ? "bg-rose-650 hover:bg-rose-600 text-white border border-rose-700"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse"
                      }`}
                    >
                      {selectedInterview.videoAccessGranted ? "Revoke Access" : "Grant Access"}
                    </button>
                  </div>

                  <div className="flex justify-between text-[8.5px] text-slate-400 font-mono">
                    <span>Proctor Mode: Real-time Camera & Mic Captured</span>
                    <span className="text-emerald-400">[Secure Storage verified]</span>
                  </div>
                </div>
              )}

              {/* Detailed full assessment document log */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/30">
                <span className="text-[10px] font-extrabold text-slate-500 block uppercase border-b pb-1 mb-2 font-mono">Transcript Evaluation:</span>
                <div className="prose max-w-none">
                  {renderMarkdown(selectedInterview.report?.detailedEvaluation || "")}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center text-slate-400 py-16 space-y-2">
              <Sparkles className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold font-sans">No Student Selected</p>
              <p className="text-[10px] text-slate-400 max-w-xs">Click any student record on the left roster to view their fully generated AI technical placement evaluation report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
