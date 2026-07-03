export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  batch: string;
  phoneNumber?: string;
  interviewPermission?: boolean; // Allowed access by teacher
  placementPermission?: boolean; // Allowed placement gateway access by teacher
  interviewRewritePermission?: boolean; // Allowed rewrite/reattempt of the AI mock interview
  rewriteDays?: number[]; // Day numbers allowed for rewriting exams
  placementDetails?: {
    linkedin?: string;
    indeed?: string;
    naukri?: string;
    glassdoor?: string;
    foundit?: string;
    shine?: string;
    timesjobs?: string;
    internshala?: string;
    wellfound?: string;
    apna?: string;
    submittedAt?: string;
  };
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  dayNumber: number;
  status: "offline" | "online" | "absent";
  zoomUrl?: string;
  markedAt: string;
}

export interface Batch {
  id: string;
  name: string;
  createdAt: string;
}

export interface CourseLockState {
  batchName: string;
  unlockedCourses: string[]; // e.g., ['python', 'numpy']
  unlockedDays: number[];    // individual days unlocked, e.g., [1, 2, 3]
  courseLockState: Record<string, boolean>; // course slug -> locked boolean
  featureLocks?: {
    interview: boolean;
    resume: boolean;
    monthlyTest: boolean;
  };
}

export interface MCQQuestion {
  questionText: string;
  options: string[];
  correctOption: number; // 0-3
  explanation: string;
}

export interface CodingQuestion {
  questionText: string;
  starterCode: string;
  expectedKeywords: string[]; // basic validation keywords
  solutionDescription: string;
}

export interface DayQuiz {
  dayNumber: number;
  courseSlug: string;
  topicTitle: string;
  mcqs: MCQQuestion[];
  coding: CodingQuestion[];
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  batch: string;
  dayNumber: number;
  courseSlug: string;
  score: number; // e.g. 8 points for MCQs, coding can be self-evaluated or checked
  mcqScores: number;
  codingSubmissions: {
    questionText: string;
    submittedCode: string;
  }[];
  selectedMCQAnswers?: Record<number, number>;
  submittedAt: string;
  previousAttempts?: {
    score: number;
    mcqScores: number;
    codingSubmissions: {
      questionText: string;
      submittedCode: string;
    }[];
    submittedAt: string;
  }[];
}

// Map day numbers (1-200) to courses
export interface CourseSyllabus {
  slug: string;
  name: string;
  startDay: number;
  endDay: number;
  icon: string;
  description: string;
}

export const SYLLABUS: CourseSyllabus[] = [
  {
    slug: "python",
    name: "Python Programming",
    startDay: 1,
    endDay: 30,
    icon: "Code2",
    description: "Syntax, variables, loops, lists, dicts, functions, OOP, and exceptions.",
  },
  {
    slug: "numpy",
    name: "NumPy Essentials",
    startDay: 31,
    endDay: 45,
    icon: "Grid3X3",
    description: "Vector calculations, multi-dimensional slicing, matrix algebra, and broadcasting.",
  },
  {
    slug: "pandas",
    name: "Pandas Data Wrangling",
    startDay: 46,
    endDay: 75,
    icon: "Table2",
    description: "Series, DataFrames, filters, joins, groupings, aggregations, and cleaning.",
  },
  {
    slug: "ml",
    name: "Machine Learning (ML)",
    startDay: 76,
    endDay: 105,
    icon: "Brain",
    description: "Regression, classification, random forests, clustering, custom pipelines, and tuning.",
  },
  {
    slug: "dl",
    name: "Deep Learning (DL)",
    startDay: 106,
    endDay: 135,
    icon: "Cpu",
    description: "Perceptrons, MLPs, backprop, SGD/Adam optimizers, CNNs, and recurrent networks.",
  },
  {
    slug: "nlp",
    name: "Natural Language Processing (NLP)",
    startDay: 136,
    endDay: 165,
    icon: "Languages",
    description: "Tokenization, TF-IDF, embeddings, sentiment analysis, NER, and Hugging Face.",
  },
  {
    slug: "genai",
    name: "Generative AI",
    startDay: 166,
    endDay: 195,
    icon: "Sparkles",
    description: "Prompt engineering, LLMs, LangChain agents, Vector databases (ChromaDB), and RAG.",
  },
  {
    slug: "eda",
    name: "EDA & Visualization",
    startDay: 196,
    endDay: 200,
    icon: "BarChart3",
    description: "Exploratory Data Analysis, custom plots, Matplotlib figure structures, and Seaborn heatmaps.",
  },
];

export function getCourseForDay(day: number): CourseSyllabus {
  const found = SYLLABUS.find(s => day >= s.startDay && day <= s.endDay);
  return found || SYLLABUS[0];
}

export function getTopicTitleForDay(day: number): string {
  const course = getCourseForDay(day);
  const relativeDay = day - course.startDay + 1;
  const courseCap = course.name;

  if (course.slug === "python") {
    if (relativeDay <= 5) return "Python: Syntax, Variables & Types";
    if (relativeDay <= 10) return "Python: Loops, Control flow & Comp.";
    if (relativeDay <= 15) return "Python: Custom Functions & Scope";
    if (relativeDay <= 20) return "Python: Comprehensive Data Structures";
    if (relativeDay <= 25) return "Python: Exception Handling & Files";
    return "Python: Classes & Object-Oriented Design";
  }
  if (course.slug === "numpy") {
    if (relativeDay <= 5) return "NumPy: Array Creation & Shapes";
    if (relativeDay <= 10) return "NumPy: Slicing, Copying & Vectors";
    return "NumPy: Broadcasting & Matrix Algebra";
  }
  if (course.slug === "pandas") {
    if (relativeDay <= 5) return "Pandas: DataFrames & I/O Methods";
    if (relativeDay <= 10) return "Pandas: Selection, Filters & Slicing";
    if (relativeDay <= 15) return "Pandas: Data Cleaning & fillna";
    if (relativeDay <= 20) return "Pandas: GroupBy & Aggregations";
    if (relativeDay <= 25) return "Pandas: Merge, Joins & Reshape";
    return "Pandas: Pivot Tables & Time Series";
  }
  if (course.slug === "ml") {
    if (relativeDay <= 5) return "ML: Regressions & Scikit-Learn";
    if (relativeDay <= 10) return "ML: Dec Trees & Ensemble Methods";
    if (relativeDay <= 15) return "ML: SVM classifiers & KNN Models";
    if (relativeDay <= 20) return "ML: Clustering (KMeans) & PCA";
    if (relativeDay <= 25) return "ML: Cross-Validation & Tuning";
    return "ML: Feature Pipelines & Transformers";
  }
  if (course.slug === "dl") {
    if (relativeDay <= 5) return "DL: Perceptron & Activation Units";
    if (relativeDay <= 10) return "DL: Deep MLPs & Backpropagation";
    if (relativeDay <= 15) return "DL: Optimizers (Adam) & Weights";
    if (relativeDay <= 20) return "DL: ConvNets (CNN) for Images";
    if (relativeDay <= 25) return "DL: Sequence LSTMs & RNN cells";
    return "DL: Underfit Prevention & Dropout";
  }
  if (course.slug === "nlp") {
    if (relativeDay <= 5) return "NLP: Preprocessing & Lemmatization";
    if (relativeDay <= 10) return "NLP: Bag of Words & Vectorizers";
    if (relativeDay <= 15) return "NLP: Embeddings (Word2Vec, GloVe)";
    if (relativeDay <= 20) return "NLP: Neural Sequence Translators";
    if (relativeDay <= 25) return "NLP: Transformers & BERT pipelines";
    return "NLP: Part of Speech & Sentiment";
  }
  if (course.slug === "genai") {
    if (relativeDay <= 5) return "GenAI: Primers on prompt models";
    if (relativeDay <= 10) return "GenAI: ChromaDB Vector Stores & RAG";
    if (relativeDay <= 15) return "GenAI: LangChain Chains & Agents";
    if (relativeDay <= 20) return "GenAI: Fine-Tuning or LoRA Weights";
    if (relativeDay <= 25) return "GenAI: Gemini API Orchestration";
    return "GenAI: Safe Guardrails & Quality Metrics";
  }
  // eda
  if (relativeDay <= 2) return "EDA: Distribution & Sizing Methods";
  if (relativeDay <= 4) return "EDA: Matplotlib Figure Structures";
  return "EDA: Advanced Seaborn Heatmap Schemes";
}

export interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VoiceAnalysis {
  paceWpm: number;
  paceStatus: string;
  clarityScore: number;
  modulationStatus: string;
  fillersDetected: string[];
  fillerCount: number;
  mistakes: string[];
  improvements: string[];
}

export interface QuestionComparison {
  question: string;
  studentAnswer: string;
  idealAnswer: string;
  comparisonAnalysis: string;
  correctnessPercentage: number;
}

export interface AIInterviewReport {
  score: number; // out of 100
  technicalScore?: number; // out of 100
  hrScore?: number; // out of 100
  patternAnalysis?: string; // in-depth behavioral and technical answer pattern analysis
  hrSuggestions?: string[]; // specialized HR & behavioral tips
  techSuggestions?: string[]; // specialized coding & logic tips
  summary: string;
  strengths: string[];
  improvements: string[];
  detailedEvaluation: string; // Markdown text
  voiceAnalysis?: VoiceAnalysis;
  questionComparisons?: QuestionComparison[];
}

export interface AIInterview {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  batch: string;
  subject: string; // e.g. 'python', 'pandas'
  difficulty: string; // e.g. 'Junior', 'Mid-Level', 'Senior'
  messages: InterviewMessage[];
  report?: AIInterviewReport;
  createdAt: string;
  interviewType?: "weekly" | "monthly";
  roundType?: "technical" | "hr" | "combined";
  videoUrl?: string;
  videoAccessGranted?: boolean;
  isFallback?: boolean;
}

export interface RecordedStudentVideo {
  id: string;
  interviewId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  subject: string;
  roundType: string;
  videoUrl: string;
  createdAt: string;
  videoAccessGranted: boolean;
}


