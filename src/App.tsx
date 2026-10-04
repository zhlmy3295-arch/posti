import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  User as UserIcon,
  Phone,
  LogOut,
  MessageSquare,
  ArrowLeft,
  MessageCircle,
  Search,
  Trash2,
  Plus,
  Users,
  Heart,
  UserCircle,
  Camera,
  X,
  Globe,
  Bell,
  UserPlus,
  Settings,
  Mail,
  Key
} from "lucide-react";
import { format } from "date-fns";
import {
  db,
  auth,
  ref,
  push,
  onValue,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
  remove,
  set,
  update,
  get,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "./lib/firebase";
import { cn } from "./lib/utils";

import { GlobalChat } from "./components/GlobalChat";

interface ChatMessage {
  id: string;
  username: string;
  phone: string;
  targetPhone?: string;
  text: string;
  imageUrl?: string;
  timestamp: any; // Firestore timestamp
  likes?: Record<string, boolean>;
  comments?: Record<
    string,
    { username: string; phone: string; text: string; timestamp: any }
  >;
}

const playTickSound = () => {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    console.error("Audio playback error:", e);
  }
};

export default function App() {
  const [username, setUsername] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [gender, setGender] = useState<string>("male"); // 'male' or 'female'
  const [age, setAge] = useState<string>("");
  const [isJoined, setIsJoined] = useState(false);
  const [targetPhones, setTargetPhones] = useState<string[] | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Read initial username from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem("chat_username");
    const savedPhone = localStorage.getItem("chat_phone");
    const savedGender = localStorage.getItem("chat_gender");
    const savedAge = localStorage.getItem("chat_age");
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && saved && savedPhone) {
        setUsername(saved);
        setPhone(savedPhone);
        if (savedGender) setGender(savedGender);
        if (savedAge) setAge(savedAge);
        setIsJoined(true);
      } else {
        setIsJoined(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (phone && isJoined) {
      const userRef = ref(db, `users/${phone}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.profilePicture) setProfilePic(data.profilePicture);
          if (data.username && data.username !== username) {
            setUsername(data.username);
            localStorage.setItem("chat_username", data.username);
          }
          if (data.gender && data.gender !== gender) {
            setGender(data.gender);
            localStorage.setItem("chat_gender", data.gender);
          }
          if (data.age && data.age !== age) {
            setAge(data.age);
            localStorage.setItem("chat_age", data.age);
          }
        }
      });
      return () => unsub();
    }
  }, [phone, isJoined, username, gender, age]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isSignUpMode) {
        if (username.trim() && phone.trim() && age.trim() && email.trim() && password.trim()) {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
          
          localStorage.setItem("chat_username", username.trim());
          localStorage.setItem("chat_phone", phone.trim());
          localStorage.setItem("chat_gender", gender);
          localStorage.setItem("chat_age", age.trim());
          setIsJoined(true);

          const userRef = ref(db, `users/${phone.trim()}`);
          await update(userRef, {
            uid: userCredential.user.uid,
            email: email.trim(),
            username: username.trim(),
            gender,
            age: age.trim()
          });
        }
      } else {
        if ((email.trim() || phone.trim()) && password.trim()) {
          let loginEmail = email.trim();
          
          if (!loginEmail && phone.trim()) {
            const userRef = ref(db, `users/${phone.trim()}`);
            const phoneSnapshot = await get(userRef);
            if (phoneSnapshot.exists() && phoneSnapshot.val().email) {
              loginEmail = phoneSnapshot.val().email;
            } else {
              setAuthError("رقم الهاتف غير مسجل.");
              return;
            }
          }
          
          const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password.trim());
          
          const usersRef = query(ref(db, "users"), orderByChild("email"), equalTo(loginEmail));
          const snapshot = await get(usersRef);
          if (snapshot.exists()) {
            const users = snapshot.val();
            const phoneKey = Object.keys(users)[0];
            const userData = users[phoneKey];
            
            setUsername(userData.username || "");
            setPhone(phoneKey);
            setGender(userData.gender || "male");
            setAge(userData.age || "");
            
            localStorage.setItem("chat_username", userData.username || "");
            localStorage.setItem("chat_phone", phoneKey);
            localStorage.setItem("chat_gender", userData.gender || "male");
            localStorage.setItem("chat_age", userData.age || "");
            
            setIsJoined(true);
          } else {
            setAuthError("لم يتم العثور على بيانات المستخدم.");
          }
        }
      }
    } catch (error: any) {
      console.error("Auth error", error);
      setAuthError(error.message || "حدث خطأ في المصادقة");
    }
  };

  const handleLeave = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("chat_username");
    localStorage.removeItem("chat_phone");
    localStorage.removeItem("chat_gender");
    localStorage.removeItem("chat_age");
    setUsername("");
    setPhone("");
    setGender("male");
    setAge("");
    setIsJoined(false);
    setTargetPhones(null);
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>
          </div>
          <h1
            className="text-3xl font-bold text-white text-center mb-2 tracking-tight"
            dir="auto"
          >
            Pulse Chat
          </h1>
          <p className="text-slate-400 text-center mb-8" dir="auto">
            {isSignUpMode ? "انشاء حساب جديد (Create Account)" : "تسجيل الدخول (Login)"}
          </p>

          <form onSubmit={handleJoin} className="space-y-4" dir="auto">
            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
                {authError}
              </div>
            )}
            
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right"
              >
                البريد الإلكتروني (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  id="email"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                  placeholder="مثال: name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={isSignUpMode || (!phone.trim())}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right"
              >
                رقم الهاتف (Phone Number)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                  placeholder="مثال: +966 5..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required={isSignUpMode || (!email.trim())}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right"
              >
                كلمة المرور (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  id="password"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            {isSignUpMode && (
              <>
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right"
                  >
                    الاسم (Username)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      id="username"
                      className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                      placeholder="مثال: علي"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={24}
                      required={isSignUpMode}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="age"
                      className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right"
                    >
                      العمر (Age)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="age"
                        className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                        placeholder="مثال: 25"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        min="1"
                        max="120"
                        required={isSignUpMode}
                      />
                    </div>
                  </div>

                  <div className="flex-1">
                    <label
                      htmlFor="gender"
                      className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right"
                    >
                      النوع (Gender)
                    </label>
                    <select
                      id="gender"
                      className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner appearance-none"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="male">ذكر (Male)</option>
                      <option value="female">أنثى (Female)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSignUpMode ? (!username.trim() || !phone.trim() || !age.trim() || !email.trim() || !password.trim()) : (!email.trim() || !password.trim())}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isSignUpMode ? (
                <>
                  <UserPlus className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                  <span>انشاء حساب</span>
                </>
              ) : (
                <span>تسجيل دخول</span>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setIsSignUpMode(!isSignUpMode)}
              className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              {!isSignUpMode && <UserPlus className="w-4 h-4" />}
              {isSignUpMode ? "العودة إلى تسجيل الدخول" : "ليس لديك حساب؟ انشاء حساب"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        username={username}
        phone={phone}
        gender={gender}
        age={age}
        profilePic={profilePic}
        onLeave={handleLeave}
        onSave={(newUsername, newPhone, newGender, newAge, newPic) => {
          if (newPhone !== phone) {
            setPhone(newPhone);
            localStorage.setItem("chat_phone", newPhone);
            setTargetPhones(null);
          }
          if (newUsername !== username) {
            setUsername(newUsername);
            localStorage.setItem("chat_username", newUsername);
          }
          if (newGender !== gender) {
            setGender(newGender);
            localStorage.setItem("chat_gender", newGender);
          }
          if (newAge !== age) {
            setAge(newAge);
            localStorage.setItem("chat_age", newAge);
          }
          setProfilePic(newPic);
        }}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      {!targetPhones || targetPhones.length === 0 ? (
        <ChatSelection
          username={username}
          phone={phone}
          profilePic={profilePic}
          onJoinChat={setTargetPhones}
          onLeave={handleLeave}
          onOpenProfile={() => setShowProfile(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      ) : targetPhones[0] === "GLOBAL_CHAT" ? (
        <GlobalChat
          username={username}
          phone={phone}
          profilePic={profilePic}
          onBack={() => setTargetPhones(null)}
          onLeave={handleLeave}
          onOpenProfile={() => setShowProfile(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      ) : (
        <ChatRoom
          username={username}
          phone={phone}
          targetPhones={targetPhones}
          profilePic={profilePic}
          onBack={() => setTargetPhones(null)}
          onLeave={handleLeave}
          onOpenProfile={() => setShowProfile(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
    </>
  );
}


function ChatSelection({
  username,
  phone,
  profilePic,
  onJoinChat,
  onLeave,
  onOpenProfile,
  onOpenSettings,
}: {
  username: string;
  phone: string;
  profilePic: string | null;
  onJoinChat: (targetPhones: string[]) => void;
  onLeave: () => void;
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
}) {
  const [targetInputs, setTargetInputs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`saved_numbers_${phone}`);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch {
      return [];
    }
  });

  const [currentInput, setCurrentInput] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<Record<string, any>>({});
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      `saved_numbers_${phone}`,
      JSON.stringify(targetInputs),
    );
  }, [targetInputs, phone]);

  useEffect(() => {
    const myReqRef = ref(db, `users/${phone}/my_requests`);
    const unsubscribeMy = onValue(myReqRef, (snapshot) => {
      setMyRequests(snapshot.val() || {});
    });

    const incReqRef = ref(db, `users/${phone}/access_requests`);
    const unsubscribeInc = onValue(incReqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reqs = Object.keys(data)
          .map((key) => ({ phone: key, ...data[key] }))
          .filter((r) => r.status === "pending");
        setIncomingRequests(reqs);
      } else {
        setIncomingRequests([]);
      }
    });

    return () => {
      unsubscribeMy();
      unsubscribeInc();
    };
  }, [phone]);

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const trimmed = currentInput.trim();
    if (trimmed === phone) {
      setSearchError("لا يمكنك إضافة رقمك الخاص.");
      return;
    }
    if (trimmed && !targetInputs.includes(trimmed)) {
      try {
        const userRef = ref(db, `users/${trimmed}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          await update(ref(db, `users/${trimmed}/access_requests/${phone}`), {
            status: "pending",
            requesterName: username,
            timestamp: Date.now(),
          });
          await update(ref(db, `users/${phone}/my_requests/${trimmed}`), {
            status: "pending",
          });

          setTargetInputs([...targetInputs, trimmed]);
          setCurrentInput("");
        } else {
          setSearchError("هذا الرقم غير مسجل في التطبيق.");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setSearchError("حدث خطأ أثناء البحث عن الرقم.");
      }
    } else if (targetInputs.includes(trimmed)) {
      setSearchError("هذا الرقم مضاف بالفعل.");
    }
  };

  const handleRemoveNumber = (num: string) => {
    setTargetInputs(targetInputs.filter((n) => n !== num));
  };

  const handleApprove = async (requesterPhone: string) => {
    await update(ref(db, `users/${phone}/access_requests/${requesterPhone}`), {
      status: "approved",
    });
    await update(ref(db, `users/${requesterPhone}/my_requests/${phone}`), {
      status: "approved",
    });
  };

  const handleReject = async (requesterPhone: string) => {
    await update(ref(db, `users/${phone}/access_requests/${requesterPhone}`), {
      status: "rejected",
    });
    await update(ref(db, `users/${requesterPhone}/my_requests/${phone}`), {
      status: "rejected",
    });
  };

  const handleSubmit = () => {
    const approvedTargets = targetInputs.filter(
      (num) => myRequests[num]?.status === "approved"
    );
    if (approvedTargets.length > 0) {
      onJoinChat(approvedTargets);
    } else {
      setSearchError("لا توجد أرقام موافق عليها لعرض منشوراتها.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <header className="h-16 flex-shrink-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center px-6 sm:px-8 justify-between z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide leading-tight">
              Pulse Posts
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium italic">
              Connected to Firebase RTDB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
          >
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <UserCircle className="w-6 h-6 text-slate-400" />
            )}
            <span className="hidden sm:inline text-sm font-medium text-slate-300">
              {username}
            </span>
          </button>

                    {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center gap-2 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer relative"
              title="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {incomingRequests.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950"></span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden" dir="auto">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                  <h3 className="font-bold text-white">طلبات المتابعة ({incomingRequests.length})</h3>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {incomingRequests.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      لا توجد طلبات متابعة حالياً
                    </div>
                  ) : (
                    incomingRequests.map((req, idx) => (
                      <div key={idx} className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{req.requesterName || 'مستخدم'}</p>
                            <p className="text-xs text-slate-400" dir="ltr">{req.phone}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.phone)}
                            className="flex-1 py-1.5 px-3 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            موافقة
                          </button>
                          <button
                            onClick={() => handleReject(req.phone)}
                            className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                          >
                            رفض
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="الإعدادات"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onLeave}
            className="flex items-center gap-2 p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="تسجيل خروج"
            aria-label="تسجيل خروج"
          >
            <span className="text-sm font-medium">تسجيل خروج</span>
            <LogOut className="w-5 h-5 ltr:rotate-180" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
              <MessageCircle className="w-8 h-8" />
            </div>
          </div>

          {showSearch ? (
            <div
              className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
              dir="auto"
            >
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setShowSearch(false)}
                  className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 rtl:hidden" />
                  <ArrowLeft className="w-5 h-5 hidden rtl:block rotate-180" />
                </button>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  البحث عن حسابات
                </h2>
              </div>
              <p className="text-slate-400 mb-4 text-sm" dir="auto">
                أضف أرقام هواتف أصحاب الحسابات لرؤية منشوراتهم
              </p>

              <form onSubmit={handleAddNumber}>
                <label
                  htmlFor="targetPhone"
                  className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right"
                >
                  رقم صاحب المنشور (Owner Phone Number)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="tel"
                      id="targetPhone"
                      className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                      placeholder="e.g. +966 5..."
                      value={currentInput}
                      onChange={(e) => {
                        setCurrentInput(e.target.value);
                        setSearchError(null);
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!currentInput.trim()}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {searchError && (
                  <p className="mt-2 text-sm text-red-400">{searchError}</p>
                )}
              </form>

                            {targetInputs.length > 0 && (
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {targetInputs.map((num, idx) => {
                    const status = myRequests[num]?.status;
                    let statusText = "";
                    let statusColor = "text-slate-400";
                    if (status === "pending") {
                      statusText = "(قيد الانتظار)";
                      statusColor = "text-yellow-400";
                    } else if (status === "approved") {
                      statusText = "(مقبول)";
                      statusColor = "text-green-400";
                    } else if (status === "rejected") {
                      statusText = "(مرفوض)";
                      statusColor = "text-red-400";
                    }

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl animate-in fade-in"
                      >
                        <div className="flex flex-col">
                          <span className="text-slate-200" dir="ltr">
                            {num}
                          </span>
                          {statusText && (
                            <span className={`text-xs ${statusColor}`}>
                              {statusText}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveNumber(num)}
                          className="text-slate-400 hover:text-red-400 transition-colors bg-slate-900/50 p-2 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={targetInputs.length === 0}
                className="w-full mt-4 flex justify-center py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                عرض المنشورات (View Posts)
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <h2
                className="text-2xl font-bold text-white text-center mb-2 tracking-tight"
                dir="auto"
              >
                منشورات وبوستات
              </h2>
              <p className="text-slate-400 text-center mb-8" dir="auto">
                اختر ما تريد القيام به
              </p>
              <div className="grid grid-cols-1 gap-4" dir="auto">
                <button
                  onClick={() => onJoinChat(["GLOBAL_CHAT"])}
                  className="flex flex-col items-center justify-center p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/50 rounded-xl transition-all group"
                >
                  <div className="w-8 h-8 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-white mb-1 text-sm">
                    شات روم (Chat Room)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    غرفة دردشة جماعية عامة
                  </span>
                </button>
                <button
                  onClick={() => onJoinChat(["ALL_POSTS"])}
                  className="flex flex-col items-center justify-center p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 rounded-xl transition-all group"
                >
                  <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-white mb-1 text-sm">
                    آخر الأخبار (News Feed)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    تبويب لمنشورات الأصدقاء تلقائياً
                  </span>
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => onJoinChat([phone])}
                    className="flex flex-col items-center justify-center p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 rounded-xl transition-all group"
                  >
                    <div className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-white mb-1 text-sm">
                      منشوراتي
                    </span>
                    <span className="text-[10px] text-slate-400">
                      إضافة وعرض البوستات
                    </span>
                  </button>

                  <button
                    onClick={() => setShowSearch(true)}
                    className="flex flex-col items-center justify-center p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 rounded-xl transition-all group"
                  >
                    <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-white mb-1 text-sm">
                      حسابات الآخرين
                    </span>
                    <span className="text-[10px] text-slate-400">
                      متابعة عدة أرقام
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ChatRoom({
  username,
  phone,
  targetPhones,
  profilePic,
  onBack,
  onLeave,
  onOpenProfile,
  onOpenSettings,
}: {
  username: string;
  phone: string;
  targetPhones: string[];
  profilePic: string | null;
  onBack: () => void;
  onLeave: () => void;
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
}) {
  const [posts, setPosts] = useState<ChatMessage[]>([]);
  const [newPost, setNewPost] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postsEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const seenPostIdsRef = useRef<Set<string>>(new Set());
  const seenCommentIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isMyPosts = targetPhones.length === 1 && targetPhones[0] === phone;
  const isFeed = targetPhones.length === 1 && targetPhones[0] === "ALL_POSTS";

  const [approvedPhones, setApprovedPhones] = useState<string[]>([]);
  
  useEffect(() => {
     const myReqRef = ref(db, `users/${phone}/my_requests`);
     const unsubscribe = onValue(myReqRef, (snapshot) => {
         const data = snapshot.val();
         if (data) {
             const approved = Object.keys(data).filter(k => data[k].status === 'approved');
             setApprovedPhones(approved);
         } else {
             setApprovedPhones([]);
         }
     });
     return () => unsubscribe();
  }, [phone]);

  useEffect(() => {
    const postsRef = query(ref(db, "posts"), orderByChild("timestamp"));

    try {
      const unsubscribe = onValue(
        postsRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const loadedPosts: ChatMessage[] = Object.keys(data).map((key) => {
              const post = data[key];
              let resolvedImageUrl = post.imageUrl;
              if (post.imageChunks) {
                if (Array.isArray(post.imageChunks)) {
                  resolvedImageUrl = post.imageChunks.join("");
                } else if (typeof post.imageChunks === "object") {
                  resolvedImageUrl = Object.keys(post.imageChunks)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((k) => post.imageChunks[k])
                    .join("");
                }
              }
              return {
                id: key,
                ...post,
                imageUrl: resolvedImageUrl,
              };
            });

            loadedPosts.sort((a, b) => b.timestamp - a.timestamp); // الأحدث الأول

            let currentFeedPhones: string[] = [];
            if (isFeed) {
              try {
                const stored = localStorage.getItem(`saved_numbers_${phone}`);
                if (stored) {
                   const parsed = JSON.parse(stored);
                   currentFeedPhones = parsed.filter((p: string) => approvedPhones.includes(p));
                }
              } catch {}
            }

            const filteredPosts = isFeed
              ? loadedPosts.filter((post) =>
                  post.phone === phone || 
                  post.targetPhone === phone ||
                  currentFeedPhones.includes(
                    post.phone || post.targetPhone || "",
                  ),
                )
              : loadedPosts.filter((post) =>
                  targetPhones.includes(post.targetPhone || ""),
                );

            if (isInitialLoadRef.current) {
              filteredPosts.forEach(p => {
                seenPostIdsRef.current.add(p.id);
                if (p.comments) {
                  Object.keys(p.comments).forEach(cId => seenCommentIdsRef.current.add(cId));
                }
              });
              isInitialLoadRef.current = false;
            } else {
              let hasNewData = false;
              let newNotificationMessage = "";

              filteredPosts.forEach(p => {
                if (!seenPostIdsRef.current.has(p.id)) {
                  seenPostIdsRef.current.add(p.id);
                  if (p.phone !== phone) {
                    hasNewData = true;
                    newNotificationMessage = `منشور جديد من ${p.username}`;
                  }
                }
                if (p.comments) {
                  Object.keys(p.comments).forEach(cId => {
                    if (!seenCommentIdsRef.current.has(cId)) {
                      seenCommentIdsRef.current.add(cId);
                      if (p.comments![cId].phone !== phone) {
                        hasNewData = true;
                        newNotificationMessage = `تعليق جديد من ${p.comments![cId].username}`;
                      }
                    }
                  });
                }
              });

              if (hasNewData) {
                playTickSound();
                setToastMessage(newNotificationMessage);
                setTimeout(() => setToastMessage(null), 4000);
              }
            }

            setPosts(filteredPosts);
          } else {
            setPosts([]);
          }
          setError(null);
        },
        (err: any) => {
          console.error("Firebase Read Error:", err);
          setError(
            "لا تملك صلاحية للوصول (Permission Denied). يرجى تحديث Security Rules في فايربيس.",
          );
        },
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up listener:", err);
      setError(err.message || "Failed to connect to database");
    }
  }, [targetPhones, JSON.stringify(approvedPhones)]);

  useEffect(() => {
    // Scroll to top/bottom depending on ordering when posts change
    postsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPost.trim() && !postImage) return;

    const messageText = newPost.trim();
    const imageToSend = postImage;
    setNewPost(""); // Optimistically clear input
    setPostImage(null);

    try {
      const postsRef = ref(db, "posts");
      const newPostRef = push(postsRef);

      const postData: any = {
        username,
        phone,
        targetPhone: phone,
        text: messageText,
        timestamp: serverTimestamp(),
      };

      let chunks: string[] = [];
      if (imageToSend) {
        // Firebase RTDB max string size is ~10MB, max atomic write is ~16MB.
        // We chunk at 5MB (5,000,000 characters) to be safe.
        if (imageToSend.length > 5000000) {
          chunks = imageToSend.match(/.{1,5000000}/g) || [];
        } else {
          postData.imageUrl = imageToSend;
        }
      }

      await set(newPostRef, postData);

      if (chunks.length > 0) {
        for (let i = 0; i < chunks.length; i++) {
          await set(
            ref(db, `posts/${newPostRef.key}/imageChunks/${i}`),
            chunks[i],
          );
        }
      }

      setError(null);
    } catch (err: any) {
      console.error("Firebase Write Error:", err);
      // Restore the message so the user doesn't lose it
      setNewPost(messageText);
      setPostImage(imageToSend);
      setError(
        "فشل في الإرسال (Permission Denied). تأكد من إعدادات Security Rules.",
      );
    }
  };

  const handlePostImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("حجم الملف يجب أن يكون أقل من 20 ميغابايت");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeletePost = async (postId: string) => {
    try {
      await remove(ref(db, `posts/${postId}`));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error("Error deleting post:", err);
      setError("فشل في حذف المنشور.");
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteImage = async (postId: string, textRemaining: string) => {
    try {
      if (!textRemaining) {
        // If there's no text left, delete the entire post
        await remove(ref(db, `posts/${postId}`));
      } else {
        // Otherwise, just remove the image fields
        await remove(ref(db, `posts/${postId}/imageUrl`));
        await remove(ref(db, `posts/${postId}/imageChunks`));
      }
    } catch (err: any) {
      console.error("Error deleting image:", err);
      setError("فشل في حذف الصورة.");
    }
  };

  const handleLike = async (
    postId: string,
    currentLikes: Record<string, boolean> = {},
  ) => {
    try {
      const postLikeRef = ref(db, `posts/${postId}/likes/${phone}`);
      if (currentLikes[phone]) {
        await remove(postLikeRef);
      } else {
        await set(postLikeRef, true);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );
  const [commentText, setCommentText] = useState("");

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const commentsRef = ref(db, `posts/${postId}/comments`);
      await push(commentsRef, {
        username,
        phone,
        text: commentText.trim(),
        timestamp: serverTimestamp(),
      });
      setCommentText("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden relative">
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-5 py-3 rounded-full shadow-2xl border border-slate-700 z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-5 duration-300">
          <Bell className="w-5 h-5 text-indigo-400 animate-pulse" />
          <span className="text-sm font-medium" dir="auto">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-16 flex-shrink-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center px-4 sm:px-6 justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Back to chat selection"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            {isFeed ? (
              <Globe className="w-4 h-4 text-white" />
            ) : (
              <UserIcon className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h1
              className="text-lg font-bold text-white tracking-wide leading-tight px-1"
              dir="auto"
            >
              {isFeed
                ? "آخر الأخبار"
                : isMyPosts
                  ? "منشوراتي"
                  : "منشورات الحسابات"}
            </h1>
            <p
              className="text-[10px] sm:text-xs text-slate-500 font-medium italic"
              dir="auto"
            >
              {isFeed
                ? "جميع المنشورات العامة"
                : isMyPosts
                  ? "إدارة منشوراتك الخاصة"
                  : `عرض منشورات: ${targetPhones.length} حساب`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
          >
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <UserCircle className="w-6 h-6 text-slate-400" />
            )}
            <span className="hidden sm:inline text-sm font-medium text-slate-300">
              {username}
            </span>
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="الإعدادات"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onLeave}
            className="flex items-center gap-2 p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="تسجيل خروج"
            aria-label="تسجيل خروج"
          >
            <span className="text-sm font-medium">تسجيل خروج</span>
            <LogOut className="w-5 h-5 ltr:rotate-180" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex justify-center">
            {error}
          </div>
        )}

        {posts.length === 0 && !error ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p dir="auto">
              {isMyPosts
                ? "لا توجد منشورات. أضف منشوراً الآن!"
                : "لا توجد منشورات."}
            </p>
          </div>
        ) : (
          posts.map((msg, index) => {
            const isMe = msg.username === username && msg.phone === phone;
            const timeString = msg.timestamp
              ? format(new Date(msg.timestamp), "h:mm a")
              : "Sending...";
            return (
              <div
                key={msg.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-3 max-w-2xl mx-auto w-full mb-4"
                dir="auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0",
                        isMe
                          ? "bg-indigo-600"
                          : "bg-gradient-to-br from-indigo-500 to-purple-600",
                      )}
                    >
                      {msg.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        {msg.username}
                        {isMe && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                            أنت
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {timeString}
                      </div>
                    </div>
                  </div>
                  {isMe && (
                    <div className="flex items-center">
                      {deleteConfirmId === msg.id ? (
                        <div className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2 rounded-lg py-1 border border-red-500/20">
                          <span className="text-xs mr-2 whitespace-nowrap">
                            متأكد؟
                          </span>
                          <button
                            onClick={() => handleDeletePost(msg.id)}
                            className="text-[10px] bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                          >
                            نعم
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded hover:bg-slate-600 transition-colors"
                          >
                            لا
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(msg.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-full transition-all"
                          title="حذف المنشور"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col gap-3 text-slate-200 mt-1">
                  {msg.text && (
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">
                      {msg.text}
                    </p>
                  )}
                  {msg.imageUrl && (
                    <div className="w-full mt-2 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/50 flex justify-center relative group">
                      {msg.imageUrl.startsWith("data:video/") ? (
                        <video
                          src={msg.imageUrl}
                          className="w-full max-h-[500px] object-contain"
                          controls
                          playsInline
                        />
                      ) : (
                        <img
                          src={msg.imageUrl}
                          alt="Post attached"
                          className="w-full max-h-[500px] object-contain"
                        />
                      )}
                      
                      {isMe && (
                        <button
                          onClick={() => {
                            if (window.confirm("متأكد من حذف الصورة؟")) {
                              handleDeleteImage(msg.id, msg.text || "");
                            }
                          }}
                          className="absolute top-2 right-2 bg-slate-900/80 text-slate-300 hover:text-red-400 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all border border-slate-700 hover:border-red-500/50 backdrop-blur-sm"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full h-px bg-slate-800/60 my-1"></div>

                {/* Actions */}
                <div className="flex items-center gap-6 text-slate-400">
                  <button
                    onClick={() => handleLike(msg.id, msg.likes)}
                    className={cn(
                      "flex items-center gap-2 transition-colors hover:text-pink-400 font-medium text-sm",
                      msg.likes?.[phone] ? "text-pink-500" : "",
                    )}
                  >
                    <Heart
                      className={cn(
                        "w-5 h-5",
                        msg.likes?.[phone] ? "fill-current" : "",
                      )}
                    />
                    <span>
                      {Object.keys(msg.likes || {}).length > 0
                        ? Object.keys(msg.likes || {}).length
                        : "إعجاب"}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setActiveCommentPostId(
                        activeCommentPostId === msg.id ? null : msg.id,
                      )
                    }
                    className={cn(
                      "flex items-center gap-2 hover:text-slate-300 transition-colors font-medium text-sm",
                      activeCommentPostId === msg.id ? "text-slate-200" : "",
                    )}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>
                      {Object.keys(msg.comments || {}).length > 0
                        ? Object.keys(msg.comments || {}).length
                        : "تعليق"}
                    </span>
                  </button>
                </div>

                {/* Comments Section */}
                {activeCommentPostId === msg.id && (
                  <div className="mt-2 bg-slate-950/50 rounded-xl border border-slate-800/50 p-4 space-y-4">
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {Object.entries(msg.comments || {}).map(
                        ([cId, comment]: [string, any]) => (
                          <div key={cId} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                              {comment.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="bg-slate-800/60 rounded-xl rounded-tr-sm px-3 py-2 text-sm max-w-[85%]">
                              <div className="font-semibold text-slate-200 text-xs mb-0.5">
                                {comment.username}
                              </div>
                              <div className="text-slate-300 break-words leading-relaxed">
                                {comment.text}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                      {Object.keys(msg.comments || {}).length === 0 && (
                        <div className="text-center text-slate-500 text-sm py-4">
                          كن أول من يعلق على هذا المنشور!
                        </div>
                      )}
                    </div>
                    <form
                      onSubmit={(e) => handleAddComment(e, msg.id)}
                      className="flex gap-2 relative mt-2 pt-2 border-t border-slate-800/50"
                    >
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="اكتب تعليقاً..."
                        className="flex-1 bg-slate-900 border border-slate-700/50 rounded-full px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0"
                      >
                        <Send className="w-4 h-4 rtl:-scale-x-100" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={postsEndRef} />
      </main>

      {/* Input Area */}
      {isMyPosts && (
        <footer className="flex-shrink-0 bg-slate-950 border-t border-slate-800 p-4 sm:p-6 pb-safe">
          <form
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto flex flex-col gap-2 sm:gap-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-2 shadow-inner focus-within:border-indigo-500/50 transition-all"
          >
            {postImage && (
              <div className="relative w-fit ml-2 mt-2">
                {postImage.startsWith("data:video/") ? (
                  <video
                    src={postImage}
                    className="h-40 rounded-lg border border-slate-700 object-cover"
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={postImage}
                    alt="Post preview"
                    className="h-40 rounded-lg border border-slate-700 object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setPostImage(null)}
                  className="absolute -top-2 -right-2 bg-slate-800 rounded-full p-1 border border-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-600 py-2 sm:py-3 px-2 sm:px-4 focus:outline-none focus:ring-0 min-w-0"
                placeholder="اضف منشور..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                autoComplete="off"
                autoFocus
              />
              <div className="flex items-center gap-2 pr-1 sm:pr-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-colors"
                  aria-label="Attach media"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePostImageUpload}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="submit"
                  disabled={!newPost.trim() && !postImage}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 sm:px-5 py-2 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center -mr-1 sm:mr-0"
                  aria-label="Publish post"
                >
                  <span className="hidden sm:inline">نشر / Post</span>
                  <Send className="w-5 h-5 sm:hidden" />
                </button>
              </div>
            </div>
          </form>
        </footer>
      )}
    </div>
  );
}

function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" dir="auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-tight">الإعدادات (Settings)</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
            <div>
              <p className="font-semibold text-white">صوت الإشعارات (Notification Sound)</p>
              <p className="text-sm text-slate-400">تفعيل أو تعطيل صوت الإشعار</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
            <div>
              <p className="font-semibold text-white">الوضع الداكن (Dark Mode)</p>
              <p className="text-sm text-slate-400">مظهر التطبيق الأساسي</p>
            </div>
             <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked disabled />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({
  isOpen,
  onClose,
  username,
  phone,
  gender,
  age,
  profilePic,
  onSave,
  onLeave,
}: any) {
  const [editName, setEditName] = useState(username);
  const [editPhone, setEditPhone] = useState(phone);
  const [editGender, setEditGender] = useState(gender || "male");
  const [editAge, setEditAge] = useState(age || "");
  const [editPic, setEditPic] = useState<string | null>(profilePic);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEditName(username);
      setEditPhone(phone);
      setEditGender(gender || "male");
      setEditAge(age || "");
      setEditPic(profilePic);
    }
  }, [isOpen, username, phone, gender, age, profilePic]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim() || !editAge.trim()) return;

    // Save to firebase
    const userRef = ref(db, `users/${editPhone.trim()}`);
    await update(userRef, {
      username: editName.trim(),
      gender: editGender,
      age: editAge.trim(),
      profilePicture: editPic,
    });

    onSave(editName.trim(), editPhone.trim(), editGender, editAge.trim(), editPic);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        dir="auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-tight">
            الملف الشخصي (Profile)
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-indigo-500 overflow-hidden flex items-center justify-center">
                {editPic ? (
                  <img
                    src={editPic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-16 h-16 text-slate-500" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-slate-400">
                انقر لتغيير الصورة (Click to change)
              </p>
              {editPic && (
                <button
                  type="button"
                  onClick={() => setEditPic(null)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  حذف الصورة
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right">
                الاسم (Username)
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={24}
                className="block w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right">
                رقم الهاتف (Phone Number)
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="block w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1.5 ltr:text-left rtl:text-right">
                تغيير الرقم سيؤدي إلى تسجيل الدخول بحساب جديد.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right">
                  العمر (Age)
                </label>
                <input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  min="1"
                  max="120"
                  className="block w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ltr:text-left rtl:text-right">
                  النوع (Gender)
                </label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none"
                >
                  <option value="male">ذكر (Male)</option>
                  <option value="female">أنثى (Female)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all active:scale-95"
            >
              حفظ التغييرات (Save Changes)
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onLeave) onLeave();
              }}
              title="تسجيل خروج (Logout)"
              className="py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-500/10 text-red-500 hover:bg-red-500/20 focus:outline-none transition-all active:scale-95 border border-red-500/20"
            >
              <LogOut className="w-5 h-5 ltr:rotate-180" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
