const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// 기존 글 불러오기
fetch(`/post/${id}`)
  .then(res => {
    if (!res.ok) {
      throw new Error("글을 불러올 수 없습니다");
    }
    return res.json();
  })
  .then(post => {
    console.log("불러온 글 데이터:", post);

    // 방어 처리: 값이 없으면 빈 문자열로 대체
    document.getElementById("title").value = post.title || "";
    document.getElementById("content").value = post.content || "";
    document.getElementById("category").value = post.category || "집";
  })
  .catch(err => {
    alert("글 로딩 실패 ㅠㅠ");
    console.error(err);
  });

// 수정 완료 시 서버에 업데이트 요청
document.getElementById("edit-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;
  const category = document.getElementById("category").value;

  console.log("폼 제출됨:", { title, content, category });

  fetch(`/edit/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, content, category })
  })
    .then(res => res.text())
    .then(msg => {
      console.log("서버 응답:", msg);
      alert(msg);
      window.location.href = `/post.html?id=${id}`;
    })
    .catch(err => {
      alert("수정 실패 ㅠㅠ");
      console.error(err);
    });
});
