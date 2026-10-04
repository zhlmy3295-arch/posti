const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newCode = `  const isMyPosts = targetPhones.length === 1 && targetPhones[0] === phone;
  const isFeed = targetPhones.length === 1 && targetPhones[0] === "ALL_POSTS";

  const [approvedPhones, setApprovedPhones] = useState<string[]>([]);
  
  useEffect(() => {
     const myReqRef = ref(db, \`users/\${phone}/my_requests\`);
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
    const postsRef = query(ref(db, "posts"), orderByChild("timestamp"));`;

code = code.replace(`  const isMyPosts = targetPhones.length === 1 && targetPhones[0] === phone;
  const isFeed = targetPhones.length === 1 && targetPhones[0] === "ALL_POSTS";

  useEffect(() => {
    const postsRef = query(ref(db, "posts"), orderByChild("timestamp"));`, newCode);
    
const currentFeedCode = `            let currentFeedPhones: string[] = [];
            if (isFeed) {
              try {
                const stored = localStorage.getItem(\`saved_numbers_\${phone}\`);
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
                )`;
                
const oldCurrentFeedCode = `            let currentFeedPhones: string[] = [];
            if (isFeed) {
              try {
                const stored = localStorage.getItem(\`saved_numbers_\${phone}\`);
                if (stored) currentFeedPhones = JSON.parse(stored);
              } catch {}
            }

            const filteredPosts = isFeed
              ? loadedPosts.filter((post) =>
                  post.phone === phone || 
                  post.targetPhone === phone ||
                  currentFeedPhones.includes(
                    post.phone || post.targetPhone || "",
                  ),
                )`;
                
code = code.replace(oldCurrentFeedCode, currentFeedCode);

fs.writeFileSync('src/App.tsx', code);
