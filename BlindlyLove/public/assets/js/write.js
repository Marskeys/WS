// 🔹 1. URL에서 category 추출
const params = new URLSearchParams(window.location.search);
const category = params.get("category");

// 🔹 2. category가 없을 경우 예외 처리
if (!category) {
  alert("카테고리가 지정되지 않았습니다.");
  window.location.href = "/";
}

// 🔹 3. 숨겨진 input에 category 값 넣기
document.getElementById("category-input").value = category;

// 🔹 4. 카테고리별 소카테고리 매핑
const subcategoryMap = {
  "basic-income": ["집", "돈", "병원", "식비", "교육"],
  "disabled": ["시각", "청각", "지체", "발달", "정신"],
  "seniors": ["복지관", "요양", "의료", "돌봄", "고독사 예방"],
  "lgbtq": ["법률", "차별", "정신건강", "커뮤니티", "정체성"],
  "korea": ["비자", "체류", "생활정보", "공공서비스", "주거지원"],
  "politics": ["선거", "정당", "정책비평", "시민참여", "언론"],
  "religion": ["기독교", "불교", "이슬람", "천주교", "종교차별"],
  "homemakers": ["육아", "가사노동", "가정폭력", "교육비", "가족갈등"]
};

// 🔹 5. 소카테고리 select 요소 채우기
const subSelect = document.getElementById("subcategory");
const options = subcategoryMap[category] || ["기타"];
subSelect.innerHTML = options.map(v => `<option value="${v}">${v}</option>`).join("");

// 🔹 6. 폼 제출 처리
document.getElementById("write-form").addEventListener("submit", function (e) {
  e.preventDefault(); // 새로고침 방지

  const title = document.querySelector("input[name='title']").value;
  const content = document.querySelector("textarea[name='content']").value;
  const subcategory = document.querySelector("select[name='subcategory']").value;

  fetch("/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, content, category, subcategory }),
  })
    .then(res => {
      if (!res.ok) throw new Error("서버 오류!");
      return res.text();
    })
    .then(msg => {
      alert("글이 등록됐어요!");
      window.location.href = `/${category}/`;
    })
    .catch(err => {
      alert("오류 발생!");
      console.error(err);
    });
});
