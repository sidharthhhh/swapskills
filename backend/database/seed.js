const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'hjkl',
  database: 'swapskills',
  multipleStatements: true,
};

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Disable foreign key checks for clean truncation
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Truncate all tables in reverse dependency order
    const tables = [
      'audit_log', 'admin_users',
      'notifications', 'reputation_events',
      'blocks', 'reports',
      'post_votes', 'comments', 'posts', 'communities',
      'messages', 'chat_rooms',
      'session_notes', 'sessions',
      'matches', 'match_requests',
      'skill_endorsements',
      'user_learn_skills', 'user_teach_skills',
      'refresh_tokens', 'recovery_keys',
      'device_tokens',
      'users',
    ];

    for (const table of tables) {
      try {
        await connection.execute(`TRUNCATE TABLE ${table}`);
      } catch (e) {
        // Table might not exist yet, skip
      }
    }

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🗑️  Cleared existing data\n');

    // ============================================================
    // USERS (10 users)
    // ============================================================
    const userPassword = await bcrypt.hash('Password123!', SALT_ROUNDS);

    const users = [
      { uid: 'SKL-482917', username: 'SilentCoder_428', bio: 'Full-stack dev who loves clean architecture and midnight coding sessions.', experience_level: 'advanced', availability: 'flexible', trust_score: 92.50, status: 'active' },
      { uid: 'SKL-119384', username: 'DockerGuru_119', bio: 'DevOps engineer obsessed with containers and CI/CD pipelines.', experience_level: 'expert', availability: 'weekdays', trust_score: 97.00, status: 'active' },
      { uid: 'SKL-892156', username: 'ReactWizard_892', bio: 'Frontend specialist. React, Next.js, and everything in between.', experience_level: 'advanced', availability: 'weekends', trust_score: 88.75, status: 'active' },
      { uid: 'SKL-334567', username: 'PythonNinja_334', bio: 'Data scientist turned ML engineer. Python is life.', experience_level: 'expert', availability: 'flexible', trust_score: 95.00, status: 'active' },
      { uid: 'SKL-667821', username: 'RustExplorer_667', bio: 'Systems programmer learning the ropes of Rust and low-level magic.', experience_level: 'intermediate', availability: 'weekdays', trust_score: 78.25, status: 'active' },
      { uid: 'SKL-551093', username: 'CloudSurfer_551', bio: 'AWS certified architect. Building scalable cloud solutions.', experience_level: 'advanced', availability: 'weekends', trust_score: 85.50, status: 'active' },
      { uid: 'SKL-223847', username: 'DesignDrifter_223', bio: 'UI/UX designer who codes. Bridging the gap between design and dev.', experience_level: 'intermediate', availability: 'flexible', trust_score: 70.00, status: 'active' },
      { uid: 'SKL-998412', username: 'GitGhost_998', bio: 'Backend dev. Sometimes disappears mid-conversation.', experience_level: 'beginner', availability: 'weekdays', trust_score: 35.00, status: 'suspended' },
      { uid: 'SKL-774256', username: 'AlgoAce_774', bio: 'Competitive programmer turned software engineer. DSA enthusiast.', experience_level: 'advanced', availability: 'weekends', trust_score: 91.00, status: 'active' },
      { uid: 'SKL-445632', username: 'FlutterFox_445', bio: 'Mobile dev specializing in Flutter. Building cross-platform apps.', experience_level: 'intermediate', availability: 'flexible', trust_score: 45.50, status: 'cooldown' },
    ];

    const userIds = [];
    for (const u of users) {
      const [result] = await connection.execute(
        `INSERT INTO users (uid, username, password_hash, bio, experience_level, availability, trust_score, status, cooldown_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.uid, u.username, userPassword, u.bio, u.experience_level, u.availability, u.trust_score, u.status,
         u.status === 'cooldown' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null]
      );
      userIds.push(result.insertId);
    }
    console.log(`👤 Inserted ${userIds.length} users`);

    // ============================================================
    // USER SKILLS (teach and learn)
    // Skills IDs from migration: 1=JavaScript, 2=TypeScript, 3=Python,
    // 4=Java, 13=React, 16=Node.js, 19=Flutter, 21=Docker, 22=Kubernetes,
    // 23=CI/CD, 24=Terraform, 29=AWS, 30=Azure, 34=Machine Learning,
    // 35=Deep Learning, 38=TensorFlow, 39=PyTorch, 41=UI/UX Design,
    // 42=Figma, 7=Rust, 12=C++, 6=Go
    // ============================================================

    // User 1 (SilentCoder): teaches JS/TS/Node, learns Python/ML
    // User 2 (DockerGuru): teaches Docker/K8s/CI-CD, learns React/Flutter
    // User 3 (ReactWizard): teaches React/TS/Figma, learns Docker/AWS
    // User 4 (PythonNinja): teaches Python/ML/TensorFlow, learns Go/Rust
    // User 5 (RustExplorer): teaches Rust/C++, learns Python/Docker
    // User 6 (CloudSurfer): teaches AWS/Terraform/Azure, learns ML/Deep Learning
    // User 7 (DesignDrifter): teaches UI-UX/Figma, learns React/TypeScript
    // User 8 (GitGhost): teaches Java, learns everything
    // User 9 (AlgoAce): teaches C++/Java/Go, learns AWS/Kubernetes
    // User 10 (FlutterFox): teaches Flutter/Dart, learns Node.js/Docker

    const teachSkills = [
      // [userId index, skillId]
      [0, 1], [0, 2], [0, 16],           // SilentCoder teaches JS, TS, Node.js
      [1, 21], [1, 22], [1, 23], [1, 27], // DockerGuru teaches Docker, K8s, CI/CD, GitHub Actions
      [2, 13], [2, 2], [2, 42],           // ReactWizard teaches React, TS, Figma
      [3, 3], [3, 34], [3, 38], [3, 40],  // PythonNinja teaches Python, ML, TensorFlow, Data Science
      [4, 7], [4, 12],                    // RustExplorer teaches Rust, C++
      [5, 29], [5, 24], [5, 30],          // CloudSurfer teaches AWS, Terraform, Azure
      [6, 41], [6, 42], [6, 45],          // DesignDrifter teaches UI/UX, Figma, Web Design
      [7, 4],                             // GitGhost teaches Java
      [8, 12], [8, 4], [8, 6],           // AlgoAce teaches C++, Java, Go
      [9, 19], [9, 11],                   // FlutterFox teaches Flutter, Kotlin
    ];

    const learnSkills = [
      [0, 3], [0, 34],                    // SilentCoder learns Python, ML
      [1, 13], [1, 19],                   // DockerGuru learns React, Flutter
      [2, 21], [2, 29],                   // ReactWizard learns Docker, AWS
      [3, 6], [3, 7],                     // PythonNinja learns Go, Rust
      [4, 3], [4, 21], [4, 34],           // RustExplorer learns Python, Docker, ML
      [5, 34], [5, 35],                   // CloudSurfer learns ML, Deep Learning
      [6, 13], [6, 2],                    // DesignDrifter learns React, TypeScript
      [7, 1], [7, 21], [7, 13], [7, 3],  // GitGhost learns JS, Docker, React, Python
      [8, 29], [8, 22],                   // AlgoAce learns AWS, Kubernetes
      [9, 16], [9, 21],                   // FlutterFox learns Node.js, Docker
    ];

    for (const [uIdx, skillId] of teachSkills) {
      await connection.execute(
        'INSERT INTO user_teach_skills (user_id, skill_id) VALUES (?, ?)',
        [userIds[uIdx], skillId]
      );
    }
    for (const [uIdx, skillId] of learnSkills) {
      await connection.execute(
        'INSERT INTO user_learn_skills (user_id, skill_id) VALUES (?, ?)',
        [userIds[uIdx], skillId]
      );
    }
    console.log(`🎯 Inserted ${teachSkills.length} teach skills and ${learnSkills.length} learn skills`);

    // ============================================================
    // MATCH REQUESTS (5 requests)
    // ============================================================
    const matchRequests = [
      // SilentCoder -> PythonNinja: wants to learn Python, offers JS
      { sender: 0, receiver: 3, teach_skill: 1, learn_skill: 3, status: 'accepted' },
      // ReactWizard -> DockerGuru: wants to learn Docker, offers React
      { sender: 2, receiver: 1, teach_skill: 13, learn_skill: 21, status: 'accepted' },
      // RustExplorer -> PythonNinja: wants to learn Python, offers Rust
      { sender: 4, receiver: 3, teach_skill: 7, learn_skill: 3, status: 'pending' },
      // DesignDrifter -> ReactWizard: wants to learn React, offers UI/UX
      { sender: 6, receiver: 2, teach_skill: 41, learn_skill: 13, status: 'accepted' },
      // GitGhost -> SilentCoder: wants to learn JS, offers Java
      { sender: 7, receiver: 0, teach_skill: 4, learn_skill: 1, status: 'rejected' },
    ];

    const matchRequestIds = [];
    for (const mr of matchRequests) {
      const [result] = await connection.execute(
        `INSERT INTO match_requests (sender_id, receiver_id, teach_skill_id, learn_skill_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userIds[mr.sender], userIds[mr.receiver], mr.teach_skill, mr.learn_skill, mr.status,
         new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)]
      );
      matchRequestIds.push(result.insertId);
    }
    console.log(`🤝 Inserted ${matchRequestIds.length} match requests`);

    // ============================================================
    // MATCHES (3 active matches from accepted requests)
    // ============================================================
    const matches = [
      // SilentCoder <-> PythonNinja: SilentCoder teaches JS, PythonNinja teaches Python
      { user_a: 0, user_b: 3, skill_a_teaches_b: 1, skill_b_teaches_a: 3, status: 'active', sessions_a: 2, sessions_b: 1 },
      // ReactWizard <-> DockerGuru: ReactWizard teaches React, DockerGuru teaches Docker
      { user_a: 2, user_b: 1, skill_a_teaches_b: 13, skill_b_teaches_a: 21, status: 'active', sessions_a: 1, sessions_b: 1 },
      // DesignDrifter <-> ReactWizard: DesignDrifter teaches UI/UX, ReactWizard teaches React
      { user_a: 6, user_b: 2, skill_a_teaches_b: 41, skill_b_teaches_a: 13, status: 'active', sessions_a: 0, sessions_b: 1 },
    ];

    const matchIds = [];
    for (const m of matches) {
      const [result] = await connection.execute(
        `INSERT INTO matches (user_a_id, user_b_id, skill_a_teaches_b, skill_b_teaches_a, status, sessions_a, sessions_b, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userIds[m.user_a], userIds[m.user_b], m.skill_a_teaches_b, m.skill_b_teaches_a, m.status, m.sessions_a, m.sessions_b,
         new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)]
      );
      matchIds.push(result.insertId);
    }
    console.log(`💡 Inserted ${matchIds.length} matches`);

    // ============================================================
    // CHAT ROOMS & MESSAGES
    // ============================================================
    const chatRoomIds = [];
    for (const matchId of matchIds) {
      const [result] = await connection.execute(
        'INSERT INTO chat_rooms (match_id) VALUES (?)',
        [matchId]
      );
      chatRoomIds.push(result.insertId);
    }

    // Messages for Room 1: SilentCoder <-> PythonNinja
    const room1Messages = [
      { sender: 0, content: 'Hey! Ready to start our JS/Python exchange?', type: 'text' },
      { sender: 3, content: 'Absolutely! I have been wanting to learn modern JS patterns. Where should we start?', type: 'text' },
      { sender: 0, content: 'Let me show you async/await first. Here is a basic example:', type: 'text' },
      { sender: 0, content: 'async function fetchData(url) {\n  const response = await fetch(url);\n  const data = await response.json();\n  return data;\n}', type: 'code', language: 'javascript' },
      { sender: 3, content: 'Nice! That is similar to Python asyncio. Here is the equivalent:', type: 'text' },
      { sender: 3, content: 'import aiohttp\nimport asyncio\n\nasync def fetch_data(url):\n    async with aiohttp.ClientSession() as session:\n        async with session.get(url) as response:\n            return await response.json()', type: 'code', language: 'python' },
      { sender: 0, content: 'Oh interesting! The context manager pattern is clean.', type: 'text' },
      { sender: 3, content: 'Yeah Python loves context managers. Want to schedule our first proper session?', type: 'text' },
    ];

    // Messages for Room 2: ReactWizard <-> DockerGuru
    const room2Messages = [
      { sender: 2, content: 'Hi! I have been struggling with Docker networking. Can you help?', type: 'text' },
      { sender: 1, content: 'Of course! Docker networking is tricky at first. What are you trying to do?', type: 'text' },
      { sender: 2, content: 'I want my React dev server to talk to a backend container.', type: 'text' },
      { sender: 1, content: 'Easy! Use a custom bridge network. Here is a docker-compose snippet:', type: 'text' },
      { sender: 1, content: 'services:\n  frontend:\n    build: ./frontend\n    ports:\n      - "3000:3000"\n    networks:\n      - app-net\n  backend:\n    build: ./backend\n    networks:\n      - app-net\nnetworks:\n  app-net:\n    driver: bridge', type: 'code', language: 'yaml' },
      { sender: 2, content: 'That makes sense! And in return, let me show you React hooks basics.', type: 'text' },
      { sender: 2, content: 'const [count, setCount] = useState(0);\n\nuseEffect(() => {\n  document.title = `Count: ${count}`;\n}, [count]);', type: 'code', language: 'javascript' },
    ];

    // Messages for Room 3: DesignDrifter <-> ReactWizard
    const room3Messages = [
      { sender: 6, content: 'Hey! I made some Figma mockups for a component library. Want to see?', type: 'text' },
      { sender: 2, content: 'Yes please! I love turning designs into React components.', type: 'text' },
      { sender: 6, content: 'Here is my approach to design tokens - spacing, colors, typography all in one system.', type: 'text' },
      { sender: 2, content: 'That maps perfectly to a theme object in styled-components or Tailwind config!', type: 'text' },
      { sender: 6, content: 'Exactly what I was thinking. Can you show me how to set up a React project with Tailwind?', type: 'text' },
      { sender: 2, content: 'npx create-next-app@latest my-app\ncd my-app\nnpm install -D tailwindcss postcss autoprefixer\nnpx tailwindcss init -p', type: 'code', language: 'bash' },
    ];

    const allRoomMessages = [
      { roomIdx: 0, messages: room1Messages },
      { roomIdx: 1, messages: room2Messages },
      { roomIdx: 2, messages: room3Messages },
    ];

    let totalMessages = 0;
    for (const { roomIdx, messages } of allRoomMessages) {
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const createdAt = new Date(Date.now() - (messages.length - i) * 3600000);
        await connection.execute(
          `INSERT INTO messages (room_id, sender_id, content, content_type, language, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [chatRoomIds[roomIdx], userIds[msg.sender], msg.content, msg.type, msg.language || null, createdAt]
        );
        totalMessages++;
      }
    }
    console.log(`💬 Inserted ${chatRoomIds.length} chat rooms and ${totalMessages} messages`);

    // ============================================================
    // SESSIONS (4 sessions)
    // ============================================================
    const sessions = [
      { match: 0, teacher: 0, learner: 3, skill: 1, scheduled_at: new Date(Date.now() - 3 * 24 * 3600000), duration: 60, status: 'completed' },
      { match: 0, teacher: 3, learner: 0, skill: 3, scheduled_at: new Date(Date.now() - 1 * 24 * 3600000), duration: 45, status: 'completed' },
      { match: 1, teacher: 1, learner: 2, skill: 21, scheduled_at: new Date(Date.now() + 2 * 24 * 3600000), duration: 60, status: 'scheduled' },
      { match: 1, teacher: 2, learner: 1, skill: 13, scheduled_at: new Date(Date.now() - 5 * 24 * 3600000), duration: 30, status: 'no_show' },
    ];

    const sessionIds = [];
    for (const s of sessions) {
      const [result] = await connection.execute(
        `INSERT INTO sessions (match_id, teacher_id, learner_id, skill_id, scheduled_at, duration_min, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [matchIds[s.match], userIds[s.teacher], userIds[s.learner], s.skill, s.scheduled_at, s.duration, s.status]
      );
      sessionIds.push(result.insertId);
    }

    // Session notes for completed sessions
    await connection.execute(
      'INSERT INTO session_notes (session_id, user_id, content) VALUES (?, ?, ?)',
      [sessionIds[0], userIds[0], 'Covered async/await, Promises, and event loop basics. PythonNinja picked it up quickly!']
    );
    await connection.execute(
      'INSERT INTO session_notes (session_id, user_id, content) VALUES (?, ?, ?)',
      [sessionIds[0], userIds[3], 'Great session! JavaScript async patterns are similar to Python asyncio. Need to practice more with callbacks.']
    );
    await connection.execute(
      'INSERT INTO session_notes (session_id, user_id, content) VALUES (?, ?, ?)',
      [sessionIds[1], userIds[3], 'Taught list comprehensions, decorators, and generators. SilentCoder already had good intuition from JS.']
    );
    await connection.execute(
      'INSERT INTO session_notes (session_id, user_id, content) VALUES (?, ?, ?)',
      [sessionIds[1], userIds[0], 'Python decorators are like higher-order functions in JS. Generators are similar to JS generators. Loving it!']
    );
    console.log(`📅 Inserted ${sessionIds.length} sessions with notes`);

    // ============================================================
    // COMMUNITIES (3 communities)
    // ============================================================
    const communities = [
      { skill_id: 1, name: 'JavaScript & Web Dev', description: 'Discuss JavaScript, TypeScript, React, Node.js and all things web development.' },
      { skill_id: 21, name: 'DevOps & Infrastructure', description: 'Docker, Kubernetes, CI/CD, cloud platforms, and infrastructure as code.' },
      { skill_id: 34, name: 'AI & Machine Learning', description: 'Machine learning, deep learning, NLP, computer vision, and data science discussions.' },
    ];

    const communityIds = [];
    for (const c of communities) {
      const [result] = await connection.execute(
        'INSERT INTO communities (skill_id, name, description) VALUES (?, ?, ?)',
        [c.skill_id, c.name, c.description]
      );
      communityIds.push(result.insertId);
    }
    console.log(`🏘️  Inserted ${communityIds.length} communities`);

    // ============================================================
    // POSTS (3-5 per community)
    // ============================================================
    const postsData = [
      // JS Community posts
      { community: 0, author: 0, content: 'What is everyone using for state management in 2025? Redux feels heavy for smaller apps.', upvotes: 12 },
      { community: 0, author: 2, content: 'Just discovered Zustand and it is a game changer. Minimal boilerplate, great TypeScript support.', upvotes: 8 },
      { community: 0, author: 6, content: 'Any tips for learning React coming from a design background? I know HTML/CSS well but JS is new to me.', upvotes: 5 },
      { community: 0, author: 8, content: 'Hot take: Server components will make most client-side state management obsolete.', upvotes: 15 },
      // DevOps Community posts
      { community: 1, author: 1, content: 'PSA: Always use multi-stage Docker builds for production images. Reduced our image size by 80%.', upvotes: 22 },
      { community: 1, author: 5, content: 'Terraform vs Pulumi in 2025 - which are you using and why?', upvotes: 9 },
      { community: 1, author: 9, content: 'Struggling with Docker networking in my Flutter backend setup. Any guides?', upvotes: 3 },
      // AI/ML Community posts
      { community: 2, author: 3, content: 'Published my first ML model on HuggingFace! Fine-tuned BERT for code review comments classification.', upvotes: 18 },
      { community: 2, author: 5, content: 'What is the best way to deploy ML models at scale? Looking at SageMaker vs self-hosted.', upvotes: 7 },
      { community: 2, author: 4, content: 'Anyone combining Rust with ML? Looking at the candle framework for inference.', upvotes: 11 },
      { community: 2, author: 8, content: 'Competitive programming skills transfer well to optimizing ML pipelines. Here is what I learned.', upvotes: 6 },
    ];

    const postIds = [];
    for (const p of postsData) {
      const [result] = await connection.execute(
        `INSERT INTO posts (community_id, author_id, content, upvotes, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [communityIds[p.community], userIds[p.author], p.content, p.upvotes,
         new Date(Date.now() - Math.random() * 14 * 24 * 3600000)]
      );
      postIds.push(result.insertId);
    }
    console.log(`📝 Inserted ${postIds.length} posts`);

    // ============================================================
    // COMMENTS (2-3 per post, some nested)
    // ============================================================
    const commentsData = [
      // Comments on post 0 (state management)
      { post: 0, author: 2, content: 'Zustand + React Query is my go-to combo now. Handles both client and server state.', upvotes: 4 },
      { post: 0, author: 3, content: 'Coming from Python, I find Jotai more intuitive. Atomic state feels natural.', upvotes: 2 },
      { post: 0, author: 8, content: 'For complex apps, Redux Toolkit is still king. The DevTools alone are worth it.', upvotes: 3 },
      // Comments on post 1 (Zustand)
      { post: 1, author: 0, content: 'Agreed! Migrated our app from Redux to Zustand in a weekend.', upvotes: 2 },
      { post: 1, author: 6, content: 'Is Zustand beginner-friendly? I am just starting with React.', upvotes: 1 },
      // Comments on post 3 (server components hot take)
      { post: 3, author: 0, content: 'Partially agree. You still need client state for optimistic updates and complex forms.', upvotes: 5 },
      { post: 3, author: 2, content: 'Server components + useActionState covers most cases now.', upvotes: 3 },
      // Comments on post 4 (Docker multi-stage)
      { post: 4, author: 2, content: 'Can you share an example Dockerfile? I am new to multi-stage builds.', upvotes: 6 },
      { post: 4, author: 5, content: 'We do the same with our Go services. Final image is just the binary + scratch.', upvotes: 4 },
      { post: 4, author: 9, content: 'This is exactly what I needed! Thanks for the tip.', upvotes: 1 },
      // Comments on post 7 (HuggingFace model)
      { post: 7, author: 5, content: 'Congrats! What dataset did you use for fine-tuning?', upvotes: 3 },
      { post: 7, author: 4, content: 'Would love to try this for Rust code reviews. Is the model public?', upvotes: 2 },
      // Comments on post 9 (Rust + ML)
      { post: 9, author: 3, content: 'Candle is promising but still early. For production I would stick with Python + ONNX Runtime.', upvotes: 4 },
      { post: 9, author: 1, content: 'The performance gains of Rust inference are real though. We benchmarked 3x faster than Python.', upvotes: 7 },
    ];

    const commentIds = [];
    for (const c of commentsData) {
      const [result] = await connection.execute(
        `INSERT INTO comments (post_id, author_id, content, parent_id, upvotes, created_at)
         VALUES (?, ?, ?, NULL, ?, ?)`,
        [postIds[c.post], userIds[c.author], c.content, c.upvotes,
         new Date(Date.now() - Math.random() * 7 * 24 * 3600000)]
      );
      commentIds.push(result.insertId);
    }

    // Add some nested replies (parent_id references)
    const nestedComments = [
      { post: 0, author: 0, content: 'React Query is great for server state but I still need something for UI state.', parent: 0, upvotes: 1 },
      { post: 4, author: 1, content: 'Sure! I will post a full example in a separate thread.', parent: 7, upvotes: 3 },
      { post: 7, author: 3, content: 'Yes it is public! Check my profile for the link.', parent: 10, upvotes: 2 },
    ];

    for (const nc of nestedComments) {
      await connection.execute(
        `INSERT INTO comments (post_id, author_id, content, parent_id, upvotes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [postIds[nc.post], userIds[nc.author], nc.content, commentIds[nc.parent], nc.upvotes,
         new Date(Date.now() - Math.random() * 3 * 24 * 3600000)]
      );
    }
    console.log(`💬 Inserted ${commentsData.length + nestedComments.length} comments`);

    // ============================================================
    // POST VOTES
    // ============================================================
    const postVotes = [
      [0, 0], [2, 0], [3, 0], [8, 0],  // votes on post 0
      [0, 1], [6, 1],                    // votes on post 1
      [0, 3], [2, 3], [3, 3],           // votes on post 3
      [2, 4], [5, 4], [9, 4], [0, 4],   // votes on post 4
      [5, 7], [4, 7], [0, 7],           // votes on post 7
      [3, 9], [1, 9],                    // votes on post 9
    ];

    for (const [userIdx, postIdx] of postVotes) {
      await connection.execute(
        'INSERT INTO post_votes (user_id, post_id) VALUES (?, ?)',
        [userIds[userIdx], postIds[postIdx]]
      );
    }
    console.log(`👍 Inserted ${postVotes.length} post votes`);

    // ============================================================
    // REPORTS (3 reports)
    // ============================================================
    const reports = [
      { reporter: 0, target_type: 'user', target_id: userIds[7], reason: 'ghosting', detail: 'This user accepted a match request but never showed up to any sessions and stopped responding.', status: 'resolved', resolution: 'User placed on cooldown for 7 days.' },
      { reporter: 2, target_type: 'message', target_id: 1, reason: 'spam', detail: 'Sending repeated promotional links in chat.', status: 'in_review', resolution: null },
      { reporter: 5, target_type: 'post', target_id: postIds[6], reason: 'inappropriate', detail: 'Post contains misleading information about cloud security practices.', status: 'open', resolution: null },
    ];

    for (const r of reports) {
      await connection.execute(
        `INSERT INTO reports (reporter_id, target_type, target_id, reason, detail, status, resolution, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userIds[r.reporter], r.target_type, r.target_id, r.reason, r.detail, r.status, r.resolution,
         new Date(Date.now() - Math.random() * 10 * 24 * 3600000)]
      );
    }
    console.log(`🚨 Inserted ${reports.length} reports`);

    // ============================================================
    // BLOCKS (2 block relationships)
    // ============================================================
    const blocks = [
      { blocker: 0, blocked: 7 },  // SilentCoder blocked GitGhost
      { blocker: 2, blocked: 7 },  // ReactWizard blocked GitGhost
    ];

    for (const b of blocks) {
      await connection.execute(
        'INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
        [userIds[b.blocker], userIds[b.blocked]]
      );
    }
    console.log(`🚫 Inserted ${blocks.length} blocks`);

    // ============================================================
    // REPUTATION EVENTS
    // ============================================================
    const reputationEvents = [
      { user: 0, event_type: 'exchange_complete', delta: 5.00, note: 'Completed JS/Python exchange with PythonNinja_334' },
      { user: 0, event_type: 'session_complete', delta: 2.50, note: 'Taught async/await session' },
      { user: 0, event_type: 'positive_feedback', delta: 1.50, note: 'Received positive feedback from PythonNinja_334' },
      { user: 3, event_type: 'exchange_complete', delta: 5.00, note: 'Completed JS/Python exchange with SilentCoder_428' },
      { user: 3, event_type: 'session_complete', delta: 2.50, note: 'Taught Python decorators session' },
      { user: 3, event_type: 'endorsement_received', delta: 3.00, note: 'Endorsed for Python expertise' },
      { user: 1, event_type: 'session_complete', delta: 2.50, note: 'Taught Docker networking session' },
      { user: 1, event_type: 'positive_feedback', delta: 1.50, note: 'Received positive feedback from ReactWizard_892' },
      { user: 2, event_type: 'session_complete', delta: 2.50, note: 'Taught React hooks session' },
      { user: 7, event_type: 'ghosting_penalty', delta: -15.00, note: 'Failed to attend scheduled session with SilentCoder_428' },
      { user: 7, event_type: 'ghosting_penalty', delta: -15.00, note: 'No response for 7+ days in active match' },
      { user: 7, event_type: 'no_show_penalty', delta: -10.00, note: 'No-show for scheduled session' },
      { user: 9, event_type: 'ghosting_penalty', delta: -15.00, note: 'Stopped responding in active match' },
      { user: 9, event_type: 'no_show_penalty', delta: -10.00, note: 'Missed scheduled session without notice' },
      { user: 5, event_type: 'session_complete', delta: 2.50, note: 'Taught AWS basics session' },
      { user: 8, event_type: 'exchange_complete', delta: 5.00, note: 'Completed C++/AWS exchange' },
    ];

    for (const re of reputationEvents) {
      await connection.execute(
        `INSERT INTO reputation_events (user_id, event_type, delta, note, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userIds[re.user], re.event_type, re.delta, re.note,
         new Date(Date.now() - Math.random() * 14 * 24 * 3600000)]
      );
    }
    console.log(`⭐ Inserted ${reputationEvents.length} reputation events`);

    // ============================================================
    // NOTIFICATIONS (10 notifications)
    // ============================================================
    const notifications = [
      { user: 3, type: 'match_request', payload: { from_user: 'SilentCoder_428', skill: 'JavaScript' }, read: true },
      { user: 0, type: 'match_accepted', payload: { from_user: 'PythonNinja_334', match_id: matchIds[0] }, read: true },
      { user: 1, type: 'match_request', payload: { from_user: 'ReactWizard_892', skill: 'React' }, read: true },
      { user: 2, type: 'match_accepted', payload: { from_user: 'DockerGuru_119', match_id: matchIds[1] }, read: true },
      { user: 0, type: 'new_message', payload: { from_user: 'PythonNinja_334', room_id: chatRoomIds[0] }, read: false },
      { user: 2, type: 'session_reminder', payload: { session_id: sessionIds[2], scheduled_at: sessions[2].scheduled_at.toISOString() }, read: false },
      { user: 3, type: 'reputation_update', payload: { delta: 5.00, reason: 'exchange_complete' }, read: false },
      { user: 6, type: 'match_accepted', payload: { from_user: 'ReactWizard_892', match_id: matchIds[2] }, read: true },
      { user: 0, type: 'community_reply', payload: { post_id: postIds[0], commenter: 'ReactWizard_892' }, read: false },
      { user: 1, type: 'endorsement_received', payload: { from_user: 'ReactWizard_892', skill: 'Docker' }, read: false },
    ];

    for (const n of notifications) {
      await connection.execute(
        `INSERT INTO notifications (user_id, type, payload, read_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [userIds[n.user], n.type, JSON.stringify(n.payload),
         n.read ? new Date(Date.now() - Math.random() * 24 * 3600000) : null,
         new Date(Date.now() - Math.random() * 5 * 24 * 3600000)]
      );
    }
    console.log(`🔔 Inserted ${notifications.length} notifications`);

    // ============================================================
    // ADMIN USERS (re-insert admin + 2 more)
    // ============================================================
    const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
    const modPassword = await bcrypt.hash('ModPass123!', SALT_ROUNDS);
    const analystPassword = await bcrypt.hash('AnalystPass123!', SALT_ROUNDS);

    await connection.execute(
      `INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      ['admin', 'admin@swapskills.com', adminPassword, 'super_admin']
    );
    const [modResult] = await connection.execute(
      `INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      ['mod_sarah', 'sarah@swapskills.com', modPassword, 'moderator']
    );
    const [analystResult] = await connection.execute(
      `INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      ['analyst_mike', 'mike@swapskills.com', analystPassword, 'analyst']
    );
    console.log(`🔑 Inserted 3 admin users (admin, mod_sarah, analyst_mike)`);

    // ============================================================
    // AUDIT LOG (5 entries)
    // ============================================================
    const auditEntries = [
      { admin_id: 1, action: 'user_suspended', target_type: 'user', target_id: userIds[7], metadata: { reason: 'Repeated ghosting behavior', duration: '7 days' } },
      { admin_id: 1, action: 'report_resolved', target_type: 'report', target_id: 1, metadata: { resolution: 'User placed on cooldown', report_reason: 'ghosting' } },
      { admin_id: 2, action: 'post_removed', target_type: 'post', target_id: postIds[6], metadata: { reason: 'Misleading content', community: 'DevOps & Infrastructure' } },
      { admin_id: 1, action: 'user_cooldown_set', target_type: 'user', target_id: userIds[9], metadata: { reason: 'Multiple no-shows', cooldown_hours: 24 } },
      { admin_id: 3, action: 'analytics_export', target_type: 'system', target_id: 0, metadata: { export_type: 'monthly_report', month: '2025-01' } },
    ];

    for (const entry of auditEntries) {
      await connection.execute(
        `INSERT INTO audit_log (admin_id, action, target_type, target_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [entry.admin_id, entry.action, entry.target_type, entry.target_id, JSON.stringify(entry.metadata),
         new Date(Date.now() - Math.random() * 14 * 24 * 3600000)]
      );
    }
    console.log(`📋 Inserted ${auditEntries.length} audit log entries`);

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(50));
    console.log('🌱 SEED COMPLETE - Summary:');
    console.log('='.repeat(50));
    console.log(`  Users:              ${userIds.length}`);
    console.log(`  Teach Skills:       ${teachSkills.length}`);
    console.log(`  Learn Skills:       ${learnSkills.length}`);
    console.log(`  Match Requests:     ${matchRequestIds.length}`);
    console.log(`  Matches:            ${matchIds.length}`);
    console.log(`  Chat Rooms:         ${chatRoomIds.length}`);
    console.log(`  Messages:           ${totalMessages}`);
    console.log(`  Sessions:           ${sessionIds.length}`);
    console.log(`  Communities:        ${communityIds.length}`);
    console.log(`  Posts:              ${postIds.length}`);
    console.log(`  Comments:           ${commentsData.length + nestedComments.length}`);
    console.log(`  Post Votes:         ${postVotes.length}`);
    console.log(`  Reports:            ${reports.length}`);
    console.log(`  Blocks:             ${blocks.length}`);
    console.log(`  Reputation Events:  ${reputationEvents.length}`);
    console.log(`  Notifications:      ${notifications.length}`);
    console.log(`  Admin Users:        3`);
    console.log(`  Audit Log Entries:  ${auditEntries.length}`);
    console.log('='.repeat(50));
    console.log('\n✅ Database seeded successfully!\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    if (error.sql) {
      console.error('   SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed();
