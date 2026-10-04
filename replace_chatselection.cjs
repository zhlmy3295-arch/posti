const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newChatSelectionStart = `
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
      const stored = localStorage.getItem(\`saved_numbers_\${phone}\`);
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
      \`saved_numbers_\${phone}\`,
      JSON.stringify(targetInputs),
    );
  }, [targetInputs, phone]);

  useEffect(() => {
    const myReqRef = ref(db, \`users/\${phone}/my_requests\`);
    const unsubscribeMy = onValue(myReqRef, (snapshot) => {
      setMyRequests(snapshot.val() || {});
    });

    const incReqRef = ref(db, \`users/\${phone}/access_requests\`);
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
        const userRef = ref(db, \`users/\${trimmed}\`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          await update(ref(db, \`users/\${trimmed}/access_requests/\${phone}\`), {
            status: "pending",
            requesterName: username,
            timestamp: Date.now(),
          });
          await update(ref(db, \`users/\${phone}/my_requests/\${trimmed}\`), {
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
    await update(ref(db, \`users/\${phone}/access_requests/\${requesterPhone}\`), {
      status: "approved",
    });
    await update(ref(db, \`users/\${requesterPhone}/my_requests/\${phone}\`), {
      status: "approved",
    });
  };

  const handleReject = async (requesterPhone: string) => {
    await update(ref(db, \`users/\${phone}/access_requests/\${requesterPhone}\`), {
      status: "rejected",
    });
    await update(ref(db, \`users/\${requesterPhone}/my_requests/\${phone}\`), {
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

  return (`;

const startIdx = code.indexOf('function ChatSelection({');
const endIdx = code.indexOf('return (', startIdx) + 'return ('.length;

const newCode = code.substring(0, startIdx) + newChatSelectionStart + code.substring(endIdx);
fs.writeFileSync('src/App.tsx', newCode);
console.log('Done!');
