// functions/quiz.js

exports.handler = async (event) => {
  // 1) CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
  }

  // 2) Slugify helper
  const slugify = (str) =>
    str
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // 3) Extract parameters
  let { target, gender, personality, mood, budget } = event.queryStringParameters || {};
  if ((!target || !gender || !personality || !mood || !budget) && event.path && event.path !== "/") {
    const parts = decodeURIComponent(event.path.slice(1)).split("-");
    if (parts.length >= 5) [target, gender, personality, mood, budget] = parts;
  }

  // 4) Serve multi-step quiz if any missing
  if (!target || !gender || !personality || !mood || !budget) {
    const formHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EmilyGPT Perfume Quiz</title>
  <style>
    :root {
      --primary: #C62828;
      --bg: #F9F5F0;
      --text: #222222;
      --card-bg: #FFFFFF;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 100%; height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg);
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: var(--text);
    }
    .quiz-wrapper {
      width: 90%; max-width: 600px;
      background: var(--card-bg);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      padding: 3rem;
      display: flex;
      flex-direction: column;
    }
    .progress {
      height: 5px;
      background: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .progress-bar {
      height: 100%; width: 0;
      background: var(--primary);
      transition: width 0.4s ease;
    }
    .step {
      display: none;
      flex-direction: column;
      gap: 1.5rem;
      text-align: left;
    }
    .step.active { display: flex; }
    label {
      font-size: 1.125rem;
      margin-bottom: 0.5rem;
    }
    input, select {
      width: 100%;
      padding: 1rem;
      font-size: 1rem;
      border: 1px solid #ccc;
      border-radius: 8px;
      background: #fdfdfd;
      outline: none;
    }
    input:focus, select:focus { border-color: var(--primary); }
    .nav {
      display: flex;
      justify-content: space-between;
      margin-top: 2.5rem;
    }
    button {
      font-size: 1rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.3s ease;
    }
    button#prev {
      background: #f0f0f0;
      color: var(--text);
    }
    button#prev:hover { background: #e0e0e0; }
    button#next {
      background: var(--primary);
      color: #fff;
    }
    button#next:hover { background: #a82020; }
  </style>
</head>
<body>
  <div class="quiz-wrapper">
    <div class="progress"><div class="progress-bar" id="progress"></div></div>
    <div class="step active" data-step="1">
      <label>Who is this perfume for?</label>
      <input id="target" placeholder="E.g., my mom" />
    </div>
    <div class="step" data-step="2">
      <label>What’s their gender?</label>
      <select id="gender">
        <option value="" disabled selected>Select…</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="unisex">Unisex</option>
      </select>
    </div>
    <div class="step" data-step="3">
      <label>Describe their personality:</label>
      <input id="personality" placeholder="E.g., adventurous" />
    </div>
    <div class="step" data-step="4">
      <label>What mood do you want to evoke?</label>
      <input id="mood" placeholder="E.g., bold & bright" />
    </div>
    <div class="step" data-step="5">
      <label>What’s your budget?</label>
      <input id="budget" placeholder="E.g., under $100" />
    </div>
    <div class="nav">
      <button id="prev" disabled>Back</button>
      <button id="next">Next</button>
    </div>
  </div>
  <script>
    // auto-resize iframe parent
    function notifyHeight() {
      parent.postMessage({ type: 'quiz-height', height: document.documentElement.scrollHeight }, '*');
    }
    new ResizeObserver(notifyHeight).observe(document.body);
    window.addEventListener('load', notifyHeight);

    function slugify(str) {
      return str.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    }
    const steps = Array.from(document.querySelectorAll('.step'));
    const progress = document.getElementById('progress');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    let index = 0;
    function updateProgress() { progress.style.width = ((index / (steps.length - 1)) * 100) + '%'; }
    function updateUI() {
      steps.forEach((s,i) => s.classList.toggle('active', i===index));
      updateProgress();
      prevBtn.disabled = index===0;
      nextBtn.textContent = index===steps.length-1 ? 'Submit' : 'Next';
    }
    prevBtn.onclick = () => { if(index>0) index--; updateUI(); };
    nextBtn.onclick = () => {
      const f = steps[index].querySelector('input,select');
      if(!f.value.trim()){ alert('Please fill in the field.'); return; }
      if(index<steps.length-1) { index++; updateUI(); }
      else {
        const t=slugify(document.getElementById('target').value);
        const g=slugify(document.getElementById('gender').value);
        const p=slugify(document.getElementById('personality').value);
        const m=slugify(document.getElementById('mood').value);
        const b=slugify(document.getElementById('budget').value);
        document.querySelector('.quiz-wrapper').innerHTML='<p>Cooking your sassy recommendation... 🍾</p>';
        setTimeout(() => window.location.href = '/' + [t,g,p,m,b].join('-'), 500);
      }
    };
    updateUI();
  </script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: formHtml
    };
  }

  // 5) Build SEO question...
  // (remaining code unchanged) 
};
