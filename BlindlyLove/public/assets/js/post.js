const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// ✅ 글 내용 불러오기
fetch(`/post/${id}`)
  .then(res => res.json())
  .then(post => {
    document.getElementById("post-title").textContent = post.title;
    document.getElementById("post-content").textContent = post.content;

    // ✅ 수정 링크에 id 동적으로 삽입
    const editLink = document.getElementById("edit-link");
    editLink.href = `/edit.html?id=${id}`;
  })
  .catch(err => {
    document.getElementById("post-title").textContent = "글을 불러오지 못했어요 😢";
    console.error(err);
  });

// ✅ 삭제 기능도 원래대로 유지
const deleteBtn = document.getElementById("delete-btn");
if (deleteBtn) {
  deleteBtn.addEventListener("click", () => {
    if (!confirm("정말 이 글을 삭제할까요?")) return;

    fetch(`/delete/${id}`, {
      method: "POST"
    })
    .then(res => res.text())
    .then(msg => {
      alert(msg);
      window.location.href = "/basic-income/";
    })
    .catch(err => {
      alert("삭제 중 오류 발생!");
      console.error(err);
    });
  });
}
