import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ArrowLeft, Send, LogOut, MessageSquare, UserCircle, Users, Settings } from "lucide-react";
import { db, ref, push, onValue, serverTimestamp, query, orderByChild } from "../lib/firebase";
import { cn } from "../lib/utils";

interface ChatMessage {
  id: string;
  username: string;
  phone: string;
  text: string;
  timestamp: any;
}

interface GlobalChatProps {
  username: string;
  phone: string;
  profilePic: string | null;
  onBack: () => void;
  onLeave: () => void;
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
}

export function GlobalChat({
  username,
  phone,
  profilePic,
  onBack,
  onLeave,
  onOpenProfile,
  onOpenSettings,
}: GlobalChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const messagesRef = query(ref(db, "global_chat"), orderByChild("timestamp"));

    const unsubscribe = onValue(
      messagesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const loadedMessages: ChatMessage[] = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          // Sort earliest to latest for chat view
          loadedMessages.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(loadedMessages);
        } else {
          setMessages([]);
        }
        setError(null);
      },
      (err: any) => {
        console.error("Firebase Read Error:", err);
        setError("لا تملك صلاحية للوصول (Permission Denied).");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const messagesRef = ref(db, "global_chat");
      await push(messagesRef, {
        username,
        phone,
        text: messageText,
        timestamp: serverTimestamp(),
      });
      setError(null);
    } catch (err: any) {
      console.error("Firebase Write Error:", err);
      setNewMessage(messageText);
      setError("فشل في الإرسال (Permission Denied).");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 flex-shrink-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center px-4 sm:px-6 justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 rtl:hidden" />
            <ArrowLeft className="w-5 h-5 hidden rtl:block rotate-180" />
          </button>
          <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide leading-tight px-1" dir="auto">
              شات روم
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium italic" dir="auto">
              غرفة الدردشة العامة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
          >
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
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
             className="flex items-center gap-2 p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium hidden sm:inline">تسجيل خروج</span>
            <LogOut className="w-5 h-5 ltr:rotate-180" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex justify-center text-center">
            {error}
          </div>
        )}

        {messages.length === 0 && !error ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p dir="auto">لا توجد رسائل. كن أول من يكتب!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.phone === phone && msg.username === username;
            const timeString = msg.timestamp ? format(new Date(msg.timestamp), "h:mm a") : "Sending...";
            
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%] sm:max-w-[70%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
                dir="auto"
              >
                {!isMe && (
                  <span className="text-xs text-slate-400 mb-1 px-1">
                    {msg.username}
                  </span>
                )}
                <div
                  className={cn(
                    "px-4 py-2.5 rounded-2xl",
                    isMe
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">
                    {msg.text}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {timeString}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="max-w-4xl mx-auto flex items-end gap-2"
          dir="auto"
        >
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all shadow-inner relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder-slate-500 py-2 resize-none outline-none"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 ltr:ml-1 rtl:mr-1 rtl:rotate-180" />
          </button>
        </form>
      </footer>
    </div>
  );
}
