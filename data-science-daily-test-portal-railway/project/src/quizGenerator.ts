import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { DayQuiz, getCourseForDay, getTopicTitleForDay, MCQQuestion, CodingQuestion } from "./types.js";
import { PRESET_DAILY_QUIZZES } from "./curriculumData.js";

// Lazy-initialize Gemini API client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
    try {
      aiClient = new GoogleGenAI({ apiKey });
      return aiClient;
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI client:", e);
    }
  }
  return null;
}

async function generateContentWithRetry(ai: any, params: any, retries: number = 3, delayMs: number = 1000): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errMsg = String(err.message || err);
      const errStatus = err.status || (err.error?.code) || 0;
      const isTransient = errMsg.includes("503") || 
                          errMsg.includes("UNAVAILABLE") || 
                          errMsg.includes("429") || 
                          errMsg.includes("RESOURCE_EXHAUSTED") || 
                          errStatus === 503 || 
                          errStatus === 429;
      if (isTransient && attempt < retries) {
        console.warn(`[Gemini API] Transient error (attempt ${attempt}/${retries}): ${errMsg}. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      } else {
        throw err;
      }
    }
  }
}

// Fallback questions dictionary for all 8 subjects to guarantee perfect operation-mode
const SUBJECT_FALLBACKS: Record<string, { mcqs: MCQQuestion[]; coding: CodingQuestion[] }> = {
  python: {
    mcqs: [
      {
        questionText: "What is the output of the code: print(type([1, 2] * 2)) in Python?",
        options: [
          "<class 'list'>",
          "<class 'tuple'>",
          "<class 'int'>",
          "TypeError: unsupported operand"
        ],
        correctOption: 0,
        explanation: "Multiplying a list by an integer duplicates the elements in a nested or flat list, but the resulting object type remains a list."
      },
      {
        questionText: "Which keyword is used to handle exceptions caught during run-time execution in Python?",
        options: ["catch", "try", "except", "throws"],
        correctOption: 2,
        explanation: "Python uses 'except' block to catch and handle exceptions, unlike Java/JS which use 'catch'."
      },
      {
        questionText: "What is the difference between list.append(x) and list.extend(x) in Python?",
        options: [
          "append adds x as a single element, extend adds elements of collection x individually",
          "extend adds x as a single element, append adds elements of x individually",
          "There is no difference, both are aliases",
          "append works in-place, extend returns a new list"
        ],
        correctOption: 0,
        explanation: "append() adds its argument as a single element to the end of a list. extend() iterates over its argument adding each element to the list."
      },
      {
        questionText: "Which of the following creates a dictionary with keys 'a' and 'b' initialized to 0?",
        options: [
          "dict.fromkeys(['a', 'b'], 0)",
          "{'a', 'b'}.fromkeys(0)",
          "dict({'a': 0, 'b'})",
          "dict.zip(['a', 'b'], [0])"
        ],
        correctOption: 0,
        explanation: "The classmethod dict.fromkeys(iterable, value) returns a new dictionary with keys from iterable and values set to value."
      },
      {
        questionText: "What does the '__init__' method represent in Python classes?",
        options: [
          "A destroyer function",
          "A static initializer",
          "The class constructor method called upon object creation",
          "An inheritance declaration tag"
        ],
        correctOption: 2,
        explanation: "The __init__ method is the constructor for a class. It is automatically called when a new instance is created."
      },
      {
        questionText: "How do you check if a key 'score' exists in a dictionary variables 'student_data'?",
        options: [
          "student_data.has_key('score')",
          "'score' in student_data",
          "student_data.contains('score')",
          "student_data.find('score')"
        ],
        correctOption: 1,
        explanation: "The modern Pythonic way to test dictionary key presence is the 'in' operator, e.g. 'key' in dict."
      },
      {
        questionText: "What is the output of the statement: len({1, 1, 2, 3, 3})?",
        options: ["5", "3", "2", "4"],
        correctOption: 1,
        explanation: "{1, 1, 2, 3, 3} creates a Set. Since Sets contain only unique elements, it results in {1, 2, 3}, which has a size/length of 3."
      },
      {
        questionText: "What type of scope resolution does Python follow?",
        options: [
          "Dynamic scope binding",
          "LEGB (Local, Enclosing, Global, Built-in)",
          "Global-first lookup",
          "Strict lexical block scope"
        ],
        correctOption: 1,
        explanation: "Python resolves variable lookups using the LEGB rule: Local, Enclosing function locals, Global (module-level), and Built-in names."
      }
    ],
    coding: [
      {
        questionText: "Write a function 'find_primes(n)' that takes an integer n and returns a list of prime numbers up to n.",
        starterCode: "def find_primes(n):\n    # Write your Python code below\n    primes = []\n    return primes",
        expectedKeywords: ["def", "range", "append", "return"],
        solutionDescription: "Iterate from 2 up to n. For each number, check if it has any divisor between 2 and its square root. If none exist, append it to the primes array."
      },
      {
        questionText: "Write a function 'word_frequencies(sentence)' that takes a sentence string and returns a dictionary counting occurrences of each unique word (case-insensitive).",
        starterCode: "def word_frequencies(sentence):\n    # Write your Python code below\n    freq = {}\n    return freq",
        expectedKeywords: ["def", "split", "lower", "return"],
        solutionDescription: "Split the sentence using lower() to get all words in lowercase, and then iterate to build or update a dictionary counter."
      }
    ]
  },
  numpy: {
    mcqs: [
      {
        questionText: "Which of the following is the standard way to import the NumPy library?",
        options: [
          "import numpy as np",
          "import num_py as np",
          "from numpy import *",
          "import np from numpy"
        ],
        correctOption: 0,
        explanation: "import numpy as np is the standard canonical convention followed in data science."
      },
      {
        questionText: "How do you create an array filled with zeros of shape (3, 4) in NumPy?",
        options: [
          "np.zeros(3, 4)",
          "np.zeros((3, 4))",
          "np.make_array(3, 4, fill=0)",
          "np.empty_zeros(3, 4)"
        ],
        correctOption: 1,
        explanation: "The shape parameter to np.zeros() must be given as an integer or tuple of integers, i.e., (3, 4)."
      },
      {
        questionText: "What is broadcasting in NumPy?",
        options: [
          "Transmitting arrays across network buffers",
          "NumPy's ability to perform arithmetic operations on arrays of different matching shapes",
          "Reshaping arrays by flattening them",
          "Printing multi-dimensional matrices to standard output"
        ],
        correctOption: 1,
        explanation: "Broadcasting is how NumPy treats arrays with different shapes during arithmetic operations, stretching the smaller array to match the larger."
      },
      {
        questionText: "How do you calculate the dot product of two NumPy arrays 'A' and 'B'?",
        options: ["A * B", "np.dot(A, B) or A @ B", "A.dot_product(B)", "np.multiply_dot(A, B)"],
        correctOption: 1,
        explanation: "A * B does element-wise multiplication. For matrix dot products, use np.dot(A, B), A.dot(B), or the modern py @ operator."
      },
      {
        questionText: "Which attribute tells you the number of dimensions of a NumPy array?",
        options: ["arr.ndim", "arr.shape", "arr.size", "arr.dim_count"],
        correctOption: 0,
        explanation: "arr.ndim stores the number of dimensions (axes) of an array as an integer."
      },
      {
        questionText: "What happens when you slice a NumPy array (e.g., sub = arr[0:2]) and modify an element in 'sub'?",
        options: [
          "Only 'sub' is changed, NumPy makes copy by default",
          "The original 'arr' is also updated because slices are views of the same memory allocation",
          "It raises a ReadOnlyMemoryException",
          "It creates an independent list copy"
        ],
        correctOption: 1,
        explanation: "To keep memory overhead low, NumPy slices return a 'view' of the parent array rather than a copy. Modifications alter the original."
      },
      {
        questionText: "How do you reshape an array of 12 elements into a matrix of 3 rows and 4 columns?",
        options: ["arr.reshape(3, 4)", "arr.set_shape(3, 4)", "np.change_shape(arr, (3, 4))", "arr.resize_matrix(4, 3)"],
        correctOption: 0,
        explanation: "arr.reshape(3, 4) or arr.reshape((3, 4)) changes the dimensions of the array without copying data."
      },
      {
        questionText: "What is the NumPy method to get the index of the maximum value inside a 1D array?",
        options: ["arr.imax()", "np.argmax(arr)", "arr.max_index()", "np.max_idx(arr)"],
        correctOption: 1,
        explanation: "argmax returns the index of the maximum value along a specified axis. For a 1D array, np.argmax(arr) works."
      }
    ],
    coding: [
      {
        questionText: "Write a NumPy function 'normalize_array(arr)' that takes a 1D numpy array, subtracts its mean, and divides by its standard deviation.",
        starterCode: "import numpy as np\n\ndef normalize_array(arr):\n    # Write your NumPy code below\n    return arr",
        expectedKeywords: ["mean", "std", "np"],
        solutionDescription: "Compute mean using arr.mean() or np.mean(arr), compute standard deviation using arr.std(), and then return (arr - mean) / std."
      },
      {
        questionText: "Write a function 'filter_matrix(matrix, threshold)' that returns all elements in a 2D matrix that are strictly greater than 'threshold' as a 1D array.",
        starterCode: "import numpy as np\n\ndef filter_matrix(matrix, threshold):\n    # Write your NumPy code below\n    return matrix",
        expectedKeywords: ["matrix", "threshold", "np"],
        solutionDescription: "Create a boolean mask by doing matrix > threshold, and then index the matrix with the mask: matrix[matrix > threshold]."
      }
    ]
  },
  pandas: {
    mcqs: [
      {
        questionText: "Which method is used to preview the first 5 rows of a Pandas DataFrame?",
        options: ["df.first(5)", "df.top()", "df.head()", "df.show_rows(5)"],
        correctOption: 2,
        explanation: "df.head() displays the first 5 rows of a DataFrame by default."
      },
      {
        questionText: "What is the difference between df.loc and df.iloc in Pandas?",
        options: [
          "loc is label-based selection, whereas iloc is integer-index based selection",
          "iloc is label-based selection, whereas loc is integer-index based selection",
          "loc selects columns only, iloc selects rows only",
          "loc does not support slicing, iloc supports slicing"
        ],
        correctOption: 0,
        explanation: "loc searches by row/column index labels, whereas iloc extracts values by their raw integer order (0-indexed offset)."
      },
      {
        questionText: "How do you drop columns 'Age' and 'Salary' from a DataFrame 'df' in-place?",
        options: [
          "df.drop(['Age', 'Salary'], axis=1, inplace=True)",
          "df.remove_cols(['Age', 'Salary'])",
          "df.drop_columns(['Age', 'Salary'])",
          "df.delete_axis(['Age', 'Salary'], inplace=True)"
        ],
        correctOption: 0,
        explanation: "df.drop() with axis=1 (or columns=['Age', 'Salary']) and inplace=True deletes columns directly within the variable memory."
      },
      {
        questionText: "Which method is used to count non-null values for each column in a DataFrame?",
        options: ["df.count()", "df.isnull_count()", "df.info_non_null()", "df.size_clean()"],
        correctOption: 0,
        explanation: "df.count() returns the number of non-NA/null observations for each column/row."
      },
      {
        questionText: "How would you fill all NaN values in a column 'Score' with the median of that column?",
        options: [
          "df['Score'].fillna(df['Score'].median(), inplace=True)",
          "df['Score'].fill_nan(df['Score'].median())",
          "df.replace_nulls('Score', fill='median')",
          "np.fillna(df['Score'], strategy='median')"
        ],
        correctOption: 0,
        explanation: "The standard pandas way is using series.fillna(value, inplace=True) with the column's computed median()."
      },
      {
        questionText: "What does df.groupby('City')['Revenue'].mean() do in Pandas?",
        options: [
          "Groups data by City and returns the average Revenue for each unique city",
          "Groups data by Revenue and calculates the average city count",
          "Filters out rows matching the keyword City or Revenue",
          "Sorts the city DataFrame by overall Revenue"
        ],
        correctOption: 0,
        explanation: "It groups rows matching the unique values of 'City', isolates the 'Revenue' column, and then calculates the mean for each group."
      },
      {
        questionText: "How do you export/save a Pandas DataFrame into a CSV file without exporting the row indexes?",
        options: [
          "df.to_csv('out.csv', index=False)",
          "df.export_csv('out.csv', no_index=True)",
          "df.write_csv('out.csv', include_idx=False)",
          "df.save_to_file('out.csv', index=None)"
        ],
        correctOption: 0,
        explanation: "Passing index=False to df.to_csv() prevents pandas from printing the index counter as the first column of the CSV sheet."
      },
      {
        questionText: "Which Pandas function is used to concatenate multiple DataFrames along rows or columns?",
        options: ["pd.concat()", "pd.merge()", "df.append_all()", "pd.join_frames()"],
        correctOption: 0,
        explanation: "pd.concat([df1, df2], axis=0/1) binds multiple DataFrames along rows (axis=0) or columns (axis=1)."
      }
    ],
    coding: [
      {
        questionText: "Write a Pandas function 'filter_active_adults(df)' that accepts a DataFrame with columns 'Age' and 'Status', and filters it returning rows where 'Age' is 18 or above AND 'Status' is equal to 'Active'.",
        starterCode: "import pandas as pd\n\ndef filter_active_adults(df):\n    # Write your Pandas code below\n    return df",
        expectedKeywords: ["df", "Age", "Status", "Active"],
        solutionDescription: "Apply boolean indexing: df[(df['Age'] >= 18) & (df['Status'] == 'Active')]. Parentheses are required around each separate conditional branch in Pandas."
      },
      {
        questionText: "Write a function 'compute_average_salary(df)' that groups a DataFrame with columns 'Department' and 'Salary' by 'Department', computes the average 'Salary', and returns the resulting Series.",
        starterCode: "import pandas as pd\n\ndef compute_average_salary(df):\n    # Write your Pandas code below\n    return None",
        expectedKeywords: ["groupby", "Department", "Salary", "mean"],
        solutionDescription: "Group the dataset of employees by 'Department', select 'Salary', and call .mean(): df.groupby('Department')['Salary'].mean()"
      }
    ]
  },
  ml: {
    mcqs: [
      {
        questionText: "Which package provides standard ready-to-use supervised learning models in python?",
        options: ["scikit-learn", "tensorflow", "pytorch", "statsmodels"],
        correctOption: 0,
        explanation: "scikit-learn is the standard library for traditional ML in python."
      },
      {
        questionText: "What represents the 'target variable' inside supervised learning equations?",
        options: ["X", "y", "weights", "intercept"],
        correctOption: 1,
        explanation: "y commonly denotes vectors of correct targets, while matrix X denotes the features."
      },
      {
        questionText: "What is the primary indicator of overfitting in machine learning?",
        options: ["High training error, low test error", "High training error, high test error", "Low training error, high test error", "Zero training time"],
        correctOption: 2,
        explanation: "Overfitting occurs when a model fits noisy features of the training set well (low training error), but cannot generalize to test datasets (high test error)."
      },
      {
        questionText: "What is the purpose of Cross Validation in model selection?",
        options: [
          "To test models on other servers",
          "To secure model binaries",
          "To evaluate model generalizability by training and testing on multiple partitions of the dataset",
          "To shuffle features horizontally"
        ],
        correctOption: 2,
        explanation: "Cross-validation divides the dataset into multiple k-folds to train/validate the model repeatedly, avoiding variance bias."
      },
      {
        questionText: "In a classification task, what is the 'confusion matrix' used for?",
        options: [
          "To encrypt predictions",
          "To see counts of True Positives, True Negatives, False Positives, and False Negatives",
          "To calculate matrix gradients",
          "To clean string inputs"
        ],
        correctOption: 1,
        explanation: "A confusion matrix shows classification performance metrics: true/false positives and negatives."
      },
      {
        questionText: "What is K-means clustering strictly used for?",
        options: [
          "Supervised classification of labels",
          "Unsupervised clustering of similar unlabeled observations",
          "Predicting continuous numerical trends",
          "Preprocessing image pixels"
        ],
        correctOption: 1,
        explanation: "K-Means is an unsupervised learning model that groups data into K distinct clusters based on Euclidean distances without target annotations."
      },
      {
        questionText: "What does the 'Coefficient of Determination' (R-squared) represent in Regressions?",
        options: [
          "The accuracy score of classifiers",
          "The proportion of variance in the dependent target variable that is predictable from the independent variables",
          "The slope angle of the regress line",
          "The number of variables in regularizations"
        ],
        correctOption: 1,
        explanation: "R² measures regression goodness of fit, denoting the percentage of variance predictable by variables (up to 1.0)."
      },
      {
        questionText: "Which technique is commonly used to prevent overfitting in models by penalizing high weights coefficients?",
        options: ["Regularization (L1 Lasso / L2 Ridge)", "Boosting", "Random Oversampling", "StandardNormalization"],
        correctOption: 0,
        explanation: "L1 (Lasso) and L2 (Ridge) add penalty penalties to structural loss functions to prevent coefficients from growing too large."
      }
    ],
    coding: [
      {
        questionText: "Write a scikit-learn training snippet 'train_logistic_regression(X_train, y_train)' that initializes a LogisticRegression model, fits it with training data, and returns the fitted model object.",
        starterCode: "from sklearn.linear_model import LogisticRegression\n\ndef train_logistic_regression(X_train, y_train):\n    # Write your code below\n    model = None\n    return model",
        expectedKeywords: ["LogisticRegression", "fit", "return"],
        solutionDescription: "Instantiate: lr = LogisticRegression(). Fit: lr.fit(X_train, y_train). Finally, return lr."
      },
      {
        questionText: "Write a function 'split_and_scale(X, y)' that splits features and targets into train/test sets (80% train, 20% test, random_state=42), fits a StandardScaler on X_train, scales X_train and X_test, and returns (X_train_scaled, X_test_scaled, y_train, y_test).",
        starterCode: "from sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\n\ndef split_and_scale(X, y):\n    # Write your code below\n    return None",
        expectedKeywords: ["train_test_split", "StandardScaler", "fit_transform", "transform"],
        solutionDescription: "Use train_test_split to divide X and y. Then create StandardScaler(), call fit_transform on train data, and transform on test data."
      }
    ]
  },
  dl: {
    mcqs: [
      {
        questionText: "What is an activation function used for in Neural Networks?",
        options: [
          "Encrypting weight vectors",
          "To introduce non-linearities, enabling the model to learn complex high-dimensional mappings",
          "Accelerating CPU threads",
          "Normalizing target standard deviations"
        ],
        correctOption: 1,
        explanation: "Without non-linear activation functions (like ReLU, Sigmoid), stacking layers would just approximate simple linear combinations."
      },
      {
        questionText: "Which optimizer utilizes adaptive learning rates for each parameter?",
        options: ["Vanilla SGD", "Adam", "StepDecay", "MomentumOnly"],
        correctOption: 1,
        explanation: "Adam (Adaptive Moment Estimation) computes adaptive learning rates for each weight parameter based on first and second moments of gradients."
      },
      {
        questionText: "In deep learning, what is a CNN (Convolutional Neural Network) primarily optimized for?",
        options: ["Tabular spreadsheets", "Grid-like topology structures (images/pixels)", "Audio streams exclusively", "Text corpus translations"],
        correctOption: 1,
        explanation: "CNNs use modular convolutional filters targeting local receptive fields, making them optimal for processing 2D image matrices."
      },
      {
        questionText: "What is backpropagation in training artificial neural networks?",
        options: [
          "Feeding target inputs backward on disk",
          "An algorithm that calculates helper gradients of loss functions with respect to network weights via chain rule",
          "Shrinking layers when accuracy decreases",
          "A server restart procedure"
        ],
        correctOption: 1,
        explanation: "Backprop uses the chain rule of calculus to compute loss gradients with respect to each weight, working backward from output layers."
      },
      {
        questionText: "What does the term 'vanishing gradient' refer to?",
        options: [
          "A database error",
          "Gradients shrinking exponentially toward zero in initial layers during backprop, locking weights from updating",
          "Optimizers converging instantly",
          "Data files disappearing on training hosts"
        ],
        correctOption: 1,
        explanation: "During deep propagation back through highly saturated functions (e.g. sigmoid), derivatives multiply down to nearly 0, locking base layer updates."
      },
      {
        questionText: "Which function is optimally used as the output activator for multi-class classification?",
        options: ["ReLU", "Sigmoid", "Softmax", "Tanh"],
        correctOption: 2,
        explanation: "Softmax outputs a normalized probability distribution representing class predictions that sum exactly to 1.0."
      },
      {
        questionText: "What does 'Dropout' do during neural network training iterations?",
        options: [
          "Deletes columns in database",
          "Randomly turns off a fraction of neuron units to prevent excessive co-dependencies and overfitting",
          "Stops training execution early",
          "Clears memory parameters"
        ],
        correctOption: 1,
        explanation: "Dropout is a regularization tool where nodes are dropped with probability p on updates, forcing the network to learn robust, decentralized patterns."
      },
      {
        questionText: "What is the key structural benefit of an LSTM (Long Short-Term Memory) cell over standard RNNs?",
        options: [
          "Faster graphics rendering",
          "The inclusion of gated memory channels (cell state) that allow capturing long-term dependencies without vanishing values",
          "It does not require weight variables",
          "It runs completely in linear time complexity"
        ],
        correctOption: 1,
        explanation: "LSTMs use gates (input, forget, output) to protect and maintain a linear cell state channel, avoiding gradient dissipation over long text sequences."
      }
    ],
    coding: [
      {
        questionText: "Write a TensorFlow/Keras snippet 'create_simple_mlp()' that returns a Sequential model with a Flatten input layer, a Dense layer of 64 neurons with 'relu' activation, and an output Dense layer of 10 neurons with 'softmax' activation.",
        starterCode: "import tensorflow as tf\n\ndef create_simple_mlp():\n    model = tf.keras.models.Sequential([\n        # Add layers here\n    ])\n    return model",
        expectedKeywords: ["Sequential", "Flatten", "Dense", "relu", "softmax"],
        solutionDescription: "Construct: tf.keras.models.Sequential([tf.keras.layers.Flatten(), tf.keras.layers.Dense(64, activation='relu'), tf.keras.layers.Dense(10, activation='softmax')])"
      },
      {
        questionText: "Write a PyTorch initialization snippet 'get_adam_optimizer(model_params, lr=0.001)' that returns an Adam optimizer initialized with parameter targets and target learning rate.",
        starterCode: "import torch\nimport torch.nn as nn\n\ndef get_adam_optimizer(model_params, lr=0.001):\n    # Write code below\n    optimizer = None\n    return optimizer",
        expectedKeywords: ["optim", "Adam", "lr", "return"],
        solutionDescription: "Import torch.optim and initialize: torch.optim.Adam(model_params, lr=lr) then return."
      }
    ]
  },
  nlp: {
    mcqs: [
      {
        questionText: "What does TF-IDF represent in textual vector extraction?",
        options: [
          "Term Frequency - Inverse Document Frequency",
          "Total Formatting - Input Data Feed",
          "Token Filter - Index Directory Finder",
          "Text Formatting - Information Density Filter"
        ],
        correctOption: 0,
        explanation: "TF-IDF scores a term's relevance based on local occurrence (TF) penalized by global dataset commonality (IDF)."
      },
      {
        questionText: "Which tokenization step reduces words like 'running' and 'runs' to their root word 'run' using grammatical checks?",
        options: ["Stop-word filtering", "Stemming", "Lemmatization", "Chunking"],
        correctOption: 2,
        explanation: "Lemmatization uses morphological and vocabulary analysis to return true dictionary bases (lemmata), while stemming crudely cuts suffixes."
      },
      {
        questionText: "What is a 'stop word' in NLP?",
        options: [
          "A broken syntax character",
          "Frequently occurring words like 'the', 'is', 'and' that can be filtered to emphasize content words",
          "A command that stops execution loops",
          "A token signifying sentence boundaries"
        ],
        correctOption: 1,
        explanation: "Stop words are high-frequency connector words carrying minimal unique topical information, which are often filtered."
      },
      {
        questionText: "What is Word2Vec in natural language processing?",
        options: [
          "An algorithm for counting occurrences of variables",
          "A shallow neural network architecture model that learns dense vector representations of tokens preserving semantic similarities",
          "A document compression package",
          "A text storage matrix mapping keys"
        ],
        correctOption: 1,
        explanation: "Word2Vec generates high-quality distributed vector word embeddings where similar words reside near each other in multi-dimensional space."
      },
      {
        questionText: "In modern sequence modeling, what design component solved the bottleneck of encoding long sequences with fixed-size matrices?",
        options: ["GRU units", "Convolution filters", "Attention Mechanisms", "Recurrent cell stacks"],
        correctOption: 2,
        explanation: "Attention mechanisms allow model representations to reference all input tokens in parallel rather than routing sequence histories through restricted vectors."
      },
      {
        questionText: "Which transformer-based model was open-sourced by Google and revolutionized bi-directional context understanding?",
        options: ["GPT-2", "BERT", "ResNet", "TF-IDF"],
        correctOption: 1,
        explanation: "BERT (Bidirectional Encoder Representations from Transformers) learns context representations from both directions of a text sequence simultaneously."
      },
      {
        questionText: "What is the process of identifying proper noun entities like 'Google' (Organization) or 'London' (Location) in sentences?",
        options: ["Part-of-Speech tagging", "Sentiment lexicon analysis", "Named Entity Recognition (NER)", "Co-reference resolution"],
        correctOption: 2,
        explanation: "NER extracts semantic instances like persons, dates, locations, and organizations into typed categories."
      },
      {
        questionText: "Which standard NLP library is built for industrial-strength production processing in Python?",
        options: ["NLTK", "SpaCy", "re", "scikit-learn"],
        correctOption: 1,
        explanation: "While NLTK is excellent for education and academic study, SpaCy is optimized and compiled for real-time production throughput."
      }
    ],
    coding: [
      {
        questionText: "Write a function 'tokenize_and_clean(text)' using pure Python that converts a string to lowercase, filters out characters that are not alphabetic or whitespace, and returns a list of individual word tokens.",
        starterCode: "def tokenize_and_clean(text):\n    # Write Python code below\n    tokens = []\n    return tokens",
        expectedKeywords: ["lower", "isalpha", "split"],
        solutionDescription: "Call text.lower(). Iteratively verify character statuses or use a regex to retain spaces and letters, splitting the clean result into substrings."
      },
      {
        questionText: "Write an NLP feature block using scikit-learn 'extract_tfidf(corpus)' that fits a TfidfVectorizer on a list of texts 'corpus' and returns the dense representation matrix of tfidf features.",
        starterCode: "from sklearn.feature_extraction.text import TfidfVectorizer\n\ndef extract_tfidf(corpus):\n    # Write code below\n    return None",
        expectedKeywords: ["TfidfVectorizer", "fit_transform", "return"],
        solutionDescription: "Instantiate vectorizer = TfidfVectorizer(), invoke fit_transform(corpus), and return the resulting matrix."
      }
    ]
  },
  genai: {
    mcqs: [
      {
        questionText: "What is the primary objective of PEFT (Parameter-Efficient Fine-Tuning) techniques like LoRA?",
        options: [
          "To speed up database uploads",
          "To fine-tune LLMs by updating only a fraction of parameters, reducing memory costs from gigabytes to megabytes",
          "To encrypt prompt histories on servers",
          "To translate code to english"
        ],
        correctOption: 1,
        explanation: "LoRA (Low-Rank Adaptation) freezes model weights and adds small trainable rank decomposition matrices, greatly reducing hardware fine-tune requirements."
      },
      {
        questionText: "What is RAG (Retrieval-Augmented Generation) in Generative AI?",
        options: [
          "A tool for scanning image classifications",
          "Retrieving context from external documents or a database and embedding it in the prompt to ground model outputs in factual data",
          "An audio synthesizer package",
          "A prompt backup server framework"
        ],
        correctOption: 1,
        explanation: "RAG searches domain knowledge vectors first, attaching matching reference records to the API payload so the LLM outputs anchored facts."
      },
      {
        questionText: "In vector search engines, why do we store text documents as token vector embeddings?",
        options: [
          "To compress raw texts on disk",
          "To execute lexical matching indices",
          "To compute rapid semantic similarities (e.g., Cosine similarity) representing concepts, not just literal strings",
          "To format characters as HTML"
        ],
        correctOption: 2,
        explanation: "Embeddings place semantic meaning in vector dimensions: cosine similarity isolates conceptual overlaps across different phrases."
      },
      {
        questionText: "What constitutes the core role of LangChain in model deployments?",
        options: [
          "To host model weights on decentralized blockchains",
          "A framework designed to compose LLM calls, chain prompts, vector stores, memory trackers, and file loaders together seamlessly",
          "To format JSON output variables",
          "To speed up pytorch CUDA kernels"
        ],
        correctOption: 1,
        explanation: "LangChain is a widely-used design framework providing utility abstractions to assemble custom modular compound components around LLMs."
      },
      {
        questionText: "What are 'system instructions' (or system prompts) used for in LLMs?",
        options: [
          "Restarting container servers",
          "Setting the baseline behavior, framing constraints, persona, and rules of engagement before user dialog begins",
          "Formatting diagnostic logs",
          "Generating HTML style code templates"
        ],
        correctOption: 1,
        explanation: "System instructions govern structural boundaries, output restrictions, and behavioral tone throughout model dialog sessions."
      },
      {
        questionText: "How does 'Few-Shot Prompting' help a model deliver better responses?",
        options: [
          "It restricts prompt sizing limits",
          "It provides the model explicit input-output demonstration examples within the prompt context before requesting the target answer",
          "It requests answers multiple times",
          "It uses faster deep-learning libraries"
        ],
        correctOption: 1,
        explanation: "Demonstration pairs frame expectation scopes, teaching models structural output patterns instantaneously without retraining parameters."
      },
      {
        questionText: "Which vectors database is standard, fully open-source, and commonly run in-memory for prototyping LangChain RAG architectures?",
        options: ["PostgresSQL", "ChromaDB", "MongoDB", "RedisCache"],
        correctOption: 1,
        explanation: "ChromaDB is a highly popular, lightweight vector store designed for easy local development embedding registries."
      },
      {
        questionText: "What represents a fundamental risk when models produce coherent but completely fabricated claims in response to queries?",
        options: ["Stochastic decay", "Hallucination", "Overfitting iterations", "API key expiration"],
        correctOption: 1,
        explanation: "Hallucination occurs when an LLM writes fluent, factual-sounding statements that are incorrect relative to reality, due to next-token predictions."
      }
    ],
    coding: [
      {
        questionText: "Write a Gemini SDK completion snippet 'create_chat_completion(client, system_instruction, query)' that instantiates content generation using 'gemini-2.5-flash', applying the instruction and user query.",
        starterCode: "from google import genai\n\ndef create_chat_completion(client, system_instruction, query):\n    # Write Python code below\n    response = None\n    return response",
        expectedKeywords: ["models", "generate_content", "gemini-2.5-flash"],
        solutionDescription: "Call client.models.generate_content(model='gemini-2.5-flash', contents=query, config={'system_instruction': system_instruction})"
      },
      {
        questionText: "Write a Python prompt formatting statement 'create_rag_prompt(docs, question)' that accepts a list of text strings 'docs' and a 'question' string, joins search documents with double newlines, and returns a formatted string containing both context and question.",
        starterCode: "def create_rag_prompt(docs, question):\n    # Write your python string formatter here\n    return ''",
        expectedKeywords: ["join", "docs", "question"],
        solutionDescription: "Join docs using join: combined_docs = '\\n\\n'.join(docs). Then use an f-string to combine context and query."
      }
    ]
  },
  eda: {
    mcqs: [
      {
        questionText: "Which command generates descriptive summary statistics on numerical DataFrame columns?",
        options: ["df.summary()", "df.describe()", "df.stats()", "df.info_numerical()"],
        correctOption: 1,
        explanation: "df.describe() computes count, mean, std, min, quartiles, and maximum values of your columns."
      },
      {
        questionText: "What plotting library serves as the underlying backbone for Seaborn?",
        options: ["ggplot2", "Matplotlib", "Plotly", "D3.js"],
        correctOption: 1,
        explanation: "Seaborn compiles high-level plots down to native Matplotlib axes objects."
      },
      {
        questionText: "In Matplotlib, what does plt.subplots(2, 3) create?",
        options: [
          "A single plot containing 6 lines",
          "A grid array layout of 2 rows and 3 columns of subplots",
          "2 independent figure files on disk",
          "A 3D coordinate system"
        ],
        correctOption: 1,
        explanation: "It instantiates a figure grid of 2 rows and 3 coordinate axis instances, returning (fig, axes)."
      },
      {
        questionText: "Which Seaborn visualization excels at displaying pairwise relationships across multiple continuous features?",
        options: ["sns.heatmap()", "sns.pairplot()", "sns.catplot()", "sns.join_scatter()"],
        correctOption: 1,
        explanation: "sns.pairplot() generates diagonal distribution charts paired against off-diagonal bivariate scatter charts for fast correlation tracking."
      },
      {
        questionText: "How do you render a correlation matrix heatmap in Seaborn with numerical values explicitly written in cells?",
        options: [
          "sns.heatmap(df.corr(), annot=True)",
          "sns.heatmap(df.corr(), write_nums=True)",
          "sns.plot_corr(df, annotation=True)",
          "sns.correlation_grid(df.corr(), cells='values')"
        ],
        correctOption: 0,
        explanation: "annot=True (annotate) instructs seaborn to embed cell averages or coefficients as text over each gradient rectangle."
      },
      {
        questionText: "What type of distribution feature is optimally analyzed using a Box Plot (sns.boxplot)?",
        options: ["Frequency of categories only", "Outliers, medians, dispersion, and quartile metrics", "3D linear regression correlations", "Time-series seasonal cycles"],
        correctOption: 1,
        explanation: "Box plots provide concise vertical summaries highlighting median lines, Q1/Q3 boundaries, whiskers extensions, and outlier points outside boundaries."
      },
      {
        questionText: "How can you modify the standard background themes in Seaborn to use elegant gridlines?",
        options: ["sns.set_theme(style='whitegrid')", "sns.enable_grids()", "sns.use_style('grid_lines')", "sns.change_layout('standard')"],
        correctOption: 0,
        explanation: "sns.set_theme(style='whitegrid') configures modern light colors and gray horizontal grid intervals."
      },
      {
        questionText: "Which command saves active Matplotlib figures into directory asset structures on compile runs?",
        options: ["plt.save_figure('plot.png')", "plt.savefig('plot.png')", "fig.export_to('plot.png')", "plt.write_image('plot.png')"],
        correctOption: 1,
        explanation: "plt.savefig('filename.ext') saves the rendering buffer onto storage paths at custom DPI settings."
      }
    ],
    coding: [
      {
        questionText: "Write an EDA snippet using matplotlib 'plot_histogram(df, column_name)' that creates a figure with size 8x5, plots a histogram of the specified column with 20 bins, sets the title as 'Distribution', and returns the active plt module.",
        starterCode: "import matplotlib.pyplot as plt\n\ndef plot_histogram(df, column_name):\n    # Write code below\n    return plt",
        expectedKeywords: ["figure", "hist", "bins", "title"],
        solutionDescription: "Call plt.figure(figsize=(8, 5)), render using plt.hist(df[column_name], bins=20), set title, and return plt."
      },
      {
        questionText: "Write a Seaborn plotting function 'render_scatterplot(df, x_col, y_col, hue_col)' that sets a 'whitegrid' style, renders a scatterplot of x vs y with hue color mapping, and returns the plot axes.",
        starterCode: "import seaborn as sns\nimport matplotlib.pyplot as plt\n\ndef render_scatterplot(df, x_col, y_col, hue_col):\n    # Write code below\n    return None",
        expectedKeywords: ["set_theme", "scatterplot", "x", "y", "hue"],
        solutionDescription: "Call sns.set_theme(style='whitegrid'), draw usingax = sns.scatterplot(data=df, x=x_col, y=y_col, hue=hue_col), and return ax."
      }
    ]
  }
};

export function getDynamicFallbackForDay(dayNumber: number, slug: string, topicTitle: string): DayQuiz {
  const mcqs: MCQQuestion[] = [];
  const coding: CodingQuestion[] = [];
  
  // Deterministic variants selector based on unique dayNumber
  const seed = (dayNumber * 23) + 17;
  
  // Helper to get diverse values that change for every single day
  const v1 = 2 + (seed % 5); // 2 to 6
  const v2 = 6 + (seed % 7); // 6 to 12
  const v3 = (seed % 3) + 2; // 2 to 4
  
  if (slug === "python") {
    mcqs.push({
      questionText: `What is the accurate data type of the expression: type((${v1}, "${v2}", True)) in Python?`,
      options: ["<class 'list'>", "<class 'tuple'>", "<class 'set'>", "<class 'dict'>"],
      correctOption: 1,
      explanation: "Parentheses enclosing multiple elements of combined types form an immutable tuple object in standard Python."
    });
    
    mcqs.push({
      questionText: `In Python, if string s = "DataScience${dayNumber}", what is the output of the slice expression s[0:${v1}]?`,
      options: [
        `"DataScience${dayNumber}".slice(0, ${v1})`,
        `"DataScience${dayNumber}".substring(${v1})`,
        `"${"DataScience".substring(0, v1)}"`,
        `"${"DataScience".substring(1, v1 + 1)}"`
      ],
      correctOption: 2,
      explanation: `Slicing s[start:end] extracts characters from start up to (excluding) end index. Starting at 0 gives characters: ${"DataScience".substring(0, v1)}`
    });

    mcqs.push({
      questionText: `What is the value of result after performing floor division: result = ${v2} // ${v3}?`,
      options: [
        `${(v2 / v3).toFixed(2)}`,
        `${Math.floor(v2 / v3)}`,
        `${Math.ceil(v2 / v3)}`,
        `${v2 % v3}`
      ],
      correctOption: 1,
      explanation: `The floor division operator // divides two numbers and rounds down to the nearest integer, resulting in exactly ${Math.floor(v2 / v3)}.`
    });

    mcqs.push({
      questionText: `Which option accurately represents the value of variable total after running: total = sum([x for x in range(1, ${v1 + 2})])?`,
      options: [
        `${Array.from({length: v1 + 1}, (_, i) => i + 1).reduce((a, b: number) => a + b, 0)}`,
        `${Array.from({length: v1}, (_, i) => i + 1).reduce((a, b: number) => a + b, 0)}`,
        `${v1 + 2}`,
        "TypeError: unsupported operand"
      ],
      correctOption: 0,
      explanation: `range(1, k) spans integers from 1 to k-1. Summing from 1 to ${v1 + 1} yields exactly ${Array.from({length: v1 + 1}, (_, i) => i + 1).reduce((a, b: number) => a + b, 0)}.`
    });

    mcqs.push({
      questionText: `How does Python lookup lexical variable references if a variable is accessed inside a nested function?`,
      options: [
        "Global, then Local, then Built-In scopes",
        "LEGB rule (Local scope, then Enclosing scope, then Global, then Built-In)",
        "Directly in Built-in modules first",
        "Dynamic late binding on the heap"
      ],
      correctOption: 1,
      explanation: "Python obeys the LEGB layout: Local name bindings first, followed by Enclosing outer scopes, then Global module-level names, and finally Built-in modules."
    });

    mcqs.push({
      questionText: `Which file mode is strictly correct to open an existing text file to append content without wiping prior headers?`,
      options: ["'r'", "'w'", "'a'", "'x'"],
      correctOption: 2,
      explanation: "Opening files in 'a' (append) mode directs Python to write data onto the trailing end of the file. 'w' overwrites existing data."
    });

    mcqs.push({
      questionText: `What is the output of print(len({x for x in [1, 2, 2, 3, ${v1}, ${v1}]})) in Python?`,
      options: [
        `${new Set([1, 2, 2, 3, v1, v1]).size}`,
        `${[1, 2, 2, 3, v1, v1].length}`,
        "TypeError",
        "4"
      ],
      correctOption: 0,
      explanation: `Sets retain unique distinct integers. The size/length of the unique set composed from [1, 2, 2, 3, ${v1}, ${v1}] is precisely ${new Set([1, 2, 2, 3, v1, v1]).size}.`
    });

    mcqs.push({
      questionText: `What does the Python decorator syntax '@my_decorator' placed over a custom function declaration do?`,
      options: [
        "Deletes the underlying function safely",
        "Passes the function as an input argument to 'my_decorator', substituting it with the returned wrapper object",
        "Converts the method into a static configuration key",
        "Runs the function inside an asynchronous container thread pool"
      ],
      correctOption: 1,
      explanation: "Decorators serve as lightweight wrappers. Placing @my_decorator over fn is shorthand syntactic sugar for: fn = my_decorator(fn)."
    });

    coding.push({
      questionText: `Write a Python function 'get_squared_evens(n)' that takes an integer n and returns a list containing the squares of all even numbers from 0 to n (inclusive).`,
      starterCode: "def get_squared_evens(n):\n    # Write your Python code below\n    pass",
      expectedKeywords: ["def", "range", "%", "return"],
      solutionDescription: "def get_squared_evens(n):\n    return [x**2 for x in range(n+1) if x % 2 == 0]"
    });
    coding.push({
      questionText: `Write a modular Python function 'char_frequency(s)' that takes a string s and returns a dictionary storing character occurrence counts, skipping whitespace.`,
      starterCode: "def char_frequency(s):\n    # Write your Python code below\n    freqs = {}\n    return freqs",
      expectedKeywords: ["def", "for", "in", "isspace", "return"],
      solutionDescription: "def char_frequency(s):\n    freqs = {}\n    for c in s:\n        if c.isspace(): continue\n        freqs[c] = freqs.get(c, 0) + 1\n    return freqs"
    });

  } else if (slug === "numpy") {
    mcqs.push({
      questionText: `How do you instantiate an array filled with numeric zeros of exact 2D shape (${v3}, ${v1}) in NumPy?`,
      options: [
        `np.zeros(${v3}, ${v1})`,
        `np.zeros((${v3}, ${v1}))`,
        `np.zeros_like(${v3}, ${v1})`,
        `np.make_empty(shape=(${v3}, ${v1}))`
      ],
      correctOption: 1,
      explanation: "np.zeros requires shapes as nested tuples. Passing un-bracketed dimensions raises a positional arguments error."
    });

    mcqs.push({
      questionText: `If you slice a 1D NumPy array 'sub = arr[0:${v1}]' and modify elements within 'sub', what is the impact on original 'arr'?`,
      options: [
        "No change. NumPy creates deep copies of subarrays when slicing",
        "The original 'arr' is immediately updated because NumPy slices are views sharing back-end memory references",
        "It triggers a read-only variable mutation compiler error",
        "Elements are dynamically appended to the trailing list"
      ],
      correctOption: 1,
      explanation: "NumPy uses memory-efficient referencing. Slices return vector 'views' instead of duplicating copy vectors, altering original values."
    });

    mcqs.push({
      questionText: `What is the resulting shape when multiplying NumPy array 'A' of shape (${v1}, 1) with 'B' of shape (1, ${v2}) via standard broadcast arithmetic?`,
      options: [
        `(${v1}, ${v2})`,
        `(1, 1)`,
        `(${v2}, ${v1})`,
        "ValueError: incompatible shapes"
      ],
      correctOption: 0,
      explanation: `Broadcasting rules auto-expand singleton dimensions. A shape (${v1}, 1) paired with (1, ${v2}) stretches both axes, returning shape (${v1}, ${v2}).`
    });

    mcqs.push({
      questionText: `Which property store tells you the raw count of dimensions (axes) in a NumPy array matrix 'arr'?`,
      options: ["arr.ndim", "arr.shape", "arr.size", "arr.dimension_count"],
      correctOption: 0,
      explanation: "ndim directly returns the integer total of array axes, whereas .shape returns tuples of sizing, and .size yields total cell elements."
    });

    mcqs.push({
      questionText: `Which of the following creates a 1D array of floats with values evenly spaced from 0 to 10 with exactly ${v2} intervals?`,
      options: [
        `np.arange(0, 10, ${v2})`,
        `np.linspace(0, 10, ${v2})`,
        `np.spacing(0, 10, size=${v2})`,
        `np.linspace(0, 10, step=${v2})`
      ],
      correctOption: 1,
      explanation: `np.linspace(start, stop, num) generates exactly 'num' (${v2}) evenly distributed observations spanning the start and stop boundaries.`
    });

    mcqs.push({
      questionText: `Which operator performs true multi-dimensional matrix multiplication of two compatible 2D arrays A and B?`,
      options: ["A * B", "A ** B", "A @ B", "A.dot_multiply(B)"],
      correctOption: 2,
      explanation: "The asterisk * does element-wise calculations. For true dot matrix multiplication, utilize the modern @ operator or np.dot(A, B)."
    });

    mcqs.push({
      questionText: `How do you flatten a multi-dimensional array matrix down to a flat 1D array while forcing a copy?`,
      options: ["arr.flatten()", "arr.ravel()", "arr.reshape(-1)", "arr.resize(1)"],
      correctOption: 0,
      explanation: "Both ravel() and flat() flatten dimensions, but flatten() guarantees a deep copy of elements whereas ravel() attempts to return views."
    });

    mcqs.push({
      questionText: `If 1D array is: 'arr = np.array([2, -5, ${v1}, 12, 1])', what returns the index of the minimum cell value?`,
      options: ["np.argmin(arr)", "arr.get_min_index()", "np.min_offset(arr)", "arr.find_min()"],
      correctOption: 0,
      explanation: "np.argmin returns the index of the minimum element along an array axis."
    });

    coding.push({
      questionText: `Write a NumPy helper function 'get_diagonal_sum(matrix)' that takes a square 2D matrix array and returns the sum of its main diagonal.`,
      starterCode: "import numpy as np\n\ndef get_diagonal_sum(matrix):\n    # Write your NumPy code below\n    pass",
      expectedKeywords: ["np", "diagonal", "sum"],
      solutionDescription: "def get_diagonal_sum(matrix):\n    return np.diagonal(matrix).sum() or np.trace(matrix)"
    });
    coding.push({
      questionText: `Write a function 'replace_negatives(arr, replacement)' that takes a 1D numpy array and replaces all negative values with the specified replacement scalar.`,
      starterCode: "import numpy as np\n\ndef replace_negatives(arr, replacement):\n    # Write your NumPy code below\n    pass",
      expectedKeywords: ["np", "arr", "[", "< 0", "return"],
      solutionDescription: "def replace_negatives(arr, replacement):\n    arr[arr < 0] = replacement\n    return arr"
    });

  } else if (slug === "pandas") {
    mcqs.push({
      questionText: `What is the correct selector mode to filter rows labeled with a string ID versus an integer coordinate index?`,
      options: [
        "df.iloc uses label indices, df.loc is coordinate based",
        "df.loc search labels, df.iloc is strictly based on integer indices position (0-indexed)",
        "Both act identically as direct aliases",
        "df.query only handles string indexes"
      ],
      correctOption: 1,
      explanation: "df.loc uses index row labels, whereas df.iloc operates on positional integers offset."
    });

    mcqs.push({
      questionText: `What does 'df.groupby("City")["Revenue"].mean()' accomplish in on-line DataFrames?`,
      options: [
        "Sorts the City column based on Revenue values",
        "Groups matching records by the 'City' factor, isolates the 'Revenue' column, and then calculates the average revenue per city",
        "Filters out rows matching keyword City or Revenue",
        "Counts the unique occurrences"
      ],
      correctOption: 1,
      explanation: "GroupBy groupings partition observations matching City values, then aggregate isolated column statistics."
    });

    mcqs.push({
      questionText: `How do you drop columns 'Age' and 'Salary' in-place inside a Pandas DataFrame variable 'df'?`,
      options: [
        "df.drop(['Age', 'Salary'], axis=1, inplace=True)",
        "df.drop_columns(['Age', 'Salary'])",
        "df.remove(['Age', 'Salary'])",
        "np.delete(df, ['Age', 'Salary'])"
      ],
      correctOption: 0,
      explanation: "df.drop() with axis=1 (columns) and inplace=True updates the memory contents directly without returning a fresh pointer."
    });

    mcqs.push({
      questionText: `Which of the following fills NaN values inside a Series 'df["Score"]' with the median of that specific column in-place?`,
      options: [
        "df['Score'].fill_nan(strategy='median')",
        "df['Score'].fillna(df['Score'].median(), inplace=True)",
        "df['Score'] = df['Score'].replace(nan='median')",
        "pd.clean(df, columns=['Score'])"
      ],
      correctOption: 1,
      explanation: "fillna fills missing observation cells. Passing Series median() matches the structural values cleanly."
    });

    mcqs.push({
      questionText: `What happens when you execute: pd.concat([df1, df2], axis=1)?`,
      options: [
        "Combines DataFrames vertically (appending rows)",
        "Combines DataFrames horizontally (binding columns side-by-side matching index)",
        "Merges them on a shared database key column",
        "Calculates matrix multipliers"
      ],
      correctOption: 1,
      explanation: "axis=0 binds rows underneath each other; axis=1 binds columns side-by-side aligning index labels."
    });

    mcqs.push({
      questionText: `How can you convert a column labeled "Date_Joined" to Pandas datetime formats to sort chronological values?`,
      options: [
        "df['Date_Joined'] = df['Date_Joined'].astype(datetime)",
        "df['Date_Joined'] = pd.to_datetime(df['Date_Joined'])",
        "df['Date_Joined'] = df['Date_Joined'].format_time()",
        "pd.parse_strings(df)"
      ],
      correctOption: 1,
      explanation: "pd.to_datetime parses date string series formats into highly versatile DatetimeIndex compatible timestamps."
    });

    mcqs.push({
      questionText: `Which method returns value count statistics of individual occurrences inside a categorical Pandas Series 'df["City"]'?`,
      options: ["df['City'].sum()", "df['City'].value_counts()", "df['City'].unique_values()", "pd.occurrences(df['City'])"],
      correctOption: 1,
      explanation: "value_counts() tabulates distinct items sorting frequencies in descending order."
    });

    mcqs.push({
      questionText: `How do you save a DataFrame to a CSV sheet called "data.csv" without storing row indices?`,
      options: [
        "df.save('data.csv', index=False)",
        "df.to_csv('data.csv', index=False)",
        "df.write_csv('data.csv', print_idx=False)",
        "pd.export(df, name='data.csv')"
      ],
      correctOption: 1,
      explanation: "to_csv writes contents to spreadsheet files. Excluding the index ensures cleaner tables."
    });

    coding.push({
      questionText: `Write a Pandas helper function 'filter_high_performers(df, score_threshold)' that takes a DataFrame representing employees, and returns just the rows where the 'Score' is strictly greater than the threshold.`,
      starterCode: "import pandas as pd\n\ndef filter_high_performers(df, score_threshold):\n    # Write your Pandas code below\n    pass",
      expectedKeywords: ["df", "[", ">", "return"],
      solutionDescription: "def filter_high_performers(df, score_threshold):\n    return df[df['Score'] > score_threshold]"
    });
    coding.push({
      questionText: `Write a function 'compute_null_counts(df)' that accepts a DataFrame and returns a Series representing the counts of missing values (NaN) in each column.`,
      starterCode: "import pandas as pd\n\ndef compute_null_counts(df):\n    # Write your Pandas code below\n    pass",
      expectedKeywords: ["isnull", "sum"],
      solutionDescription: "def compute_null_counts(df):\n    return df.isnull().sum()"
    });

  } else {
    const catName = slug.toUpperCase();
    
    mcqs.push({
      questionText: `[${catName} Day ${dayNumber}] In standard ${catName}, what is the general consequence of overfitting training datasets?`,
      options: [
        "Low error rates on training variables and low error rates on unseen test observations",
        "Extremely low error rates on training variables, but high error rates/poor generalizability on unseen test observations",
        "Consistent high error rates across all splits",
        "Faster convergence rates during fits"
      ],
      correctOption: 1,
      explanation: "Overfitting means models fit noisier features of local data sheets instead of learning generalizable relationships."
    });

    mcqs.push({
      questionText: `[${catName} Day ${dayNumber}] Which metrics analyzer evaluates Classification predictions for False Positives vs False Negatives?`,
      options: ["The Confusion Matrix", "R-squared statistic", "The Mean Squared Error deviation", "Log-normal distributions"],
      correctOption: 0,
      explanation: "Confusion matrices map real values directly against predictions to show correct classification patterns."
    });

    mcqs.push({
      questionText: `[${catName} Day ${dayNumber}] What does the term cross-validation represent in machine learning pipelines?`,
      options: [
        "Reviewing code snippets across IDE systems",
        "Splitting datasets into multiple partitions (K-folds) to rotate train/test scopes, obtaining unbiased performance metrics",
        "Encrypting training features",
        "Direct network data relays"
      ],
      correctOption: 1,
      explanation: "Cross-validation splits folders randomly to construct stable general models without data leaks."
    });

    mcqs.push({
      questionText: `[${catName} Day ${dayNumber}] What represents the primary function of activation layers (e.g. ReLU, Tanh, Sigmoid) inside Deep Learning?`,
      options: [
        "To speed up GPU compilation units",
        "To introduce mathematical non-linearity, allowing models to learn highly complex high-dimensional boundaries",
        "To flatten matrix inputs",
        "To regulate weight distributions"
      ],
      correctOption: 1,
      explanation: "Activation functions introduce non-linearities, allowing layers to learn non-linear decision boundaries."
    });

    mcqs.push({
      questionText: `[${catName} Day ${dayNumber}] In NLP vectorizers, what is the role of TF-IDF?`,
      options: [
        "Tokenizes sentences based on punctuation flags",
        "Weights terms by occurrences in a document, penalized by how frequently they show up across the entire corpus",
        "Speeds up python word stemming routines",
        "A vector compression algorithm"
      ],
      correctOption: 1,
      explanation: "TF-IDF scores word uniqueness to emphasize key concepts rather than common connector stop words."
    });

    mcqs.push({
      questionText: `[${catName} Day ${dayNumber}] What does Retrieval-Augmented Generation (RAG) provide to LLM pipelines in Generative AI?`,
      options: [
        "Compiles weights down to lower float precision formats",
        "Queries custom knowledge bases/vector indices for context matching, then formats prompts to ground LLM responses with facts",
        "Deletes bad files from host systems",
        "Translates user input to other languages"
      ],
      correctOption: 1,
      explanation: "RAG anchors conversations dynamically, attaching indexed snippets to prompt content to eliminate hallucinations."
    });

    mcqs.push({
      questionText: `[${catName} Day ${dayNumber}] Which plot schema is optimal in EDA to identify value distribution outliers, quartiles, and medians?`,
      options: ["A heat-map grid", "A Box Plot (sns.boxplot)", "A 3D coordinate scatter plot", "A pie-chart circle"],
      correctOption: 1,
      explanation: "Box plots display outlier boundaries (using whiskers) while cleanly framing median indexes and interquartile ranges."
    });

    mcqs.push({
      questionText: `[${catName} Day ${dayNumber}] Which parameter efficiency technique (PEFT) utilizes low-rank matrices to adapt huge models with minuscule weights updates?`,
      options: ["Gradient Descent Slicing", "Low-Rank Adaptation (LoRA)", "Epoch Filtering", "Standard Normalization"],
      correctOption: 1,
      explanation: "LoRA freezes original base weights and updates low-rank parameter increments during training."
    });

    coding.push({
      questionText: `Write a modular helper python function 'get_mean_squared_error(y_true, y_pred)' that accepts two lists of equal size and calculates the Mean Squared Error (MSE).`,
      starterCode: "def get_mean_squared_error(y_true, y_pred):\n    # Write your python code below\n    pass",
      expectedKeywords: ["def", "len", "sum", "return"],
      solutionDescription: "def get_mean_squared_error(y_true, y_pred):\n    return sum((t - p)**2 for t, p in zip(y_true, y_pred)) / len(y_true)"
    });
    coding.push({
      questionText: `Write a python script 'get_unique_tokens(corpus)' that takes a list of strings, lowercase them, splits them into individual words, and returns a sorted list of unique tokens.`,
      starterCode: "def get_unique_tokens(corpus):\n    # Write your python code below\n    pass",
      expectedKeywords: ["def", "lower", "split", "set", "sorted"],
      solutionDescription: "def get_unique_tokens(corpus):\n    tokens = set()\n    for text in corpus:\n        for word in text.lower().split():\n            tokens.add(word)\n    return sorted(list(tokens))"
    });
  }

  return {
    dayNumber,
    courseSlug: slug,
    topicTitle,
    mcqs,
    coding
  };
}

export async function generateQuizForDay(dayNumber: number): Promise<DayQuiz> {
  const course = getCourseForDay(dayNumber);
  const topicTitle = getTopicTitleForDay(dayNumber);

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

  const ai = getAi();

  if (!ai) {
    // Return completely procedural, non-repeating custom daily questions instead of raw static fallback
    return getDynamicFallbackForDay(dayNumber, course.slug, topicTitle);
  }

  try {
    const prompt = `
Generate a high-quality Data Science Daily Test quiz in JSON format for Day ${dayNumber}.
Course stage: ${course.name}.
Topic Focus: "${topicTitle}".

Important Structure instructions:
Return a JSON object containing EXACTLY:
{
  "dayNumber": ${dayNumber},
  "courseSlug": "${course.slug}",
  "topicTitle": "${topicTitle}",
  "mcqs": [
    {
      "questionText": "A precise, technical question covering ${topicTitle}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0, // 0-indexed integer of the correct answer
      "explanation": "Brief context explanation of why this answer is correct"
    } // ... provide EXACTLY 8 MCQs
  ],
  "coding": [
    {
      "questionText": "Detailed description of python coding challenge targeting ${topicTitle}",
      "starterCode": "def solution_fn(...):\\n    # Write Python code here",
      "expectedKeywords": ["keyword1", "keyword2"],
      "solutionDescription": "Brief explanation of how to construct the correct solution"
    } // ... provide EXACTLY 2 Coding challenges
  ]
}

Ensure your output is strictly valid JSON, containing no explanation text, and wrapped inside markdown code blocks.
`;

    console.log(`[Gemini API] Generating test for Day ${dayNumber} (${course.slug})...`);
    const resp = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const respText = resp.text || "";
    // Clean JSON code blocks
    let jsonString = respText.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice(7);
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    try {
      const parsed = JSON.parse(jsonString) as DayQuiz;
      if (parsed && Array.isArray(parsed.mcqs) && parsed.mcqs.length === 8 && Array.isArray(parsed.coding) && parsed.coding.length === 2) {
        return parsed;
      }
      throw new Error("Parsed JSON has invalid structure or length of lists");
    } catch (parseErr) {
      console.warn("[Gemini API] JSON parsing or structure failure, falling back: ", parseErr, "Raw output was: ", respText);
    }
  } catch (err) {
    console.error("[Gemini API] Request error:", err);
  }

  // Fallback to beautiful procedural dynamic content instead of static templates
  return getDynamicFallbackForDay(dayNumber, course.slug, topicTitle);
}

export async function generateQuizFromMaterial(
  materialText: string,
  dayNumber: number,
  courseSlug: string,
  topicTitle: string
): Promise<DayQuiz> {
  const ai = getAi();
  if (!ai) {
    throw new Error("Gemini API Key is not configured. Please set GEMINI_API_KEY in the Secrets settings.");
  }

  const prompt = `
You are an expert Data Science and AI educator.
We have received the following uploaded/inserted course content material for Day ${dayNumber} (Subject Slug: "${courseSlug}", Topic: "${topicTitle}"):

--- BEGIN COURSE MATERIAL ---
${materialText}
--- END COURSE MATERIAL ---

Your task is to analyze this course material and generate a high-quality educational quiz in JSON format containing EXACTLY 10 questions in total:
- 8 Multiple Choice Questions (MCQs) covering key concepts, code interpretations, or calculations directly related to the material.
- 2 Python coding exercises directly testing application or custom manipulation of concepts covered in the material.

Return a JSON object containing EXACTLY this structure:
{
  "dayNumber": ${dayNumber},
  "courseSlug": "${courseSlug}",
  "topicTitle": "${topicTitle}",
  "mcqs": [
    {
      "questionText": "A precise, technical question directly based on the uploaded material...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0, // 0-indexed integer of the correct answer (0, 1, 2, or 3)
      "explanation": "Brief context explanation of why this option is correct based on the material."
    } // ... provide EXACTLY 8 MCQs
  ],
  "coding": [
    {
      "questionText": "Detailed description of python coding challenge targeting concepts in the material...",
      "starterCode": "def solution_fn(...):\\n    # Write Python code here",
      "expectedKeywords": ["keyword1", "keyword2"],
      "solutionDescription": "Brief explanation of how to construct the correct solution"
    } // ... provide EXACTLY 2 Coding challenges
  ]
}

Ensure your output is strictly valid JSON, containing no conversational explanation text, and wrapped inside markdown code blocks.
`;

  console.log(`[Gemini API] Custom material quiz generating for Day ${dayNumber}...`);
  const resp = await generateContentWithRetry(ai, {
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  const respText = resp.text || "";
  let jsonString = respText.trim();
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith("```")) {
    jsonString = jsonString.slice(0, -3);
  }
  jsonString = jsonString.trim();

  try {
    const parsed = JSON.parse(jsonString) as DayQuiz;
    if (parsed && Array.isArray(parsed.mcqs) && parsed.mcqs.length === 8 && Array.isArray(parsed.coding) && parsed.coding.length === 2) {
      // Set values to match selected criteria
      parsed.dayNumber = dayNumber;
      parsed.courseSlug = courseSlug;
      parsed.topicTitle = topicTitle;
      return parsed;
    }
    throw new Error("Parsed JSON has invalid structure or length of lists");
  } catch (parseErr) {
    console.error("[Gemini API] JSON parsing or structure failure:", parseErr, "Raw output:", respText);
    throw new Error("Failed to parse Gemini generated quiz. Ensure the provided material is clean text/code and try again.");
  }
}

