import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useNavigate, 
  useLocation,
  Link,
  Navigate
} from 'react-router-dom';
 
import { 
  Search, Zap, CheckCircle, ArrowRight, Loader2, Lock, Star, 
  TrendingUp, Users, MessageCircle, Menu, X, Shield, 
  CreditCard, BarChart, LogOut, ChevronDown, Mail, Phone, Key,
  Copy, ExternalLink, Target, Plus
} from 'lucide-react';
 
// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber 
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
 
// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAuM17cw3dK6R017kesDiQHDQtgXY_GZ_4", 
  authDomain: "lead-sniper-auth.firebaseapp.com",
  projectId: "lead-sniper-auth",
  storageBucket: "lead-sniper-auth.firebasestorage.app",
  messagingSenderId: "167412952560",
  appId: "1:167412952560:web:3c60c4f0c9742476860135"
};
 
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const provider = new GoogleAuthProvider();
 
// --- 2. AUTH CONTEXT ---
const AuthContext = createContext();
 
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false); 
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const docRef = doc(db, "customers", currentUser.email); 
          const docSnap = await getDoc(docRef);
          setIsPro(docSnap.exists() && docSnap.data().isPro === true);
        } catch (error) {
          setIsPro(false);
        }
      } else {
        setUser(null);
        setIsPro(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
 
  return (
    <AuthContext.Provider value={{ user, isPro, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
 
const useAuth = () => useContext(AuthContext);
 
// --- 3. PROTECTED ROUTE ---
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth(); 
  if (!user) return <Navigate to="/login" />;
  return children;
};
 
// --- 4. MAIN APP ---
export default function App() {
  const PAYU_LINK = "https://u.payu.in/PAYUMN/Hrn6dcOyl0Ic"; 
 
  return (
    <AuthProvider>
      <Router>
        <div className="page">
          <GlobalStyles />
          <Navbar />
          <main className="content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard payLink={PAYU_LINK} />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
 
// --- SHARED COMPONENTS ---
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };
 
  return (
    <nav className="nav">
      <div className="logo" onClick={() => navigate('/')}>
        <div className="logo-icon"><Target size={20} color="white" /></div>
        <span>Lead<span style={{color: '#ea580c'}}>Sniper</span></span>
      </div>
      <div className="nav-links desktop-nav">
        <span onClick={() => navigate('/')} className={location.pathname === '/' ? 'active' : ''}>Home</span>
        <span onClick={() => navigate('/pricing')} className={location.pathname === '/pricing' ? 'active' : ''}>Pricing</span>
        {user ? <span onClick={handleLogout}>Logout</span> : <span onClick={() => navigate('/login')}>Login</span>}
      </div>
      {user ? 
        <button onClick={() => navigate('/dashboard')} className="primary-btn small-btn">Dashboard</button> 
        : 
        <button onClick={() => navigate('/login')} className="primary-btn small-btn">Get Started</button>
      }
    </nav>
  );
};
 
// --- LANDING PAGE ---
const LandingPage = () => {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const { user } = useAuth();
 
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => setShowPopup(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);
 
  return (
    <div className="landing">
      <section className="hero-section">
        <div className="badge">✨ AI Sentiment Analysis 2.0</div>
        <h1 className="hero-title">
          Find Your Next 100 Customers <br />
          <span className="gradient-text">On Reddit.</span>
        </h1>
        <p className="hero-sub">
          Stop cold emailing. Our AI finds people actively asking for your product in real-time. 
        </p>
        <div className="cta-group">
          <button onClick={() => navigate('/dashboard')} className="primary-btn big-btn">
            Start Finding Leads <ArrowRight size={20} />
          </button>
          <div className="social-proof">
            <div className="avatars">
              {[1,2,3,4].map(i => <div key={i} className="avatar" />)}
            </div>
            <span>Trusted by 2,400+ founders</span>
          </div>
        </div>
      </section>
      <section className="features-section">
        <h2>Why use LeadSniper?</h2>
        <div className="feature-grid">
          <FeatureCard icon={<Zap/>} title="Real-Time Scanning" desc="We monitor 500+ subreddits 24/7." />
          <FeatureCard icon={<BarChart/>} title="Intent Scoring" desc="Our AI reads context to find buyers." />
          <FeatureCard icon={<Shield/>} title="Safe & Compliant" desc="We respect Reddit API limits." />
        </div>
      </section>
      {showPopup && !user && <Popup onClose={() => setShowPopup(false)} />}
    </div>
  );
};
 
const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass-card feature-card">
    <div className="icon-box">{icon}</div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </div>
);
 
// --- PRICING PAGE ---
const PricingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pricing-section">
      <div className="text-center">
        <h2>Simple Pricing</h2>
        <p>Stop paying for bad leads.</p>
      </div>
      <div className="pricing-grid">
        <div className="glass-card price-card">
          <h3>Starter</h3>
          <div className="price">Free</div>
          <ul>
            <li><CheckCircle size={16}/> 3 Leads / Day</li>
            <li><CheckCircle size={16}/> Basic Analysis</li>
          </ul>
          <button onClick={() => navigate('/dashboard')} className="secondary-btn full-width">Get Started</button>
        </div>
        <div className="glass-card price-card featured">
          <div className="pop-tag">POPULAR</div>
          <h3>Pro</h3>
          <div className="price">₹399<span>/mo</span></div>
          <ul>
            <li><CheckCircle size={16}/> Unlimited Leads</li>
            <li><CheckCircle size={16}/> Export to CSV</li>
            <li><CheckCircle size={16}/> AI Reply Drafts</li>
          </ul>
          <button onClick={() => navigate('/dashboard')} className="primary-btn full-width">Start Pro Trial</button>
        </div>
      </div>
    </div>
  );
};
 
// --- LOGIN PAGE ---
const LoginPage = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('options'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
 
  const handleSuccess = () => navigate('/dashboard');
 
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      handleSuccess();
    } catch (error) {
      alert("Google Login failed. Please try again.");
    }
  };
 
  const handleEmailLogin = async () => {
    try { 
      await signInWithEmailAndPassword(auth, email, password);
      handleSuccess();
    } catch (error) { alert("Error: " + error.message); }
  };
 
  const handleEmailSignup = async () => {
    try { 
      await createUserWithEmailAndPassword(auth, email, password);
      handleSuccess();
    } catch (error) { alert("Error: " + error.message); }
  };
 
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible', 'callback': () => {}
      });
    }
  };
 
  const handleSendOtp = async () => {
    setupRecaptcha();
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; 
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setShowOtpInput(true);
    } catch (error) {
      alert("SMS Failed: " + error.message);
    }
  };
 
  const handleVerifyOtp = async () => {
    try { 
      await confirmationResult.confirm(otp);
      handleSuccess();
    } catch (error) { alert("Invalid OTP"); }
  };
 
  return (
    <div className="login-container">
      <div className="glass-card login-box">
        <h2>Welcome Back</h2>
        <p style={{marginBottom: 20}}>Login to access dashboard</p>
        {authMode === 'options' && (
          <div className="auth-options">
            <button onClick={handleGoogleLogin} className="google-btn full-width mb-10">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="18" />
              Continue with Google
            </button>
            <button onClick={() => setAuthMode('email-login')} className="secondary-btn full-width mb-10">
              <Mail size={18} style={{marginRight: 7}}/> Continue with Email
            </button>
            <button onClick={() => setAuthMode('phone')} className="secondary-btn full-width">
              <Phone size={18} style={{marginRight: 8}}/> Continue with Phone
            </button>
          </div>
        )}
        {authMode === 'email-login' && (
          <div className="email-form">
            <input type="email" placeholder="Email" className="input-field" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="input-field" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button onClick={handleEmailLogin} className="primary-btn full-width mb-10">Log In</button>
            <p className="text-small">No account? <span className="link" onClick={()=>setAuthMode('email-signup')}>Sign Up</span></p>
            <span className="link back-link" onClick={()=>setAuthMode('options')}>← Back</span>
          </div>
        )}
        {authMode === 'email-signup' && (
          <div className="email-form">
            <input type="email" placeholder="Email" className="input-field" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="input-field" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button onClick={handleEmailSignup} className="primary-btn full-width mb-10">Create Account</button>
            <p className="text-small">Have account? <span className="link" onClick={()=>setAuthMode('email-login')}>Log In</span></p>
            <span className="link back-link" onClick={()=>setAuthMode('options')}>← Back</span>
          </div>
        )}
        {authMode === 'phone' && (
          <div className="phone-form">
            {!showOtpInput ? (
              <>
                <input type="tel" placeholder="Phone (e.g. 9876543210)" className="input-field" value={phone} onChange={(e)=>setPhone(e.target.value)} />
                <div id="recaptcha-container"></div>
                <button onClick={handleSendOtp} className="primary-btn full-width mb-10">Send OTP</button>
              </>
            ) : (
              <>
                <input type="text" placeholder="Enter OTP" className="input-field" value={otp} onChange={(e)=>setOtp(e.target.value)} />
                <button onClick={handleVerifyOtp} className="primary-btn full-width mb-10">Verify & Login</button>
              </>
            )}
            <span className="link back-link" onClick={()=>setAuthMode('options')}>← Back</span>
          </div>
        )}
      </div>
    </div>
  );
};
 
// ------------------------------------------------------------------
// DASHBOARD — UPGRADED
// ------------------------------------------------------------------
const BACKEND_URL = 'https://lead-sniper.onrender.com';
 
// Suggested subreddits users can quick-add
const SUGGESTED_SUBREDDITS = [
  'entrepreneur', 'startups', 'SaaS', 'marketing',
  'smallbusiness', 'digitalnomad', 'forhire', 'hiring'
];
 
const Dashboard = ({ payLink }) => {
  const [step, setStep] = useState('input');
  const [productDesc, setProductDesc] = useState('');
  const [subreddits, setSubreddits] = useState([]);
  const [subredditInput, setSubredditInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const pollRef = useRef(null);
 
  const { user, isPro } = useAuth();
 
  // Clean up polling on unmount
  useEffect(() => () => clearInterval(pollRef.current), []);
 
  const addLog = (msg) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
 
  // --- Subreddit tag management ---
  const addSubreddit = (name) => {
    const clean = name.trim().replace(/^r\//i, '').toLowerCase();
    if (clean && !subreddits.includes(clean)) {
      setSubreddits(prev => [...prev, clean]);
    }
    setSubredditInput('');
  };
 
  const removeSubreddit = (name) => {
    setSubreddits(prev => prev.filter(s => s !== name));
  };
 
  const handleSubredditKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && subredditInput.trim()) {
      e.preventDefault();
      addSubreddit(subredditInput);
    }
  };
 
  // --- Copy reply draft to clipboard ---
  const copyReply = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
 
  // --- Main search: kick off job, then poll ---
  const handleSearch = async () => {
    if (!productDesc.trim()) return;
 
    setStep('processing');
    setIsLoading(true);
    setLogs([]);
    setLeads([]);
 
    addLog('Initializing Sniper Bot...');
    addLog(subreddits.length > 0
      ? `Targeting: r/${subreddits.join(', r/')}`
      : 'Scanning r/all (tip: add subreddits for better results)'
    );
 
    try {
      // 1. Kick off the background job
      const res = await fetch(`${BACKEND_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: productDesc,
          subreddits: subreddits,
          limit: 30,
          email: user?.email || 'anonymous',
        }),
      });
 
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Server error ${res.status}`);
      }
 
      const { job_id, estimated_time_seconds } = await res.json();
      addLog(`Job started (ID: ${job_id.slice(0, 8)}...)`);
      addLog(`Estimated wait: ~${estimated_time_seconds}s`);
 
      // 2. Poll /api/job/:id every 3 seconds
      let attempt = 0;
      pollRef.current = setInterval(async () => {
        attempt++;
        try {
          const pollRes = await fetch(`${BACKEND_URL}/api/job/${job_id}`);
          const pollData = await pollRes.json();
 
          if (pollData.status === 'running') {
            addLog(`Scoring leads... (${attempt * 3}s elapsed)`);
          }
 
          if (pollData.status === 'done') {
            clearInterval(pollRef.current);
            addLog(`✅ ${pollData.total} leads acquired.`);
            setTimeout(() => {
              setLeads(pollData.results || []);
              setStep('results');
              setIsLoading(false);
            }, 600);
          }
 
          if (pollData.status === 'error') {
            clearInterval(pollRef.current);
            addLog(`❌ Job failed: ${pollData.error}`);
            setIsLoading(false);
          }
 
          // Safety timeout after 3 minutes
          if (attempt > 60) {
            clearInterval(pollRef.current);
            addLog('⚠️ Timed out. Please try again.');
            setIsLoading(false);
          }
        } catch (pollErr) {
          addLog(`⚠️ Poll error: ${pollErr.message}`);
        }
      }, 3000);
 
    } catch (error) {
      clearInterval(pollRef.current);
      addLog(`❌ ${error.message}`);
      setIsLoading(false);
    }
  };
 
  const visibleLeads = isPro ? leads : leads.slice(0, 3);
  const lockedCount = leads.length - 3;
 
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 border-green-500/50';
    if (score >= 50) return 'text-yellow-400 border-yellow-500/50';
    return 'text-red-400 border-red-500/50';
  };
 
  const getScoreBg = (score) => {
    if (score >= 80) return '#16a34a';
    if (score >= 50) return '#ca8a04';
    return '#dc2626';
  };
 
  return (
    <div className="dashboard-container">
      <div className="dash-header">
        <h2>Mission Control</h2>
        <div className="user-badge">
          <div className="avatar-small">{user?.email ? user.email[0].toUpperCase() : 'U'}</div>
          <span className="desktop-only">{user?.email || user?.phoneNumber}</span>
          {isPro && <span className="pro-tag">PRO AGENT</span>}
        </div>
      </div>
 
      <div className="tool-wrapper">
 
        {/* ── INPUT STEP ── */}
        {step === 'input' && (
          <div className="input-section fade-in">
            <div className="radar-icon-large"><Target size={60} /></div>
            <h1 className="tool-title">Define Target</h1>
            <p className="tool-sub">
              Describe what you're selling, pick subreddits to search, and let the AI hunt.
            </p>
 
            <div className="search-box">
              <textarea
                className="textarea"
                placeholder="e.g. A CRM for freelance photographers that handles invoicing..."
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
              />
 
              {/* Subreddit targeting */}
              <div className="subreddit-section">
                <p className="subreddit-label">
                  <Target size={13} style={{marginRight: 5}}/>
                  Target subreddits <span style={{color:'#64748b', fontWeight:400}}>(optional — leave empty to search everywhere)</span>
                </p>
 
                {/* Tag chips */}
                {subreddits.length > 0 && (
                  <div className="tag-row">
                    {subreddits.map(s => (
                      <span key={s} className="tag">
                        r/{s}
                        <button onClick={() => removeSubreddit(s)} className="tag-remove">×</button>
                      </span>
                    ))}
                  </div>
                )}
 
                {/* Manual input */}
                <div className="subreddit-input-row">
                  <input
                    className="sub-input"
                    placeholder="Type subreddit name and press Enter"
                    value={subredditInput}
                    onChange={(e) => setSubredditInput(e.target.value)}
                    onKeyDown={handleSubredditKeyDown}
                  />
                  <button
                    className="add-sub-btn"
                    onClick={() => addSubreddit(subredditInput)}
                    disabled={!subredditInput.trim()}
                  >
                    <Plus size={16} />
                  </button>
                </div>
 
                {/* Quick-add suggestions */}
                <div className="suggestions">
                  {SUGGESTED_SUBREDDITS.filter(s => !subreddits.includes(s)).map(s => (
                    <button key={s} className="suggestion-pill" onClick={() => addSubreddit(s)}>
                      + r/{s}
                    </button>
                  ))}
                </div>
              </div>
 
              <button
                onClick={handleSearch}
                disabled={!productDesc.trim() || isLoading}
                className="primary-btn search-btn"
              >
                {isLoading
                  ? <Loader2 className="spin" size={20}/>
                  : <>Start Scan <Zap size={18}/></>
                }
              </button>
            </div>
          </div>
        )}
 
        {/* ── PROCESSING STEP ── */}
        {step === 'processing' && (
          <div className="center-container">
            <div className="radar-container">
              <div className="radar-sweep"></div>
              <div className="radar-grid"></div>
              <Target size={40} className="radar-center"/>
            </div>
            <div className="terminal-logs">
              {logs.map((log, i) => (
                <div key={i} className="log-entry slide-up">{log}</div>
              ))}
            </div>
            <p style={{color:'#475569', fontSize:'0.8rem', marginTop: 12}}>
              This takes ~60 seconds — we're scanning 30 posts and scoring each one with AI.
            </p>
          </div>
        )}
 
        {/* ── RESULTS STEP ── */}
        {step === 'results' && (
          <div className="results-container fade-in">
            <div className="results-header">
              <div>
                <h3 style={{margin:0}}>{leads.length} leads found</h3>
                {subreddits.length > 0 && (
                  <p style={{color:'#64748b', fontSize:'0.8rem', margin:'4px 0 0'}}>
                    from r/{subreddits.join(', r/')}
                  </p>
                )}
              </div>
              <button onClick={() => { setStep('input'); setLeads([]); setLogs([]); }} className="secondary-btn">
                New Mission
              </button>
            </div>
 
            <div className="grid">
              {visibleLeads.map((lead) => {
                const isExpanded = expandedId === lead.id;
                return (
                  <div key={lead.id} className="glass-panel card">
 
                    {/* Score badge + subreddit */}
                    <div className="card-header">
                      <div className="match-badge" style={{color: getScoreBg(lead.score)}}>
                        <Zap size={14} fill="currentColor" /> {lead.score}% INTENT
                      </div>
                      <span className="time" style={{color:'#64748b', fontSize:'0.8rem'}}>
                        r/{lead.subreddit || 'reddit'}
                      </span>
                    </div>
 
                    {/* Post title */}
                    <h3 className="card-title">{lead.title || lead.text}</h3>
 
                    {/* Post body preview */}
                    {lead.body && (
                      <p style={{color:'#94a3b8', fontSize:'0.85rem', margin:'0 0 16px', lineHeight:1.5}}>
                        {lead.body.slice(0, 120)}{lead.body.length > 120 ? '...' : ''}
                      </p>
                    )}
 
                    {/* Reply draft — only for high-intent leads */}
                    {lead.reply_draft && (
                      <div className="reply-draft-box">
                        <div className="reply-draft-header">
                          <span className="reply-draft-label">✍️ AI Reply Draft</span>
                          <button
                            className="copy-btn"
                            onClick={() => copyReply(lead.id, lead.reply_draft)}
                          >
                            {copiedId === lead.id
                              ? <><CheckCircle size={13}/> Copied!</>
                              : <><Copy size={13}/> Copy</>
                            }
                          </button>
                        </div>
                        <p className="reply-draft-text">
                          {isExpanded
                            ? lead.reply_draft
                            : lead.reply_draft.slice(0, 100) + (lead.reply_draft.length > 100 ? '...' : '')
                          }
                        </p>
                        {lead.reply_draft.length > 100 && (
                          <button
                            className="expand-btn"
                            onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                          >
                            {isExpanded ? 'Show less ↑' : 'Read full draft ↓'}
                          </button>
                        )}
                      </div>
                    )}
 
                    {/* Footer */}
                    <div className="card-footer" style={{marginTop:'auto', paddingTop: 12}}>
                      <a href={lead.url} target="_blank" rel="noreferrer" className="reply-btn">
                        View Thread <ExternalLink size={14} style={{marginLeft:5}}/>
                      </a>
                    </div>
                  </div>
                );
              })}
 
              {/* PAYWALL */}
              {!isPro && lockedCount > 0 && (
                <div className="glass-panel paywall-blur">
                  <div className="blur-overlay">
                    {[1,2,3].map(i => (
                      <div key={i} className="fake-card">
                        <div className="fake-line width-60"></div>
                        <div className="fake-line width-100"></div>
                      </div>
                    ))}
                  </div>
                  <div className="paywall-content">
                    <div className="lock-ring"><Lock size={32} /></div>
                    <h3>{lockedCount} Leads + AI Reply Drafts Hidden</h3>
                    <p>Upgrade to Pro to reveal all leads, unlock AI-written replies, and export to CSV.</p>
                    <a href={payLink} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
                      <button className="primary-btn upgrade-btn">Unlock Full Report — ₹399/mo</button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
 
// --- FOOTER ---
const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <div className="logo">Lead<span style={{color: '#ea580c'}}>Sniper</span></div>
      <div className="copy">© 2025 LeadSniper Inc.</div>
    </div>
  </footer>
);
 
const Popup = ({ onClose }) => (
  <div className="popup-overlay">
    <div className="popup-card">
      <button onClick={onClose} className="close-btn"><X size={20}/></button>
      <h3>🔥 Special Offer!</h3>
      <p>50% OFF your first month.</p>
      <button className="primary-btn full-width">Claim Offer</button>
    </div>
  </div>
);
 
// --- GLOBAL STYLES ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    :root { 
      --primary: #ea580c; 
      --primary-dark: #c2410c; 
      --bg-dark: #0f172a; 
      --glass-bg: rgba(30, 41, 59, 0.4); 
      --glass-border: rgba(255, 255, 255, 0.08); 
      --text-muted: #94a3b8; 
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background-color: var(--bg-dark); color: white; overflow-x: hidden; }
    .page { min-height: 100vh; display: flex; flex-direction: column; width: 100%; align-items: center; background: radial-gradient(circle at top, #1e293b 0%, #0f172a 100%); }
    .content { flex: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 20px; position: relative; z-index: 1; }
    
    .fade-in { animation: fadeIn 0.5s ease-out; }
    .slide-up { animation: slideUp 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
 
    .primary-btn { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border: none; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1rem; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3); }
    .primary-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(234, 88, 12, 0.5); }
    .primary-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    .secondary-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    .secondary-btn:hover { background: rgba(255,255,255,0.1); }
 
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid var(--glass-border); background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; width: 100%; }
    .nav-links { display: flex; gap: 30px; font-size: 0.95rem; color: var(--text-muted); cursor: pointer; }
    .nav-links span:hover, .active { color: white; font-weight: 600; }
    .logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.25rem; cursor: pointer; letter-spacing: -0.5px; }
    .logo-icon { background: var(--primary); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
 
    .landing { text-align: center; padding: 6rem 20px; }
    .hero-title { font-size: 4rem; line-height: 1.1; margin-bottom: 24px; font-weight: 800; letter-spacing: -1px; }
    .gradient-text { background: linear-gradient(to right, #fbbf24, #ea580c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-sub { font-size: 1.25rem; color: var(--text-muted); margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.6; }
    .feature-grid, .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 60px; width: 100%; }
    .glass-card { background: var(--glass-bg); backdrop-filter: blur(12px); border: 1px solid var(--glass-border); border-radius: 16px; padding: 32px; text-align: left; transition: transform 0.2s; }
    .glass-card:hover { border-color: rgba(255,255,255,0.2); }
    .price { font-size: 3rem; font-weight: 800; margin: 16px 0; color: white; }
    .price span { font-size: 1rem; color: var(--text-muted); font-weight: 500; }
 
    .login-container { display: flex; justify-content: center; align-items: center; min-height: 70vh; padding: 20px; }
    .login-box { width: 100%; max-width: 420px; text-align: center; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .input-field { width: 100%; padding: 14px; margin: 10px 0; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.3); color: white; outline: none; font-size: 1rem; transition: border 0.2s; }
    .input-field:focus { border-color: var(--primary); }
    .google-btn { background: white; color: #0f172a; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 1rem; transition: background 0.2s; width: 100%; }
    .google-btn:hover { background: #f1f5f9; }
 
    /* DASHBOARD */
    .dashboard-container { width: 100%; max-width: 1000px; margin: 0 auto; padding: 20px; }
    .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid var(--glass-border); }
    .user-badge { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); padding: 6px 16px; border-radius: 30px; border: 1px solid var(--glass-border); }
    .avatar-small { width: 28px; height: 28px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: white; }
    .pro-tag { background: #22c55e; color: #052e16; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.5px; }
 
    .input-section { text-align: center; padding: 40px 0; }
    .radar-icon-large { margin-bottom: 20px; color: var(--primary); animation: pulse 2s infinite; }
    .search-box { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 16px; border-radius: 12px; margin-top: 30px; display: flex; flex-direction: column; gap: 12px; text-align: left; }
    .textarea { width: 100%; border: none; background: transparent; padding: 10px; font-size: 1.05rem; resize: none; min-height: 100px; font-family: inherit; color: white; outline: none; }
    .search-btn { width: 100%; border-radius: 8px; }
 
    /* SUBREDDIT TARGETING */
    .subreddit-section { border-top: 1px solid var(--glass-border); padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .subreddit-label { font-size: 0.8rem; font-weight: 600; color: #94a3b8; margin: 0; display: flex; align-items: center; }
    .tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { background: rgba(234,88,12,0.15); border: 1px solid rgba(234,88,12,0.3); color: #fb923c; padding: 3px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .tag-remove { background: none; border: none; color: #fb923c; cursor: pointer; font-size: 1rem; padding: 0; line-height: 1; opacity: 0.7; }
    .tag-remove:hover { opacity: 1; }
    .subreddit-input-row { display: flex; gap: 8px; }
    .sub-input { flex: 1; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; outline: none; font-family: inherit; }
    .sub-input:focus { border-color: var(--primary); }
    .add-sub-btn { background: rgba(234,88,12,0.15); border: 1px solid rgba(234,88,12,0.3); color: #fb923c; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    .add-sub-btn:hover:not(:disabled) { background: rgba(234,88,12,0.25); }
    .add-sub-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .suggestions { display: flex; flex-wrap: wrap; gap: 6px; }
    .suggestion-pill { background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); color: #64748b; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
    .suggestion-pill:hover { background: rgba(255,255,255,0.08); color: #94a3b8; border-color: rgba(255,255,255,0.15); }
 
    /* PROCESSING */
    .center-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; }
    .radar-container { position: relative; width: 120px; height: 120px; border: 2px solid #334155; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(circle, #1e293b 0%, #0f172a 70%); box-shadow: 0 0 30px rgba(234, 88, 12, 0.2); }
    .radar-grid { position: absolute; width: 100%; height: 100%; background-image: radial-gradient(transparent 90%, #334155 90%); background-size: 20px 20px; opacity: 0.3; }
    .radar-sweep { position: absolute; width: 50%; height: 50%; background: linear-gradient(90deg, transparent, rgba(234, 88, 12, 0.5)); top: 0; left: 50%; transform-origin: bottom left; animation: scan 2s linear infinite; }
    .radar-center { color: var(--primary); z-index: 2; }
    @keyframes scan { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
    .terminal-logs { margin-top: 30px; font-family: 'Courier New', monospace; color: #4ade80; text-align: left; width: 100%; max-width: 520px; max-height: 130px; overflow: hidden; display: flex; flex-direction: column; gap: 4px; opacity: 0.85; font-size: 0.82rem; }
    .log-entry { animation: slideUp 0.3s ease-out; }
 
    /* RESULTS */
    .results-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    .glass-panel { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
    .glass-panel:hover { transform: translateY(-3px); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5); }
    .card-header { display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center; }
    .match-badge { font-weight: 800; display: flex; align-items: center; gap: 4px; font-size: 0.8rem; }
    .card-title { font-size: 1rem; margin: 0 0 12px 0; line-height: 1.5; font-weight: 600; }
    .reply-btn { display: inline-flex; align-items: center; color: white; text-decoration: none; font-weight: 600; font-size: 0.85rem; padding: 8px 0; border-bottom: 1px solid transparent; transition: border 0.2s; }
    .reply-btn:hover { border-bottom-color: var(--primary); color: var(--primary); }
 
    /* AI REPLY DRAFT BOX */
    .reply-draft-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; }
    .reply-draft-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .reply-draft-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.03em; }
    .copy-btn { background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); color: #94a3b8; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 5px; transition: all 0.15s; font-family: inherit; }
    .copy-btn:hover { background: rgba(255,255,255,0.1); color: white; }
    .reply-draft-text { font-size: 0.85rem; color: #cbd5e1; line-height: 1.6; margin: 0 0 6px; }
    .expand-btn { background: none; border: none; color: #64748b; font-size: 0.75rem; cursor: pointer; padding: 0; font-family: inherit; transition: color 0.15s; }
    .expand-btn:hover { color: #94a3b8; }
 
    /* PAYWALL */
    .paywall-blur { grid-column: 1 / -1; position: relative; overflow: hidden; border: 1px dashed #334155; padding: 0; min-height: 250px; display: flex; align-items: center; justify-content: center; }
    .blur-overlay { position: absolute; inset: 0; filter: blur(8px); opacity: 0.3; pointer-events: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; padding: 24px; }
    .fake-card { background: #334155; height: 150px; border-radius: 16px; padding: 20px; }
    .fake-line { height: 10px; background: #475569; margin-bottom: 10px; border-radius: 4px; }
    .width-60 { width: 60%; } .width-100 { width: 100%; }
    .paywall-content { position: relative; z-index: 10; text-align: center; max-width: 420px; padding: 24px; }
    .lock-ring { background: rgba(255,255,255,0.1); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; border: 1px solid rgba(255,255,255,0.2); }
 
    /* MISC */
    .full-width { width: 100%; }
    .mb-10 { margin-bottom: 10px; }
    .text-small { font-size: 0.85rem; color: var(--text-muted); }
    .link { color: var(--primary); cursor: pointer; font-weight: 600; }
    .back-link { display: block; margin-top: 12px; font-size: 0.85rem; }
    .badge { display: inline-block; background: rgba(234,88,12,0.15); border: 1px solid rgba(234,88,12,0.3); color: #fb923c; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; margin-bottom: 24px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .footer { border-top: 1px solid var(--glass-border); padding: 24px; width: 100%; }
    .footer-content { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
    .cta-group { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .big-btn { font-size: 1.1rem; padding: 16px 32px; }
    .small-btn { font-size: 0.9rem; padding: 8px 16px; }
    .social-proof { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--text-muted); }
    .avatars { display: flex; }
    .avatar { width: 28px; height: 28px; background: #334155; border-radius: 50%; border: 2px solid var(--bg-dark); margin-left: -8px; }
    .avatar:first-child { margin-left: 0; }
    .icon-box { color: var(--primary); margin-bottom: 16px; }
    .features-section { margin-top: 80px; width: 100%; }
    .pricing-section { padding: 60px 20px; }
    .text-center { text-align: center; }
    .desktop-only { display: inline; }
    .pop-tag { background: var(--primary); color: white; font-size: 0.7rem; font-weight: 800; padding: 3px 10px; border-radius: 4px; display: inline-block; margin-bottom: 12px; }
    .featured { border-color: rgba(234,88,12,0.4); }
    .popup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .popup-card { background: #1e293b; border: 1px solid var(--glass-border); border-radius: 16px; padding: 32px; max-width: 360px; text-align: center; position: relative; }
    .close-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; color: white; cursor: pointer; }
    .auth-options, .email-form, .phone-form { display: flex; flex-direction: column; gap: 10px; }
    .tool-title { font-size: 2rem; font-weight: 800; margin: 0 0 8px; }
    .tool-sub { color: var(--text-muted); margin: 0 0 16px; }
 
    @media (max-width: 768px) {
      .hero-title { font-size: 2.5rem; }
      .footer-content { flex-direction: column; gap: 20px; }
      .desktop-nav { display: none; }
      .nav { padding: 1rem; }
      .dashboard-container { padding: 10px; }
      .desktop-only { display: none; }
    }
  `}</style>
);
 








