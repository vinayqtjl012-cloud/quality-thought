import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  BookOpen, 
  Code2, 
  Download, 
  Plus, 
  Trash2, 
  Award, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  FileText,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { Student } from "../types.js";

interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface ProjectItem {
  id: string;
  title: string;
  techStack: string;
  link: string;
  description: string;
}

interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

interface ResumeData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  location: string;
  summary: string;
  skills: string; // Comma separated list of skills
  experience: WorkExperience[];
  projects: ProjectItem[];
  education: EducationItem[];
  certifications: string; // Comma separated list of certifications
}

interface AtsResumeMakerProps {
  student: Student;
}

export default function AtsResumeMaker({ student }: AtsResumeMakerProps) {
  // Load initial data with student presets if available
  const [resume, setResume] = useState<ResumeData>({
    fullName: student.name || "",
    headline: "Data Scientist & ML Engineer",
    email: student.email || "",
    phone: (student.phoneNumber || "").replace(/\D/g, "").slice(-10) || "9000012345",
    linkedin: "linkedin.com/in/" + (student.name?.toLowerCase().replace(/\s+/g, "") || "student"),
    github: "github.com/" + (student.name?.toLowerCase().replace(/\s+/g, "") || "student"),
    location: "Hyderabad, India",
    summary: "Dedicated and analytical aspiring Data Scientist with robust foundational training in Python, Machine Learning models, and Pandas analytics. Demonstrated experience building high-accuracy predictive pipelines and generative AI solutions in academic contexts. Eager to leverage technical rigor to solve complex real-world data challenges.",
    skills: "Python, SQL, Pandas, NumPy, Scikit-Learn, TensorFlow, Git, Data Structures, Matplotlib, Seaborn, Machine Learning, Exploratory Data Analysis (EDA)",
    experience: [
      {
        id: "exp-1",
        company: "Quality Thought Elite Labs",
        role: "Data Science & AI Project Intern",
        startDate: "Jan 2026",
        endDate: "Present",
        description: "• Engineered machine learning classification and regression pipelines using Scikit-Learn, achieving 94% accuracy.\n• Optimized hyperparameter grids for Random Forest and XGBoost models using K-fold Cross Validation.\n• Spearheaded exploratory data analysis (EDA) for tabular customer churn databases, uncovering 3 key churn drivers."
      }
    ],
    projects: [
      {
        id: "proj-1",
        title: "Predictive Housing Analytics Engine",
        techStack: "Python, Pandas, NumPy, Scikit-Learn",
        link: "github.com/qualitythought/housing-ml",
        description: "• Implemented a feature engineering pipeline to impute missing variables and encode multi-class catalog metrics.\n• Modeled housing appraisals using Lasso and Ridge regression architectures with high generalization scores."
      },
      {
        id: "proj-2",
        title: "Retrieval Augmented Chatbot with ChromaDB",
        techStack: "Gemini API, LangChain, Python, ChromaDB",
        link: "github.com/qualitythought/rag-gemini",
        description: "• Designed a custom RAG agent that parses PDF documentation and queries vectors via hierarchical semantic searches.\n• Reduced hallucination levels by 30% using context-grounded system prompting templates."
      }
    ],
    education: [
      {
        id: "edu-1",
        institution: "Quality Thought Institute of Data Science",
        degree: "Post Graduate Master Diploma in Advanced AI & ML",
        startDate: "2025",
        endDate: "2026",
        gpa: "CGPA: 9.2/10"
      }
    ],
    certifications: "Quality Thought Certified Data Scientist, Google Cloud Certified ML Practitioner, AWS Cloud Practitioner Foundations"
  });

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [atsScore, setAtsScore] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Calculate ATS Optimization Score dynamically
  useEffect(() => {
    let score = 40; // Base score
    const tips: string[] = [];

    // Length check
    if (resume.fullName.length > 5) score += 5;
    else tips.push("Ensure your full name is entered correctly.");

    if (resume.email.includes("@")) score += 5;
    else tips.push("Provide a valid email address for contact checks.");

    if (resume.phone.length > 8) score += 5;
    else tips.push("Add a direct phone number.");

    // Summary checks
    if (resume.summary.length > 150) {
      score += 10;
    } else {
      tips.push("Your summary/objective should be descriptive (at least 150 characters) to pass semantic resume parsers.");
    }

    // Action verb analysis
    const actionVerbs = ["engineered", "optimized", "implemented", "modeled", "designed", "spearheaded", "developed", "built", "managed", "created"];
    const textToSearch = (
      resume.summary + " " + 
      resume.experience.map(e => e.description).join(" ") + " " + 
      resume.projects.map(p => p.description).join(" ")
    ).toLowerCase();

    let verbCount = 0;
    actionVerbs.forEach(verb => {
      if (textToSearch.includes(verb)) verbCount++;
    });

    if (verbCount >= 4) {
      score += 10;
    } else {
      tips.push("Include strong action verbs in your bullet points (e.g., 'Engineered', 'Optimized', 'Spearheaded', 'Implemented').");
    }

    // Key technical keywords check (Data Science specific)
    const keywords = ["python", "sql", "pandas", "numpy", "scikit-learn", "tensorflow", "git", "machine learning", "deep learning", "eda", "regression", "classification"];
    let keywordCount = 0;
    keywords.forEach(kw => {
      if (textToSearch.includes(kw) || resume.skills.toLowerCase().includes(kw)) {
        keywordCount++;
      }
    });

    if (keywordCount >= 8) {
      score += 15;
    } else if (keywordCount >= 4) {
      score += 8;
      tips.push("Add more core technical keywords like 'Pandas', 'NumPy', 'Scikit-Learn', or 'SQL' to match ATS filters.");
    } else {
      tips.push("Critical skills missing! Ensure 'Python', 'SQL', and core ML libraries are explicitly listed.");
    }

    // Formatting check: Bullet points
    const bulletCount = (textToSearch.match(/•/g) || []).length;
    if (bulletCount >= 4) {
      score += 10;
    } else {
      tips.push("Format your work experiences and project milestones as structured bullet points (use '•').");
    }

    // Section sizes
    if (resume.experience.length > 0) score += 5;
    else tips.push("Add at least one professional or academic experience entry.");

    if (resume.projects.length >= 2) score += 5;
    else tips.push("Include at least two projects with deep technical detail to showcase your coding ability.");

    setAtsScore(Math.min(score, 100));
    setSuggestions(tips);
  }, [resume]);

  // Form handlers
  const handleInputChange = (field: keyof ResumeData, value: any) => {
    setResume(prev => ({ ...prev, [field]: value }));
  };

  const handleWorkChange = (id: string, field: keyof WorkExperience, value: string) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const addWork = () => {
    const newWork: WorkExperience = {
      id: "exp-" + Date.now(),
      company: "",
      role: "",
      startDate: "",
      endDate: "",
      description: "• Designed / Developed ...\n• Improved efficiency by ...\n• Collaborated on ..."
    };
    setResume(prev => ({ ...prev, experience: [...prev.experience, newWork] }));
  };

  const deleteWork = (id: string) => {
    setResume(prev => ({ ...prev, experience: prev.experience.filter(exp => exp.id !== id) }));
  };

  const handleProjectChange = (id: string, field: keyof ProjectItem, value: string) => {
    setResume(prev => ({
      ...prev,
      projects: prev.projects.map(proj => proj.id === id ? { ...proj, [field]: value } : proj)
    }));
  };

  const addProject = () => {
    const newProj: ProjectItem = {
      id: "proj-" + Date.now(),
      title: "",
      techStack: "",
      link: "",
      description: "• Built a ... using ...\n• Achieved ... results by applying ..."
    };
    setResume(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
  };

  const deleteProject = (id: string) => {
    setResume(prev => ({ ...prev, projects: prev.projects.filter(proj => proj.id !== id) }));
  };

  const handleEducationChange = (id: string, field: keyof EducationItem, value: string) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu)
    }));
  };

  const addEducation = () => {
    const newEdu: EducationItem = {
      id: "edu-" + Date.now(),
      institution: "",
      degree: "",
      startDate: "",
      endDate: "",
      gpa: ""
    };
    setResume(prev => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const deleteEducation = (id: string) => {
    setResume(prev => ({ ...prev, education: prev.education.filter(edu => edu.id !== id) }));
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadAsText = () => {
    let text = `${resume.fullName.toUpperCase()}\n`;
    text += `${resume.headline.toUpperCase()}\n`;
    text += `Location: ${resume.location} | Email: ${resume.email} | Phone: ${resume.phone}\n`;
    if (resume.linkedin || resume.github) {
      text += `${resume.linkedin ? 'LinkedIn: ' + resume.linkedin : ''} ${resume.github ? ' | GitHub: ' + resume.github : ''}\n`;
    }
    text += `\n${'='.repeat(40)}\n\n`;
    
    if (resume.summary) {
      text += `PROFESSIONAL SUMMARY\n${'-'.repeat(20)}\n${resume.summary}\n\n`;
    }
    
    if (resume.skills) {
      text += `CORE TECHNICAL SKILLS\n${'-'.repeat(20)}\n${resume.skills}\n\n`;
    }
    
    if (resume.experience.length > 0) {
      text += `WORK & PROJECT EXPERIENCES\n${'-'.repeat(20)}\n`;
      resume.experience.forEach(exp => {
        text += `${exp.role} | ${exp.company} (${exp.startDate} - ${exp.endDate})\n${exp.description}\n\n`;
      });
    }
    
    if (resume.projects.length > 0) {
      text += `FEATURED AI & DATA SCIENCE PROJECTS\n${'-'.repeat(20)}\n`;
      resume.projects.forEach(proj => {
        text += `${proj.title} [${proj.techStack}]\n${proj.link ? 'Link: ' + proj.link + '\n' : ''}${proj.description}\n\n`;
      });
    }
    
    if (resume.education.length > 0) {
      text += `ACADEMIC EDUCATION\n${'-'.repeat(20)}\n`;
      resume.education.forEach(edu => {
        text += `${edu.degree} | ${edu.institution} (${edu.startDate} - ${edu.endDate}) - GPA: ${edu.gpa}\n\n`;
      });
    }
    
    if (resume.certifications) {
      text += `PROFESSIONAL CREDENTIALS\n${'-'.repeat(20)}\n${resume.certifications}\n\n`;
    }
    
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resume.fullName.replace(/\s+/g, "_")}_ATS_Resume.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAsMarkdown = () => {
    let md = `# ${resume.fullName}\n`;
    md += `### ${resume.headline}\n\n`;
    md += `📍 **Location:** ${resume.location} | ✉️ **Email:** ${resume.email} | 📞 **Phone:** ${resume.phone}\n\n`;
    if (resume.linkedin || resume.github) {
      md += `${resume.linkedin ? '🔗 **LinkedIn:** [' + resume.linkedin + '](https://' + resume.linkedin + ')' : ''} ${resume.github ? ' | 💻 **GitHub:** [' + resume.github + '](https://' + resume.github + ')' : ''}\n\n`;
    }
    md += `---\n\n`;
    
    if (resume.summary) {
      md += `## PROFESSIONAL SUMMARY\n${resume.summary}\n\n`;
    }
    
    if (resume.skills) {
      md += `## CORE TECHNICAL SKILLS\n\`${resume.skills}\`\n\n`;
    }
    
    if (resume.experience.length > 0) {
      md += `## WORK & PROJECT EXPERIENCES\n`;
      resume.experience.forEach(exp => {
        md += `### ${exp.role} - **${exp.company}**\n`;
        md += `_${exp.startDate} - ${exp.endDate}_\n\n`;
        md += `${exp.description}\n\n`;
      });
    }
    
    if (resume.projects.length > 0) {
      md += `## FEATURED AI & DATA SCIENCE PROJECTS\n`;
      resume.projects.forEach(proj => {
        md += `### ${proj.title}\n`;
        md += `**Tech Stack:** \`${proj.techStack}\`${proj.link ? ' | [Link](https://' + proj.link + ')' : ''}\n\n`;
        md += `${proj.description}\n\n`;
      });
    }
    
    if (resume.education.length > 0) {
      md += `## ACADEMIC EDUCATION\n`;
      resume.education.forEach(edu => {
        md += `### ${edu.degree}\n`;
        md += `**${edu.institution}** | _${edu.startDate} - ${edu.endDate}_ | **GPA:** ${edu.gpa}\n\n`;
      });
    }
    
    if (resume.certifications) {
      md += `## PROFESSIONAL CREDENTIALS\n${resume.certifications}\n\n`;
    }
    
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resume.fullName.replace(/\s+/g, "_")}_ATS_Resume.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAsDoc = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
          "xmlns:w='urn:schemas-microsoft-com:office:word' "+
          "xmlns='http://www.w3.org/TR/REC-html40'>"+
          "<head><title>Resume</title><style>"+
          "body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.15; color: #111111; }"+
          "h1 { text-align: center; text-transform: uppercase; font-size: 18pt; margin-bottom: 2pt; }"+
          "p.subtitle { text-align: center; font-weight: bold; font-size: 10pt; color: #555555; text-transform: uppercase; margin-bottom: 6pt; }"+
          "p.contact { text-align: center; font-size: 9.5pt; margin-bottom: 12pt; }"+
          "h3 { font-size: 10.5pt; border-bottom: 1px solid #111111; margin-top: 14pt; margin-bottom: 4pt; text-transform: uppercase; font-family: Arial, sans-serif; }"+
          "div.exp-item, div.proj-item { margin-bottom: 10pt; }"+
          "table.meta-row { width: 100%; border: none; margin-bottom: 2pt; }"+
          "td.left { text-align: left; font-weight: bold; }"+
          "td.right { text-align: right; }"+
          "p.description { margin-left: 12pt; margin-top: 2pt; margin-bottom: 2pt; font-size: 10pt; text-align: justify; }"+
          "</style></head><body>";
    const footer = "</body></html>";
    
    let content = `<h1>${resume.fullName}</h1>`;
    content += `<p class='subtitle'>${resume.headline}</p>`;
    content += `<p class='contact'>${resume.location} | ${resume.email} | ${resume.phone}<br/>`;
    content += `${resume.linkedin ? 'LinkedIn: ' + resume.linkedin : ''} ${resume.github ? ' | GitHub: ' + resume.github : ''}</p>`;
    
    if (resume.summary) {
      content += `<h3>PROFESSIONAL SUMMARY</h3><p class='description' style='margin-left:0;'>${resume.summary}</p>`;
    }
    
    if (resume.skills) {
      content += `<h3>CORE TECHNICAL SKILLS</h3><p class='description' style='margin-left:0; font-family:Courier New;'>${resume.skills}</p>`;
    }
    
    if (resume.experience.length > 0) {
      content += `<h3>WORK & PROJECT EXPERIENCES</h3>`;
      resume.experience.forEach(exp => {
        content += `<div class='exp-item'>`;
        content += `<table class='meta-row'><tr><td class='left'>${exp.role} - ${exp.company}</td><td class='right'>${exp.startDate} – ${exp.endDate}</td></tr></table>`;
        content += `<p class='description'>${exp.description.replace(/\n/g, '<br/>')}</p>`;
        content += `</div>`;
      });
    }
    
    if (resume.projects.length > 0) {
      content += `<h3>FEATURED AI & DATA SCIENCE PROJECTS</h3>`;
      resume.projects.forEach(proj => {
        content += `<div class='proj-item'>`;
        content += `<table class='meta-row'><tr><td class='left'>${proj.title}</td><td class='right' style='font-family:Courier New; font-size:9pt;'>${proj.techStack}</td></tr></table>`;
        if (proj.link) {
          content += `<p class='description' style='font-size:8.5pt; color:#666;'>Link: ${proj.link}</p>`;
        }
        content += `<p class='description'>${proj.description.replace(/\n/g, '<br/>')}</p>`;
        content += `</div>`;
      });
    }
    
    if (resume.education.length > 0) {
      content += `<h3>ACADEMIC EDUCATION</h3>`;
      resume.education.forEach(edu => {
        content += `<div class='proj-item'>`;
        content += `<table class='meta-row'><tr><td class='left'>${edu.degree} - ${edu.institution}</td><td class='right'>${edu.startDate} – ${edu.endDate}</td></tr></table>`;
        content += `<p class='description'>GPA / Marks: ${edu.gpa}</p>`;
        content += `</div>`;
      });
    }
    
    if (resume.certifications) {
      content += `<h3>PROFESSIONAL CREDENTIALS</h3><p class='description' style='margin-left:0;'>${resume.certifications}</p>`;
    }
    
    const source = header + content + footer;
    const blob = new Blob(['\ufeff' + source], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resume.fullName.replace(/\s+/g, "_")}_ATS_Resume.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Print-only CSS style override to hide app layout & tabs when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ats-resume-print-pane, #ats-resume-print-pane * {
            visibility: visible;
          }
          #ats-resume-print-pane {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0px !important;
            margin: 0px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Intro Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1 text-left">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600 animate-pulse-slow" />
            ATS-Friendly Resume Architect
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Applicant Tracking Systems (ATS) scan for structural hierarchy, single-column alignment, and critical keywords. Fill out your details below to instantly score, optimize, and export your professional resume.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-4 py-2 text-xs font-bold font-mono uppercase rounded-lg transition-all border ${
              activeTab === "edit"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
            }`}
          >
            ✏️ Edit Details
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 text-xs font-bold font-mono uppercase rounded-lg transition-all border ${
              activeTab === "preview"
                ? "bg-sky-600 text-white border-sky-605"
                : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
            }`}
          >
            👁️ ATS Preview ({atsScore}%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT/EDIT AREA (Only visible on Edit Tab, or side-by-side on desktop) */}
        <div className={`lg:col-span-7 space-y-6 print:hidden ${activeTab === "preview" ? "hidden lg:block" : "block"}`}>
          
          {/* 1. Contact details */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-left space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              Primary Contact & Headline Info
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={resume.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">Target Headline</label>
                <input
                  type="text"
                  value={resume.headline}
                  onChange={(e) => handleInputChange("headline", e.target.value)}
                  placeholder="e.g. Data Scientist / ML Engineer"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={resume.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">Phone Number (10 digits, no country code)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={10}
                    value={resume.phone}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                      handleInputChange("phone", cleaned);
                    }}
                    placeholder="e.g. 9000012345"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition font-mono"
                  />
                </div>
                {resume.phone.length > 0 && resume.phone.length < 10 && (
                  <span className="text-[9px] text-rose-500 font-mono block mt-0.5">Must be exactly 10 digits</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">LinkedIn Profile URL</label>
                <input
                  type="text"
                  value={resume.linkedin}
                  onChange={(e) => handleInputChange("linkedin", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">GitHub Profile URL</label>
                <input
                  type="text"
                  value={resume.github}
                  onChange={(e) => handleInputChange("github", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10.5px] font-mono font-bold text-slate-500 uppercase">Location (City, State/Country)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={resume.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Professional Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-left space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              Professional Summary
            </h4>
            <textarea
              rows={4}
              value={resume.summary}
              onChange={(e) => handleInputChange("summary", e.target.value)}
              placeholder="Keep this concise and descriptive with data science highlights..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition font-sans leading-relaxed"
            />
          </div>

          {/* 3. Core Technical Skills */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-left space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide flex items-center gap-2">
              <Code2 className="w-4 h-4 text-sky-600" />
              Core Technical Skills
            </h4>
            <p className="text-[10px] text-slate-400">
              Provide skills separated by commas. Grouping them by categories helps ATS machines parse them cleanly.
            </p>
            <textarea
              rows={3}
              value={resume.skills}
              onChange={(e) => handleInputChange("skills", e.target.value)}
              placeholder="Python, SQL, Pandas, NumPy, Scikit-Learn..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition font-mono leading-relaxed"
            />
          </div>

          {/* 4. Work Experience */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-600" />
                Work / Internship Experience
              </h4>
              <button
                type="button"
                onClick={addWork}
                className="text-sky-600 hover:text-sky-700 text-xs font-bold font-mono flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </button>
            </div>

            {resume.experience.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4">No work experience entries yet. Add your internships or previous jobs!</p>
            )}

            {resume.experience.map((exp) => (
              <div key={exp.id} className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => deleteWork(exp.id)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Company Name</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => handleWorkChange(exp.id, "company", e.target.value)}
                      placeholder="e.g. Quality Thought Labs"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Role / Position</label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => handleWorkChange(exp.id, "role", e.target.value)}
                      placeholder="e.g. Data Scientist Intern"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Start Date</label>
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) => handleWorkChange(exp.id, "startDate", e.target.value)}
                      placeholder="e.g. Jan 2026"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">End Date</label>
                    <input
                      type="text"
                      value={exp.endDate}
                      onChange={(e) => handleWorkChange(exp.id, "endDate", e.target.value)}
                      placeholder="e.g. Present / Mar 2026"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Role Description (Use Bullet Points '•')</label>
                    <textarea
                      rows={3}
                      value={exp.description}
                      onChange={(e) => handleWorkChange(exp.id, "description", e.target.value)}
                      placeholder="• Engineered regression pipelines...&#13;• Implemented analytics using..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 outline-none focus:border-sky-500 font-sans"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 5. Key Projects */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-600" />
                Featured Academic / Self-Built Projects
              </h4>
              <button
                type="button"
                onClick={addProject}
                className="text-sky-600 hover:text-sky-700 text-xs font-bold font-mono flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </button>
            </div>

            {resume.projects.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-4">No projects listed yet. Highlight at least 2 key projects!</p>
            )}

            {resume.projects.map((proj) => (
              <div key={proj.id} className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => deleteProject(proj.id)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Project Title</label>
                    <input
                      type="text"
                      value={proj.title}
                      onChange={(e) => handleProjectChange(proj.id, "title", e.target.value)}
                      placeholder="e.g. Predictive Sales Model"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Core Tech Stack</label>
                    <input
                      type="text"
                      value={proj.techStack}
                      onChange={(e) => handleProjectChange(proj.id, "techStack", e.target.value)}
                      placeholder="e.g. Python, Pandas, Gemini API"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">GitHub / Live Link</label>
                    <input
                      type="text"
                      value={proj.link}
                      onChange={(e) => handleProjectChange(proj.id, "link", e.target.value)}
                      placeholder="e.g. github.com/username/project"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Key Milestones (Bullet Points '•')</label>
                    <textarea
                      rows={3}
                      value={proj.description}
                      onChange={(e) => handleProjectChange(proj.id, "description", e.target.value)}
                      placeholder="• Built regression models with Scikit-Learn..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-850 outline-none focus:border-sky-500 font-sans"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 6. Education */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-600" />
                Education Details
              </h4>
              <button
                type="button"
                onClick={addEducation}
                className="text-sky-600 hover:text-sky-700 text-xs font-bold font-mono flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </button>
            </div>

            {resume.education.map((edu) => (
              <div key={edu.id} className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => deleteEducation(edu.id)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">College / Institution</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => handleEducationChange(edu.id, "institution", e.target.value)}
                      placeholder="e.g. Quality Thought Institute"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Degree / Specialization</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => handleEducationChange(edu.id, "degree", e.target.value)}
                      placeholder="e.g. Master PG Diploma in Data Science"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Start Year</label>
                    <select
                      value={edu.startDate}
                      onChange={(e) => handleEducationChange(edu.id, "startDate", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-850 outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="">Select Start Year</option>
                      {Array.from({ length: 31 }, (_, i) => 2000 + i).map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Graduation Year (Max 2030)</label>
                    <select
                      value={edu.endDate}
                      onChange={(e) => handleEducationChange(edu.id, "endDate", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-slate-850 outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="">Select Graduation Year</option>
                      <option value="Present">Present (Ongoing)</option>
                      {Array.from({ length: 31 }, (_, i) => 2000 + i).map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">GPA / Percentage Marks</label>
                    <input
                      type="text"
                      value={edu.gpa}
                      onChange={(e) => handleEducationChange(edu.id, "gpa", e.target.value)}
                      placeholder="e.g. CGPA: 9.1/10"
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-850 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 7. Certifications */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-left space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide flex items-center gap-2">
              <Award className="w-4 h-4 text-sky-600" />
              Certifications & Professional Credentials
            </h4>
            <textarea
              rows={3}
              value={resume.certifications}
              onChange={(e) => handleInputChange("certifications", e.target.value)}
              placeholder="e.g. Quality Thought Certified Data Scientist, AWS Cloud Associate..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-850 focus:bg-white focus:border-sky-500 outline-none transition font-sans leading-relaxed"
            />
          </div>

        </div>

        {/* RIGHT PREVIEW & ANALYTICS AREA (Visible on both tabs, but takes full screen size on preview tab) */}
        <div className={`space-y-6 ${activeTab === "edit" ? "lg:col-span-5" : "lg:col-span-12"} text-left`}>
          
          {/* ATS Performance Analysis Roster */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 print:hidden">
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                <Sparkles className="w-4 h-4 text-sky-600 fill-sky-100" />
                ATS Parser Scoring Panel
              </h4>
              <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-full ${
                atsScore >= 80 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}>
                ATS Score: {atsScore}%
              </span>
            </div>

            {/* Score Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  atsScore >= 80 ? "bg-emerald-500" : atsScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${atsScore}%` }}
              ></div>
            </div>

            {/* Suggestions list */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">ATS Optimizer Recommendations</span>
              {suggestions.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-150 rounded-lg p-2.5 text-xs font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Brilliant! Your resume is highly keyword-optimized and correctly formatted for parsing.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {suggestions.slice(0, 4).map((sug, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-[10.5px] leading-relaxed">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>{sug}</span>
                    </div>
                  ))}
                  {suggestions.length > 4 && (
                    <span className="text-[9px] text-slate-400 italic block text-right">+{suggestions.length - 4} more suggestions</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-wider block">Download & Export Options</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold font-mono text-[11px] py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-sky-500/10"
                  title="Generates a print-ready PDF using standard layout"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF / Print</span>
                </button>
                <button
                  type="button"
                  onClick={downloadAsDoc}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-mono text-[11px] py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-indigo-500/10"
                  title="Downloads resume formatted for Microsoft Word"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={downloadAsText}
                  className="bg-slate-700 hover:bg-slate-800 text-white font-bold font-mono text-[11px] py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-slate-600/10"
                  title="Downloads resume in pure ASCII plain text"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Plain Text</span>
                </button>
                <button
                  type="button"
                  onClick={downloadAsMarkdown}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-mono text-[11px] py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-emerald-500/10"
                  title="Downloads resume formatted in Markdown (.md)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Markdown</span>
                </button>
              </div>
            </div>
          </div>

          {/* THE CLASSIC ATS SINGLE-COLUMN DESIGN PANE (Strictly following resume parser formatting standards) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-0">
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-400 font-mono print:hidden">
              <span>Standard Single-Column ATS Layout</span>
              <span className="text-[10px] text-sky-600 font-bold uppercase">Ready to PDF</span>
            </div>
            
            <div 
              id="ats-resume-print-pane" 
              className="bg-white text-slate-900 p-8 md:p-12 font-serif text-[12.5px] leading-normal shadow-inner space-y-5"
              style={{ fontFamily: 'Times New Roman, Times, serif', color: '#111' }}
            >
              {/* Header Contact Segment */}
              <div className="text-center space-y-1 pb-3 border-b border-slate-350">
                <h1 className="text-2xl font-bold tracking-tight uppercase" style={{ fontSize: '24px', letterSpacing: '0.05em' }}>
                  {resume.fullName || "Your Full Name"}
                </h1>
                <p className="font-sans font-bold text-xs tracking-wider text-slate-650 uppercase" style={{ fontSize: '11px' }}>
                  {resume.headline || "YOUR TARGET PROFILE HEADLINE"}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-slate-600 font-sans text-[11px] mt-2">
                  {resume.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {resume.location}</span>
                  )}
                  {resume.email && (
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400 shrink-0" /> {resume.email}</span>
                  )}
                  {resume.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400 shrink-0" /> {resume.phone}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-slate-500 font-mono text-[10.5px]">
                  {resume.linkedin && (
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-slate-400 shrink-0" /> {resume.linkedin}</span>
                  )}
                  {resume.github && (
                    <span className="flex items-center gap-1"><Code2 className="w-3 h-3 text-slate-400 shrink-0" /> {resume.github}</span>
                  )}
                </div>
              </div>

              {/* Summary Section */}
              {resume.summary && (
                <div className="space-y-1 text-left">
                  <h3 className="font-sans font-extrabold uppercase border-b border-slate-900 pb-0.5 tracking-wider text-xs text-slate-900" style={{ fontSize: '11px' }}>
                    PROFESSIONAL SUMMARY
                  </h3>
                  <p className="text-justify leading-relaxed text-[12px] pt-1">
                    {resume.summary}
                  </p>
                </div>
              )}

              {/* Skills Section */}
              {resume.skills && (
                <div className="space-y-1 text-left">
                  <h3 className="font-sans font-extrabold uppercase border-b border-slate-900 pb-0.5 tracking-wider text-xs text-slate-900" style={{ fontSize: '11px' }}>
                    CORE TECHNICAL SKILLS
                  </h3>
                  <p className="leading-relaxed text-[12px] pt-1 font-mono text-slate-800" style={{ fontSize: '11.5px' }}>
                    {resume.skills}
                  </p>
                </div>
              )}

              {/* Work Experience Section */}
              {resume.experience.length > 0 && (
                <div className="space-y-2 text-left">
                  <h3 className="font-sans font-extrabold uppercase border-b border-slate-900 pb-0.5 tracking-wider text-xs text-slate-900" style={{ fontSize: '11px' }}>
                    WORK & PROJECT EXPERIENCES
                  </h3>
                  <div className="space-y-3.5 pt-1">
                    {resume.experience.map((exp, i) => (
                      <div key={exp.id || i} className="space-y-1">
                        <div className="flex justify-between items-baseline font-bold">
                          <span className="text-[13px]">{exp.role || "Role Position"}</span>
                          <span className="text-xs text-slate-700 font-normal">{exp.startDate} – {exp.endDate}</span>
                        </div>
                        <div className="italic text-slate-700 text-[12px]">{exp.company || "Company Organization"}</div>
                        <p className="text-[11.5px] whitespace-pre-line leading-relaxed text-slate-800 pt-1 font-sans pl-2 border-l border-slate-200">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Section */}
              {resume.projects.length > 0 && (
                <div className="space-y-2 text-left">
                  <h3 className="font-sans font-extrabold uppercase border-b border-slate-900 pb-0.5 tracking-wider text-xs text-slate-900" style={{ fontSize: '11px' }}>
                    FEATURED AI & DATA SCIENCE PROJECTS
                  </h3>
                  <div className="space-y-3.5 pt-1">
                    {resume.projects.map((proj, i) => (
                      <div key={proj.id || i} className="space-y-1">
                        <div className="flex justify-between items-baseline font-bold">
                          <span className="text-[13px]">{proj.title || "Project Title"}</span>
                          <span className="text-[11px] text-sky-700 font-mono font-bold">{proj.techStack}</span>
                        </div>
                        {proj.link && (
                          <div className="text-[10px] text-slate-500 font-mono">{proj.link}</div>
                        )}
                        <p className="text-[11.5px] whitespace-pre-line leading-relaxed text-slate-800 pt-0.5 font-sans pl-2 border-l border-slate-200">
                          {proj.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Section */}
              {resume.education.length > 0 && (
                <div className="space-y-2 text-left">
                  <h3 className="font-sans font-extrabold uppercase border-b border-slate-900 pb-0.5 tracking-wider text-xs text-slate-900" style={{ fontSize: '11px' }}>
                    ACADEMIC EDUCATION
                  </h3>
                  <div className="space-y-3 pt-1">
                    {resume.education.map((edu, i) => (
                      <div key={edu.id || i} className="space-y-1">
                        <div className="flex justify-between items-baseline font-bold">
                          <span className="text-[12.5px]">{edu.degree || "Degree Specialization"}</span>
                          <span className="text-xs text-slate-700 font-normal">{edu.startDate} – {edu.endDate}</span>
                        </div>
                        <div className="flex justify-between text-[11.5px] text-slate-650">
                          <span>{edu.institution || "Institution Name"}</span>
                          <span className="font-bold">{edu.gpa}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications Section */}
              {resume.certifications && (
                <div className="space-y-1 text-left">
                  <h3 className="font-sans font-extrabold uppercase border-b border-slate-900 pb-0.5 tracking-wider text-xs text-slate-900" style={{ fontSize: '11px' }}>
                    PROFESSIONAL CREDENTIALS
                  </h3>
                  <p className="leading-relaxed text-[11.5px] pt-1">
                    {resume.certifications}
                  </p>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
