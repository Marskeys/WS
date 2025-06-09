const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const PORT = 3000;

// 🔌 DB 연결
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "blindly-blog"
});

db.connect((err) => {
  if (err) {
    console.error("MySQL 연결 실패:", err);
    return;
  }
  console.log("MySQL 연결 성공!");
});

// 🔧 미들웨어
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: { sameSite: "lax", secure: false }
}));
app.use(express.static("public"));

// ✅ 회원가입 페이지
app.get("/signup", (req, res) => {
  res.sendFile(__dirname + "/public/signup.html");
});

// ✅ 회원가입 처리
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send("아이디와 비밀번호는 필수입니다.");
  if (password.length < 6) return res.status(400).send("비밀번호는 최소 6자 이상이어야 합니다.");

  try {
    const hashed = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    db.query(sql, [username, hashed], (err) => {
      if (err) {
        console.error("회원가입 실패:", err);
        return res.status(500).send("회원가입 중 DB 오류!");
      }
      res.send("회원가입 완료!");
    });
  } catch (err) {
    console.error("해시 실패:", err);
    res.status(500).send("서버 오류!");
  }
});

// ✅ 로그인 처리 (관리자 여부 세션에 저장)
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username = ?";

  db.query(sql, [username], async (err, results) => {
    if (err || results.length === 0) return res.status(401).send("존재하지 않는 사용자입니다.");
    const user = results[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("비밀번호가 일치하지 않습니다.");

    req.session.user = {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin === 1
    };
    res.send("로그인 성공!");
  });
});

// ✅ 루트
app.get("/", (req, res) => {
  res.send("서버가 잘 작동 중입니다!");
});

// ✅ 관리자만 글쓰기 가능
app.get("/write", (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send("관리자만 글쓰기 가능!");
  }
  res.sendFile(__dirname + "/public/write.html");
});

// ✅ 글 저장도 관리자만
app.post("/post", (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send("관리자만 글 작성 가능!");
  }

  const { title, content, category } = req.body;
  const userId = req.session.user.id;
  const sql = "INSERT INTO posts (title, content, category, user_id) VALUES (?, ?, ?, ?)";

  db.query(sql, [title, content, category, userId], (err) => {
    if (err) {
      console.error("글 저장 실패:", err);
      return res.status(500).send("DB 저장 오류!");
    }
    res.send("글이 성공적으로 저장되었어요!");
  });
});

// ✅ 글 목록
app.get("/posts", (req, res) => {
  const sql = "SELECT * FROM posts ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("글 목록 오류:", err);
      return res.status(500).json({ error: "DB 오류" });
    }
    res.json(results);
  });
});

// ✅ 글 상세
app.get("/post/:id", (req, res) => {
  const sql = "SELECT * FROM posts WHERE id = ?";
  db.query(sql, [req.params.id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "글을 찾을 수 없습니다." });
    }
    res.json(results[0]);
  });
});

// ✅ 글 수정 (작성자 본인만)
app.post("/edit/:id", (req, res) => {
  const { title, content, category } = req.body;
  const userId = req.session.user?.id;
  if (!userId) return res.status(403).send("로그인이 필요합니다.");

  db.query("SELECT user_id FROM posts WHERE id = ?", [req.params.id], (err, results) => {
    if (err || results.length === 0) return res.status(404).send("글을 찾을 수 없습니다.");
    if (results[0].user_id !== userId) return res.status(403).send("본인 글만 수정 가능!");

    const sql = "UPDATE posts SET title = ?, content = ?, category = ? WHERE id = ?";
    db.query(sql, [title, content, category, req.params.id], (err) => {
      if (err) {
        console.error("수정 실패:", err);
        return res.status(500).send("DB 수정 오류!");
      }
      res.send("수정 완료!");
    });
  });
});

// ✅ 글 삭제 (작성자 본인만)
app.post("/delete/:id", (req, res) => {
  const userId = req.session.user?.id;
  if (!userId) return res.status(403).send("로그인이 필요합니다.");

  db.query("SELECT user_id FROM posts WHERE id = ?", [req.params.id], (err, results) => {
    if (err || results.length === 0) return res.status(404).send("글을 찾을 수 없습니다.");
    if (results[0].user_id !== userId) return res.status(403).send("본인 글만 삭제 가능!");

    db.query("DELETE FROM posts WHERE id = ?", [req.params.id], (err) => {
      if (err) {
        console.error("삭제 실패:", err);
        return res.status(500).send("DB 삭제 오류!");
      }
      res.send("삭제 완료!");
    });
  });
});

// ✅ 로그인/세션 관련 라우팅
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

app.get("/session", (req, res) => {
  if (req.session.user) {
    res.json({
      loggedIn: true,
      username: req.session.user.username,
      is_admin: req.session.user.is_admin
    });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.sendStatus(200);
  });
});

app.get("/search", (req, res) => {
    const keyword = req.query.q;
    if (!keyword) return res.send("검색어를 입력해주세요.");
  
    const sql = `
      SELECT * FROM posts
      WHERE title LIKE ? OR content LIKE ?
      ORDER BY created_at DESC
    `;
    const likeQuery = `%${keyword}%`;
  
    db.query(sql, [likeQuery, likeQuery], (err, results) => {
      if (err) {
        console.error("검색 오류:", err);
        return res.status(500).send("DB 오류 발생");
      }
  
      // ✅ JSON으로 보낼 수도 있고, 나중에 템플릿 렌더링으로 보여줘도 됨
      res.json(results); // 지금은 JSON으로 응답
    });
  });

  
// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
