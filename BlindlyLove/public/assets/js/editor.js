function format(command, value = null) {
    if (command === 'createLink') {
      const url = prompt('링크 주소를 입력하세요:');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(command, false, value);
    }
  }
  
  function insertImage() {
    const url = prompt('이미지 URL 입력:');
    if (url) document.execCommand('insertImage', false, url);
  }
  
  function saveContent() {
    const html = document.getElementById('editor').innerHTML;
    document.getElementById('result').value = html;
    alert("저장 완료! 아래 HTML 결과를 확인하세요.");
  }
  