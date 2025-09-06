function typeWriterEffect(elementId, text, speed = 100) {
  const el = document.getElementById(elementId);
  el.innerHTML = "";
  let i = 0;
  function typing() {
    if (i < text.length) {
      el.innerHTML += text.charAt(i);
      i++;
      setTimeout(typing, speed);
    }
  }
  typing();
}

// Jalankan saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  typeWriterEffect("logoText", "ALGOFAM-25", 120);
});