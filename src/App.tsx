import { useEffect, useState, type FormEvent } from "react";
import "./App.css";

type Question = {
  prompt: string;
  choices: string[];
  answer: number;
};

type Quiz = {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  items: Question[];
};

const quizzes: Quiz[] = [
  {
    id: 1,
    title: "The Art of Film",
    description: "Test your knowledge of movies.",
    category: "Culture",
    difficulty: "Medium",
    items: [
      {
        prompt: "Who directed Spirited Away?",
        choices: [
          "Akira Kurosawa",
          "Hayao Miyazaki",
          "Bong Joon-ho",
          "Wong Kar-wai",
        ],
        answer: 1,
      },
      {
        prompt: "What is the name of the award for the best film at Cannes?",
        choices: ["The Golden Bear", "The Palme d'Or", "The Silver Lion", "The BAFTA"],
        answer: 1,
      },
      {
        prompt: "Which role shapes the visual language of a film?",
        choices: ["Producer", "Cinematographer", "Composer", "Editor"],
        answer: 1,
      },
    ],
  },
  {
    id: 2,
    title: "Botany Basics",
    description: "Test your knowledge of plants.",
    category: "Science",
    difficulty: "Easy",
    items: [
      {
        prompt: "What process lets plants turn light into energy?",
        choices: [
          "Respiration",
          "Photosynthesis",
          "Fermentation",
          "Transpiration",
        ],
        answer: 1,
      },
      {
        prompt: "Which part of a plant absorbs water from the soil?",
        choices: ["Leaves", "Flowers", "Roots", "Fruit"],
        answer: 2,
      },
      {
        prompt: "What is the green pigment in leaves called?",
        choices: ["Keratin", "Chlorophyll", "Melanin", "Collagen"],
        answer: 1,
      },
    ],
  },
  {
    id: 3,
    title: "World Capitals",
    description: "Take a quick trip around the world's capital cities.",
    category: "Geography",
    difficulty: "Medium",
    items: [
      { prompt: "What is the capital of Morocco?", choices: ["Casablanca", "Rabat", "Marrakesh", "Fez"], answer: 1 },
      { prompt: "Which city is the capital of New Zealand?", choices: ["Auckland", "Christchurch", "Wellington", "Dunedin"], answer: 2 },
      { prompt: "What is the capital of Mongolia?", choices: ["Astana", "Ulaanbaatar", "Bishkek", "Tashkent"], answer: 1 },
    ],
  },
  {
    id: 4,
    title: "A Tour of Space",
    description: "Explore the planets, stars, and our place in the universe.",
    category: "Science",
    difficulty: "Easy",
    items: [
      { prompt: "Which planet is known as the Red Planet?", choices: ["Venus", "Mars", "Jupiter", "Mercury"], answer: 1 },
      { prompt: "What is the closest star to Earth?", choices: ["Sirius", "The Sun", "Proxima Centauri", "Polaris"], answer: 1 },
      { prompt: "Which planet has the most prominent ring system?", choices: ["Saturn", "Neptune", "Earth", "Mars"], answer: 0 },
    ],
  },
  {
    id: 5,
    title: "Music Through Time",
    description: "A little tour of instruments, rhythm, and music history.",
    category: "Culture",
    difficulty: "Medium",
    items: [
      { prompt: "How many keys does a standard modern piano have?", choices: ["66", "76", "88", "96"], answer: 2 },
      { prompt: "Which family does the flute belong to?", choices: ["Brass", "Percussion", "String", "Woodwind"], answer: 3 },
      { prompt: "How many beats are in a bar of common time?", choices: ["Two", "Three", "Four", "Six"], answer: 2 },
    ],
  },
];

type AuthResponse = {
  token?: string;
  user?: { email: string };
  error?: string;
};

function App() {
  const [library] = useState<Quiz[]>(() => {
    const saved = localStorage.getItem("quizzes");
    if (!saved) return quizzes;
    try {
      const savedQuizzes = JSON.parse(saved) as Quiz[];
      return [...quizzes, ...savedQuizzes.filter((savedQuiz) => !quizzes.some((quiz) => quiz.id === savedQuiz.id))];
    } catch {
      return quizzes;
    }
  });
  const [active, setActive] = useState<Quiz | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem("quizsphere-favorites");
    if (!saved) return [];
    try {
      return JSON.parse(saved) as number[];
    } catch {
      return [];
    }
  });
  const [showFavorites, setShowFavorites] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("quizsphere-token"));
  const [currentEmail, setCurrentEmail] = useState(() => localStorage.getItem("quizsphere-email") || "");

  useEffect(() => {
    localStorage.setItem("quizzes", JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    localStorage.setItem("quizsphere-favorites", JSON.stringify(favorites));
  }, [favorites]);

  const categories = ["All", ...new Set(library.map((quiz) => quiz.category))];
  const visibleQuizzes = library.filter((quiz) => {
    const matchesSearch = `${quiz.title} ${quiz.description}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory = category === "All" || quiz.category === category;
    const matchesFavorite = !showFavorites || favorites.includes(quiz.id);
    return matchesSearch && matchesCategory && matchesFavorite;
  });

  const startQuiz = (quiz: Quiz) => {
    setActive(quiz);
    setAnswer(null);
    setScore(0);
    setQuestionIndex(0);
    setComplete(false);
  };

  const checkAnswer = (value: number) => {
    if (answer !== null) return;

    setAnswer(value);

    if (value === active?.items[questionIndex].answer) {
      setScore((current) => current + 1);
    }
  };

  const advanceQuestion = () => {
    if (!active) return;
    if (questionIndex === active.items.length - 1) {
      setComplete(true);
      return;
    }
    setQuestionIndex((current) => current + 1);
    setAnswer(null);
  };

  const toggleFavorite = (quizId: number) => {
    setFavorites((current) => current.includes(quizId)
      ? current.filter((id) => id !== quizId)
      : [...current, quizId]);
  };

  const signOut = () => {
    localStorage.removeItem("quizsphere-token");
    localStorage.removeItem("quizsphere-email");
    setToken(null);
    setCurrentEmail("");
    setActive(null);
  };

  if (!token) {
    return (
      <AuthView
        onAuth={(nextToken, email) => {
          localStorage.setItem("quizsphere-token", nextToken);
          localStorage.setItem("quizsphere-email", email);
          setToken(nextToken);
          setCurrentEmail(email);
        }}
      />
    );
  }

  if (active) {
    const question = active.items[questionIndex];

    if (complete) {
      return (
        <main className="quiz-screen">
          <button className="text-button" onClick={() => setActive(null)}>Back to library</button>
          <section className="quiz-result">
            <p className="eyebrow">Quiz complete</p>
            <div className="result-score">{score}<span> / {active.items.length}</span></div>
            <h1>{score === active.items.length ? "A perfect round." : "Nice work. Keep going."}</h1>
            <p>You finished {active.title}. Want another round?</p>
            <div className="result-actions">
              <button className="primary" onClick={() => startQuiz(active)}>Play again</button>
              <button className="secondary" onClick={() => setActive(null)}>Quiz library</button>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="quiz-screen">
        <button className="text-button" onClick={() => setActive(null)}>Back to library</button>
        <div className="quiz-meta">
          <span>{active.category}</span>
          <span>{active.difficulty}</span>
          <span>{questionIndex + 1} of {active.items.length}</span>
        </div>
        <div className="progress-track" aria-label={`Question ${questionIndex + 1} of ${active.items.length}`}>
          <span style={{ width: `${((questionIndex + 1) / active.items.length) * 100}%` }} />
        </div>
        <section className="question-panel">
          <p className="eyebrow">{active.title}</p>
          <h1>{question.prompt}</h1>
          <div className="answer-list">
            {question.choices.map((choice, index) => {
              const isCorrect = answer !== null && index === question.answer;
              const isWrong = answer === index && index !== question.answer;
              return (
                <button
                  className={`answer-option${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}`}
                  key={choice}
                  onClick={() => checkAnswer(index)}
                  disabled={answer !== null}
                >
                  <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
                  <span>{choice}</span>
                  {isCorrect && <span className="answer-mark">Correct</span>}
                  {isWrong && <span className="answer-mark">Not quite</span>}
                </button>
              );
            })}
          </div>
          {answer !== null && (
            <div className="answer-feedback" role="status">
              <span>{answer === question.answer ? "That's right." : "The correct answer is highlighted."}</span>
              <button className="primary" onClick={advanceQuestion}>
                {questionIndex === active.items.length - 1 ? "See results" : "Next question"}
                <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
      <main className="app">
      <header className="app-header">
        <a className="wordmark" href="#top" onClick={(event) => event.preventDefault()}><img className="brand-mark" src="/quizsphere-mark.svg" alt="" />Quiz<span>Sphere</span></a>
        <p>Curiosity, one question at a time.</p>
        <div className="session-controls">
          <span>{currentEmail}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="library-section" id="top">
        <div className="library-intro">
          <div>
            <p className="eyebrow">Your next small discovery</p>
            <h1>Choose a curiosity.</h1>
            <p className="intro-copy">A few good questions can take you somewhere new.</p>
          </div>
          <div className="library-count"><strong>{library.length.toString().padStart(2, "0")}</strong><span>quizzes to explore</span></div>
        </div>

        <div className="library-heading">
          <h2>Quiz library</h2>
          <button
            className={`favorite-filter${showFavorites ? " active" : ""}`}
            onClick={() => setShowFavorites((current) => !current)}
            aria-pressed={showFavorites}
          >
            {showFavorites ? "Showing saved" : "Saved quizzes"} <span>{favorites.length}</span>
          </button>
        </div>

        <div className="library-controls">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quizzes"
              aria-label="Search quizzes"
            />
          </label>
          <div className="category-filters" aria-label="Filter by category">
            {categories.map((item) => (
              <button
                className={category === item ? "selected" : ""}
                key={item}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-grid">
          {visibleQuizzes.map((quiz, index) => (
            <article className={`quiz-card tone-${index % 3}`} key={quiz.id}>
              <div className="quiz-card-top">
                <span>{quiz.category}</span>
                <button
                  className={`save-button${favorites.includes(quiz.id) ? " saved" : ""}`}
                  onClick={() => toggleFavorite(quiz.id)}
                  aria-label={`${favorites.includes(quiz.id) ? "Remove" : "Save"} ${quiz.title}`}
                  aria-pressed={favorites.includes(quiz.id)}
                  title={favorites.includes(quiz.id) ? "Remove from saved" : "Save quiz"}
                >
                  {favorites.includes(quiz.id) ? "★" : "☆"}
                </button>
              </div>
              <div>
                <h3>{quiz.title}</h3>
                <p>{quiz.description}</p>
              </div>
              <div className="quiz-card-bottom">
                <span>{quiz.items.length} questions · {quiz.difficulty}</span>
                <button className="start-button" onClick={() => startQuiz(quiz)}>Start quiz <span aria-hidden="true">-&gt;</span></button>
              </div>
            </article>
          ))}
        </div>
        {visibleQuizzes.length === 0 && (
          <div className="empty-state">
            <h3>No quizzes found</h3>
            <p>Try another search or switch the category filter.</p>
            <button className="text-button" onClick={() => { setSearch(""); setCategory("All"); setShowFavorites(false); }}>Clear filters</button>
          </div>
        )}
      </section>
    </main>
  );
}

function AuthView({ onAuth }: { onAuth: (token: string, email: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get("email") || ""),
      password: String(data.get("password") || ""),
      firstName: String(data.get("firstName") || ""),
      lastName: String(data.get("lastName") || ""),
      mobile: String(data.get("mobile") || ""),
    };

    try {
      const response = await fetch(`http://localhost:8787/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as AuthResponse;
      if (!response.ok || !result.token || !result.user) {
        setError(result.error || "Authentication failed. Check your details and try again.");
        return;
      }
      onAuth(result.token, result.user.email);
    } catch {
      setError("Cannot reach the QuizSphere server. Make sure the development server is running.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setError("");
  };

  return (
    <main className="auth">
      <section className="auth-card auth-panel">
        <a className="wordmark auth-wordmark" href="#top"><img className="brand-mark" src="/quizsphere-mark.svg" alt="" />Quiz<span>Sphere</span></a>
        <p className="eyebrow">A little curiosity goes a long way</p>
        <h1>{mode === "login" ? "Welcome back." : "Join the curious."}</h1>
        <p className="auth-intro">
          {mode === "login" ? "Sign in to pick up where you left off." : "Create an account to start exploring."}
        </p>
        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")} role="tab" aria-selected={mode === "login"}>Sign in</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")} role="tab" aria-selected={mode === "register"}>Create account</button>
        </div>
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="name-fields">
              <label>First name<input name="firstName" autoComplete="given-name" required placeholder="Your first name" /></label>
              <label>Last name<input name="lastName" autoComplete="family-name" required placeholder="Your last name" /></label>
              <label className="full-field">Mobile number<input name="mobile" type="tel" autoComplete="tel" pattern="[0-9 +()-]{7,}" required placeholder="Your mobile number" /></label>
            </div>
          )}
          <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required placeholder="At least 8 characters" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            {!loading && <span aria-hidden="true">-&gt;</span>}
          </button>
        </form>
        <p className="auth-switch-copy">
          {mode === "login" ? "New to QuizSphere?" : "Already have an account?"}
          <button onClick={() => switchMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}

export default App;