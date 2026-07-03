export interface TestCase {
  input: string;
  expectedOutput: string;
  timeLimit: string;
  memoryLimit: string;
}

export function getTestCasesForQuestion(questionText: string, functionName?: string): TestCase[] {
  const text = (questionText + " " + (functionName || "")).toLowerCase();

  // 1. Solve Anagram
  if (text.includes("anagram") || text.includes("solve_anagram")) {
    return [
      {
        input: 's1 = "listen", s2 = "silent"',
        expectedOutput: "True",
        timeLimit: "10ms",
        memoryLimit: "12MB"
      },
      {
        input: 's1 = "hello", s2 = "world"',
        expectedOutput: "False",
        timeLimit: "10ms",
        memoryLimit: "12MB"
      }
    ];
  }

  // 2. Solve Fibonacci
  if (text.includes("fibonacci") || text.includes("solve_fibonacci")) {
    return [
      {
        input: "n = 5",
        expectedOutput: "5",
        timeLimit: "15ms",
        memoryLimit: "8MB"
      },
      {
        input: "n = 8",
        expectedOutput: "21",
        timeLimit: "15ms",
        memoryLimit: "8MB"
      }
    ];
  }

  // 3. Solve Normalize
  if (text.includes("normalize") || text.includes("solve_normalize")) {
    return [
      {
        input: "arr = [10, 20, 30]",
        expectedOutput: "[0.0, 0.5, 1.0]",
        timeLimit: "25ms",
        memoryLimit: "16MB"
      },
      {
        input: "arr = [1, 5, 9]",
        expectedOutput: "[0.0, 0.5, 1.0]",
        timeLimit: "25ms",
        memoryLimit: "16MB"
      }
    ];
  }

  // 4. Row Mean
  if (text.includes("row_mean") || text.includes("solve_row_mean")) {
    return [
      {
        input: "arr_2d = [[1, 2], [3, 4]]",
        expectedOutput: "[1.5, 3.5]",
        timeLimit: "20ms",
        memoryLimit: "16MB"
      }
    ];
  }

  // 5. High Sales
  if (text.includes("high_sales") || text.includes("solve_high_sales")) {
    return [
      {
        input: "df with 'Sales' = [100, 250, 80]",
        expectedOutput: "DataFrame with 1 row (Sales = 250)",
        timeLimit: "30ms",
        memoryLimit: "24MB"
      }
    ];
  }

  // 6. Fill Nulls
  if (text.includes("fill_nulls") || text.includes("solve_fill_nulls") || text.includes("fillna")) {
    return [
      {
        input: "df with Nulls, col='Age', val=25",
        expectedOutput: "DataFrame with all Null values in 'Age' replaced by 25",
        timeLimit: "25ms",
        memoryLimit: "24MB"
      }
    ];
  }

  // 7. Split Train Test
  if (text.includes("split_train_test") || text.includes("solve_split_train_test") || text.includes("split_and_scale")) {
    return [
      {
        input: "X (shape=[100, 4]), y (shape=[100])",
        expectedOutput: "X_train (75 rows), X_test (25 rows), y_train (75), y_test (25)",
        timeLimit: "45ms",
        memoryLimit: "32MB"
      }
    ];
  }

  // 8. Random Forest Fit
  if (text.includes("rf_fit") || text.includes("solve_rf_fit")) {
    return [
      {
        input: "X_train, y_train",
        expectedOutput: "Active fitted RandomForestClassifier instance",
        timeLimit: "120ms",
        memoryLimit: "64MB"
      }
    ];
  }

  // 9. Solve Loss / Mean Squared Error
  if (text.includes("loss") || text.includes("solve_loss") || text.includes("mean_squared_error")) {
    return [
      {
        input: "y_true = 1.0, y_pred = 0.9",
        expectedOutput: "0.10536 (or 0.01 MSE)",
        timeLimit: "15ms",
        memoryLimit: "16MB"
      }
    ];
  }

  // 10. MLP Forward
  if (text.includes("mlp_forward") || text.includes("solve_mlp_forward")) {
    return [
      {
        input: "x = [1, 2], w1 = [[0.5], [0.5]], b1 = [0.1]",
        expectedOutput: "[1.6] (ReLU applied)",
        timeLimit: "25ms",
        memoryLimit: "16MB"
      }
    ];
  }

  // 11. Tokenise / Tokenize and Clean
  if (text.includes("tokenise") || text.includes("solve_tokenise") || text.includes("tokenize") || text.includes("tokenize_and_clean")) {
    return [
      {
        input: 'raw_text = "AI is amazing!"',
        expectedOutput: '["ai", "is", "amazing"]',
        timeLimit: "15ms",
        memoryLimit: "12MB"
      }
    ];
  }

  // 12. Cosine Similarity
  if (text.includes("cosine") || text.includes("solve_cosine")) {
    return [
      {
        input: "A = [1, 0], B = [1, 0]",
        expectedOutput: "1.0",
        timeLimit: "20ms",
        memoryLimit: "16MB"
      },
      {
        input: "A = [1, 0], B = [0, 1]",
        expectedOutput: "0.0",
        timeLimit: "20ms",
        memoryLimit: "16MB"
      }
    ];
  }

  // 13. Template / Prompt Template
  if (text.includes("tpl") || text.includes("solve_tpl") || text.includes("rag_prompt")) {
    return [
      {
        input: 'name = "Alice", topic = "ML"',
        expectedOutput: '"Hello Alice, let\'s learn ML."',
        timeLimit: "10ms",
        memoryLimit: "8MB"
      }
    ];
  }

  // 14. Parse JSON
  if (text.includes("parse_json") || text.includes("solve_parse_json")) {
    return [
      {
        input: 'text_chunk = \'{"score": 90}\'',
        expectedOutput: '{"score": 90} (as dictionary)',
        timeLimit: "15ms",
        memoryLimit: "12MB"
      }
    ];
  }

  // 15. Correlations
  if (text.includes("correlations") || text.includes("solve_correlations")) {
    return [
      {
        input: "df with 'Age', 'Salary', 'Score'",
        expectedOutput: "3x3 Pearson Correlation Matrix",
        timeLimit: "35ms",
        memoryLimit: "24MB"
      }
    ];
  }

  // 16. Primes
  if (text.includes("primes") || text.includes("prime") || text.includes("find_primes")) {
    return [
      {
        input: "n = 10",
        expectedOutput: "[2, 3, 5, 7]",
        timeLimit: "15ms",
        memoryLimit: "10MB"
      },
      {
        input: "n = 20",
        expectedOutput: "[2, 3, 5, 7, 11, 13, 17, 19]",
        timeLimit: "15ms",
        memoryLimit: "10MB"
      }
    ];
  }

  // 17. Word Frequencies / Char Frequency
  if (text.includes("frequencies") || text.includes("frequency") || text.includes("freq")) {
    return [
      {
        input: 'sentence = "apple banana apple"',
        expectedOutput: "{'apple': 2, 'banana': 1}",
        timeLimit: "12ms",
        memoryLimit: "10MB"
      }
    ];
  }

  // 18. Squares / Squared Evens
  if (text.includes("squares") || text.includes("squared") || text.includes("factorial")) {
    if (text.includes("factorial")) {
      return [
        {
          input: "n = 5",
          expectedOutput: "120",
          timeLimit: "10ms",
          memoryLimit: "8MB"
        }
      ];
    }
    return [
      {
        input: "n = 5",
        expectedOutput: "[0, 1, 4, 9, 16] or [1, 4, 9, 16, 25]",
        timeLimit: "10ms",
        memoryLimit: "8MB"
      }
    ];
  }

  // 19. Diagonal Sum / Matrix Filter
  if (text.includes("diagonal") || text.includes("matrix") || text.includes("filter_matrix")) {
    return [
      {
        input: "matrix = [[1, 2], [3, 4]]",
        expectedOutput: "5 (sum of 1 + 4) or filtered matrix",
        timeLimit: "20ms",
        memoryLimit: "16MB"
      }
    ];
  }

  // 20. Null counts / Nulls
  if (text.includes("null") || text.includes("nan") || text.includes("missing")) {
    return [
      {
        input: "df with null values",
        expectedOutput: "Series containing counts of nulls per column",
        timeLimit: "25ms",
        memoryLimit: "20MB"
      }
    ];
  }

  // Default Generic Test Cases if not matching anything specifically
  return [
    {
      input: "Generic Input Data",
      expectedOutput: "Expected evaluated solution output",
      timeLimit: "20ms",
      memoryLimit: "16MB"
    }
  ];
}

export interface DiagnosticResult {
  hasError: boolean;
  errorType: string;
  errorMessage: string;
  offendingLineNumber?: number;
  offendingLineContent?: string;
  detailedExplanation: string;
  missingKeywords: string[];
}

export function diagnoseCodeErrors(userCode: string, idealCode: string, expectedKeywords: string[] = []): DiagnosticResult {
  const code = userCode || "";
  if (!code.trim()) {
    return {
      hasError: true,
      errorType: "MissingSubmissionError",
      errorMessage: "No code was written or submitted for this task.",
      detailedExplanation: "The workspace sandbox detected an empty code cell. Please write and compile your Python solution in the editor.",
      missingKeywords: expectedKeywords
    };
  }

  const lines = code.split('\n');

  // 1. Delimiters balance check (parentheses)
  let openP = 0, closeP = 0;
  let offendingPLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openInLine = (line.match(/\(/g) || []).length;
    const closeInLine = (line.match(/\)/g) || []).length;
    openP += openInLine;
    closeP += closeInLine;
    if (closeP > openP && offendingPLine === -1) {
      offendingPLine = i + 1;
    }
  }
  if (openP !== closeP) {
    const isMoreOpen = openP > closeP;
    return {
      hasError: true,
      errorType: "SyntaxError",
      errorMessage: `Unbalanced Parentheses: Found ${openP} '(' and ${closeP} ')'.`,
      offendingLineNumber: offendingPLine !== -1 ? offendingPLine : lines.length,
      offendingLineContent: offendingPLine !== -1 ? lines[offendingPLine - 1] : lines[lines.length - 1],
      detailedExplanation: isMoreOpen 
        ? "You have opened more parentheses '(' than you closed ')'. Look for an unclosed function call or mathematical expression."
        : "You have closed more parentheses ')' than you opened '('. Ensure there are no stray ')' characters.",
      missingKeywords: []
    };
  }

  // 2. Delimiters balance check (brackets)
  let openB = 0, closeB = 0;
  let offendingBLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    openB += (line.match(/\[/g) || []).length;
    closeB += (line.match(/\]/g) || []).length;
    if (closeB > openB && offendingBLine === -1) {
      offendingBLine = i + 1;
    }
  }
  if (openB !== closeB) {
    return {
      hasError: true,
      errorType: "SyntaxError",
      errorMessage: `Unbalanced Square Brackets: Found ${openB} '[' and ${closeB} ']'.`,
      offendingLineNumber: offendingBLine !== -1 ? offendingBLine : lines.length,
      offendingLineContent: offendingBLine !== -1 ? lines[offendingBLine - 1] : lines[lines.length - 1],
      detailedExplanation: openB > closeB
        ? "You have unclosed square brackets. Verify list definitions or matrix index slicing syntax."
        : "You have closed more square brackets than you opened. Check for redundant ']' characters.",
      missingKeywords: []
    };
  }

  // 3. Delimiters balance check (braces)
  let openBr = 0, closeBr = 0;
  let offendingBrLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    openBr += (line.match(/\{/g) || []).length;
    closeBr += (line.match(/\}/g) || []).length;
    if (closeBr > openBr && offendingBrLine === -1) {
      offendingBrLine = i + 1;
    }
  }
  if (openBr !== closeBr) {
    return {
      hasError: true,
      errorType: "SyntaxError",
      errorMessage: `Unbalanced Curly Braces: Found ${openBr} '{' and ${closeBr} '}'.`,
      offendingLineNumber: offendingBrLine !== -1 ? offendingBrLine : lines.length,
      offendingLineContent: offendingBrLine !== -1 ? lines[offendingBrLine - 1] : lines[lines.length - 1],
      detailedExplanation: "In Python, curly braces are used for dictionary literals and f-strings. Make sure all opened curly braces are correctly paired.",
      missingKeywords: []
    };
  }

  // 4. Indentation Error Check (Check if line ends with colon ':' but next line has equal or less indentation)
  let offendingIndentLine = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trimEnd();
    if (line.endsWith(':')) {
      // Find next non-empty, non-comment line
      let nextLineIdx = i + 1;
      while (nextLineIdx < lines.length && (lines[nextLineIdx].trim() === "" || lines[nextLineIdx].trim().startsWith('#'))) {
        nextLineIdx++;
      }
      if (nextLineIdx < lines.length) {
        const currentIndent = lines[i].match(/^\s*/)?.[0].length || 0;
        const nextIndent = lines[nextLineIdx].match(/^\s*/)?.[0].length || 0;
        if (nextIndent <= currentIndent) {
          offendingIndentLine = nextLineIdx + 1;
          break;
        }
      }
    }
  }
  if (offendingIndentLine !== -1) {
    return {
      hasError: true,
      errorType: "IndentationError",
      errorMessage: "Expected an indented block after block header statement (ending with ':').",
      offendingLineNumber: offendingIndentLine,
      offendingLineContent: lines[offendingIndentLine - 1],
      detailedExplanation: "Python strictly requires block statements (like def, if, for, while) to contain an indented block underneath them.",
      missingKeywords: []
    };
  }

  // 5. Check if they declared a function correctly if the ideal code does
  const idealDef = idealCode.split('\n').find(l => l.trim().startsWith('def '));
  const userDef = lines.find(l => l.trim().startsWith('def '));
  if (idealDef && !userDef) {
    return {
      hasError: true,
      errorType: "AttributeError",
      errorMessage: `Missing function declaration. Expected function signature: "${idealDef.trim()}"`,
      detailedExplanation: "To compile successfully against the test suite, your solution must define a function with the specified signature.",
      missingKeywords: []
    };
  } else if (idealDef && userDef) {
    const idealFuncName = idealDef.trim().split('(')[0].replace('def ', '').trim();
    const userFuncName = userDef.trim().split('(')[0].replace('def ', '').trim();
    if (idealFuncName !== userFuncName) {
      return {
        hasError: true,
        errorType: "NameError",
        errorMessage: `Incorrect function name. Expected: "${idealFuncName}", found: "${userFuncName}"`,
        offendingLineNumber: lines.indexOf(userDef) + 1,
        offendingLineContent: userDef,
        detailedExplanation: `The evaluation sandbox expects the exact name "${idealFuncName}" so it can invoke it on the test cases. Check for spelling or case typos.`,
        missingKeywords: []
      };
    }
  }

  // 6. Check for missing keywords
  const missingKws = expectedKeywords.filter(kw => !code.toLowerCase().includes(kw.toLowerCase()));
  if (missingKws.length > 0) {
    return {
      hasError: true,
      errorType: "LogicError",
      errorMessage: `Missing expected keywords or libraries: "${missingKws.join(', ')}"`,
      detailedExplanation: `Your code lacks certain key algorithmic constructs, modules, or variables required by this data science question (missing: ${missingKws.map(k => `'${k}'`).join(', ')}). Make sure you implement the logic as specified.`,
      missingKeywords: missingKws
    };
  }

  // 7. If there are no clear syntax errors, look for basic keyword mismatches, but otherwise return success
  return {
    hasError: false,
    errorType: "",
    errorMessage: "",
    detailedExplanation: "No syntactic or algorithmic discrepancies found. The written code matches the ideal structure perfectly!",
    missingKeywords: []
  };
}
