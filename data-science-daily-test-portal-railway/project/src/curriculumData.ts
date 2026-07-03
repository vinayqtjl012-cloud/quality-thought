import { DayQuiz, MCQQuestion, CodingQuestion, getCourseForDay, getTopicTitleForDay } from "./types.js";

// Days matching the OCR pdf screenshots exactly
export const PRESET_DAILY_QUIZZES: Record<number, { topicTitle: string; mcqs: MCQQuestion[]; coding: CodingQuestion[] }> = {
  1: {
    topicTitle: "Python | Variables & Data Types",
    mcqs: [
      {
        questionText: "What is the output of bool('') in Python?",
        options: ["True", "False", "None", "Error"],
        correctOption: 1,
        explanation: "In Python, empty strings are evaluated as falsy. Therefore, bool('') evaluates to False."
      },
      {
        questionText: "Which method removes and returns the last item of a list?",
        options: ["remove()", "del()", "pop()", "discard()"],
        correctOption: 2,
        explanation: "The pop() method removes and returns the last item from a list (or at the specified index if supplied)."
      },
      {
        questionText: "What does the // operator do in Python?",
        options: ["Division", "Floor division", "Modulo", "Power"],
        correctOption: 1,
        explanation: "The // operator performs floor division, which divides the numbers and rounds down to the nearest integer."
      },
      {
        questionText: "What is the correct way to open a file for writing?",
        options: ["open('f','r')", "open('f','w')", "open('f','a+')", "open('f','x')"],
        correctOption: 1,
        explanation: "Using mode 'w' to open a file gets it ready specifically for writing, clearing existing contents if any."
      },
      {
        questionText: "Which of these is immutable in Python?",
        options: ["list", "dict", "set", "tuple"],
        correctOption: 3,
        explanation: "Tuples are immutable sequence types in Python. Lists, dicts, and sets can be mutated after creation."
      },
      {
        questionText: "What does enumerate() return?",
        options: ["A list", "A dict", "An iterator of (index, value) tuples", "A set"],
        correctOption: 2,
        explanation: "The built-in function enumerate() takes a collection and returns an enumerate object as an iterator of tuples containing (index, item)."
      },
      {
        questionText: "What is the output of [x**2 for x in range(4)]?",
        options: ["[1,4,9,16]", "[0,1,4,9]", "[0,1,2,3]", "[1,2,3,4]"],
        correctOption: 1,
        explanation: "The range(4) contains values 0, 1, 2, 3. Squaring each yields [0, 1, 4, 9]."
      },
      {
        questionText: "Which keyword exits a loop immediately?",
        options: ["exit", "pass", "continue", "break"],
        correctOption: 3,
        explanation: "The break statement terminates the current loop and continues execution at the next outer block statement."
      }
    ],
    coding: [
      {
        questionText: "Write a function factorial(n) using recursion.",
        starterCode: "def factorial(n):\n    pass",
        expectedKeywords: ["def", "if", "<=", "return", "*"],
        solutionDescription: "def factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n-1)"
      },
      {
        questionText: "Write a generator function that yields squares of numbers 1 to n.",
        starterCode: "def squares(n):\n    pass",
        expectedKeywords: ["yield", "for", "range", "**"],
        solutionDescription: "def squares(n):\n    for i in range(1, n+1):\n        yield i**2"
      }
    ]
  },
  2: {
    topicTitle: "Python | Strings & String Methods",
    mcqs: [
      {
        questionText: "What does *args collect in a function?",
        options: ["Keyword args", "Positional args as tuple", "Dict of args", "Default args"],
        correctOption: 1,
        explanation: "*args allows a function to accept any number of positional arguments as a tuple."
      },
      {
        questionText: "What is a Python decorator?",
        options: ["A comment style", "A function that wraps another function", "A class method", "A module"],
        correctOption: 1,
        explanation: "A decorator takes a function, wraps its behavior in another helper, and returns the modified function."
      },
      {
        questionText: "Which built-in sorts a list in-place?",
        options: ["sorted()", "list.sort()", "order()", "arrange()"],
        correctOption: 1,
        explanation: "list.sort() modifies the original list in-place. sorted() returns a new sorted list."
      },
      {
        questionText: "What does zip([1,2],[3,4]) produce?",
        options: ["[(1,2),(3,4)]", "[(1,3),(2,4)]", "[1,2,3,4]", "Error"],
        correctOption: 1,
        explanation: "zip aggregates elements from each iterable in order, pairing 1 with 3, and 2 with 4."
      },
      {
        questionText: "How do you inherit from Animal class in Python?",
        options: ["class Dog extends Animal", "class Dog(Animal):", "class Dog inherits Animal", "def Dog(Animal):"],
        correctOption: 1,
        explanation: "Python specifies inheritance by putting parent classes inside parentheses after the class name."
      },
      {
        questionText: "What is the default return value of a function with no return?",
        options: ["0", "''", "None", "False"],
        correctOption: 2,
        explanation: "If no return expression is executed, Python functions return None by default."
      },
      {
        questionText: "Which module is used for regular expressions?",
        options: ["regex", "re", "regexp", "string"],
        correctOption: 1,
        explanation: "The standard library module 're' provides comprehensive regex search and match tools."
      },
      {
        questionText: "What does dict.get('key','default') do?",
        options: ["Sets a key", "Returns value or default if missing", "Deletes a key", "Raises KeyError"],
        correctOption: 1,
        explanation: "get() returns the key's value if present; otherwise, it fallback-returns the default argument without raising an exception."
      }
    ],
    coding: [
      {
        questionText: "Write a class Rectangle with area() and perimeter() methods.",
        starterCode: "class Rectangle:\n    pass",
        expectedKeywords: ["class", "__init__", "self", "return"],
        solutionDescription: "class Rectangle:\n    def __init__(self, w, h):\n        self.w = w\n        self.h = h\n    def area(self):\n        return self.w * self.h\n    def perimeter(self):\n        return 2 * (self.w + self.h)"
      },
      {
        questionText: "Using try/except, write code that converts input to int and handles ValueError.",
        starterCode: "def safe_int(val):\n    pass",
        expectedKeywords: ["try", "except", "ValueError", "return"],
        solutionDescription: "def safe_int(val):\n    try:\n        return int(val)\n    except ValueError:\n        return None"
      }
    ]
  },
  3: {
    topicTitle: "Python | Lists & Tuples",
    mcqs: [
      {
        questionText: "Which is the correct lambda to square a number?",
        options: ["lambda x: x*x", "def sq(x): x*x", "x => x*x", "lambda(x) x**2"],
        correctOption: 0,
        explanation: "The syntax 'lambda x: x*x' creates an anonymous online function squaring input."
      },
      {
        questionText: "What does 'with open(file) as f:' ensure?",
        options: ["File is created", "File is auto-closed after block", "File is read only", "File is deleted"],
        correctOption: 1,
        explanation: "The with statement uses python context managers to guarantee file close streams clean up after local block endings."
      },
      {
        questionText: "What does set([1,1,2,3,3]) return?",
        options: ["{1,1,2,3,3}", "{1,2,3}", "[1,2,3]", "Error"],
        correctOption: 1,
        explanation: "Sets represent unique elements, stripping out the duplicate 1 and 3 integers."
      },
      {
        questionText: "Which method joins a list of strings into a single string?",
        options: ["list.join()", "str.join(list)", "''.join(list)", "join(list)"],
        correctOption: 2,
        explanation: "Using an empty delimiter ''.join(list) concatenates all list string parts synchronously."
      },
      {
        questionText: "What is the output of bool('') in Python?",
        options: ["True", "False", "None", "Error"],
        correctOption: 1,
        explanation: "Empty strings are evaluated as falsy. So, bool('') yields False."
      },
      {
        questionText: "Which method removes and returns the last item of a list?",
        options: ["remove()", "del()", "pop()", "discard()"],
        correctOption: 2,
        explanation: "pop() operates in-place, removing and returning the element at the requested or last index."
      },
      {
        questionText: "What does the // operator do in Python?",
        options: ["Division", "Floor division", "Modulo", "Power"],
        correctOption: 1,
        explanation: "Floor division rounds down to the nearest integer below."
      },
      {
        questionText: "What is the correct way to open a file for writing?",
        options: ["open('f','r')", "open('f','w')", "open('f','a+')", "open('f','x')"],
        correctOption: 1,
        explanation: "'w' is the write flag context for standard open file operations."
      }
    ],
    coding: [
      {
        questionText: "Write a decorator 'timer' that prints execution time of any function.",
        starterCode: "import time\n\ndef timer(func):\n    pass",
        expectedKeywords: ["def", "time", "wrapper", "return"],
        solutionDescription: "def timer(func):\n    def wrapper(*a,**k):\n        s=time.time(); r=func(*a,**k)\n        print(f'{func.__name__}: {time.time()-s:.4f}s')\n        return r\n    return wrapper"
      },
      {
        questionText: "Write a function factorial(n) using recursion.",
        starterCode: "def factorial(n):\n    pass",
        expectedKeywords: ["factorial", "return", "if"],
        solutionDescription: "def factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n-1)"
      }
    ]
  }
};

// Generate high quality presets for any remaining days
export function getStaticPresetQuiz(dayNumber: number): DayQuiz | null {
  const course = getCourseForDay(dayNumber);
  const topicTitle = getTopicTitleForDay(dayNumber);

  // If we have an exact preset, use it
  if (PRESET_DAILY_QUIZZES[dayNumber]) {
    const data = PRESET_DAILY_QUIZZES[dayNumber];
    return {
      dayNumber,
      courseSlug: course.slug,
      topicTitle: data.topicTitle,
      mcqs: data.mcqs,
      coding: data.coding
    };
  }

  // Fallback to cyclical patterns if day is greater, but specialize the questions based on subject
  return null;
}
