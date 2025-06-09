document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const username = e.target.username.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;
  
    if (password !== confirmPassword) {
      document.getElementById("result").textContent = "❗ 비밀번호가 일치하지 않습니다.";
      return;
    }
  
    const res = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
  
    const text = await res.text();
    document.getElementById("result").textContent = text;
  });
  