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

  // 3) Extract parameters from query or path
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
    :root { --primary: #C62828; --bg: #F9F5F0; --text: #333333; --field-bg: #FFFFFF; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      font-family: sans-serif;
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .quiz-wrapper {
      width: 100%;
      max-width: 480px;
      background: var(--field-bg);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 2rem;
      display: flex;
      flex-direction: column;
    }
    .progress {
      height: 4px;
      background: #eee;
      width: 100%;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .progress-bar {
      height: 100%;
      background: var(--primary);
      width: 0;
      transition: width .3s ease;
    }
    .step {
      flex: 1;
      display: none;
      flex-direction: column;
      gap: 1rem;
    }
    .step.active { display: flex; }
    label { font-size: 1rem; margin-bottom: .5rem; }
    input, select {
      font-size: 1rem;
      padding: .75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: var(--bg);
      width: 100%;
    }
    .nav {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
    }
    button {
      font-size: 1rem;
      padding: .75rem 1.25rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button#prev { background: #ddd; color: var(--text); }
    button#next { background: var(--primary); color: #fff; }
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
    // auto-resize for parent iframe
    function notifyHeight() {
      parent.postMessage(
        { type: 'quiz-height', height: document.documentElement.scrollHeight },
        '*'
      );
    }
    const ro = new ResizeObserver(notifyHeight);
    ro.observe(document.body);
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
    function updateProgress() {
      progress.style.width = ((index / (steps.length - 1)) * 100) + '%';
    }
    function updateUI() {
      steps.forEach((s, i) => s.classList.toggle('active', i === index));
      updateProgress();
      prevBtn.disabled = index === 0;
      nextBtn.textContent = index === steps.length - 1 ? 'Submit' : 'Next';
    }
    prevBtn.onclick = () => { if (index > 0) index--; updateUI(); };
    nextBtn.onclick = () => {
      const field = steps[index].querySelector('input,select');
      if (!field.value.trim()) { alert('Please fill in the field.'); return; }
      if (index < steps.length - 1) { index++; updateUI(); } else {
        const t = slugify(document.getElementById('target').value);
        const g = slugify(document.getElementById('gender').value);
        const p = slugify(document.getElementById('personality').value);
        const m = slugify(document.getElementById('mood').value);
        const b = slugify(document.getElementById('budget').value);
        document.querySelector('.quiz-wrapper').innerHTML = '<p>Cooking your sassy recommendation... 🍾</p>';
        setTimeout(() => window.location.href = '/' + [t, g, p, m, b].join('-'), 500);
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

  // 5) Build SEO question
  const question =
    `Which ${gender} perfume should I gift to ${target}, who is ${personality}, to evoke a ${mood} mood within a budget of ${budget}?`;

  // 6) Prompt GPT for JSON response
  const prompt = `You are EmilyGPT, an irreverent perfume guru.\nAnswer in JSON with keys: "perfumeName", "reason".\nNow answer: ${question}`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are EmilyGPT, irreverent perfume guru." },
        { role: "user", content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 300
    })
  });
  if (!resp.ok) throw new Error(`OpenAI error (${resp.status})`);

  const { choices } = await resp.json();
  const raw = choices[0].message.content;
  const jsonText = raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  let data;
  try { data = JSON.parse(jsonText); } catch (e) {
    throw new Error("GPT returned invalid JSON:\n" + raw);
  }
  const { perfumeName, reason } = data;

  // 7) Build affiliate search link
  const linkId = "29d49a9185b1f48a905c292658d3be8a";
  const query = encodeURIComponent(perfumeName + " perfume");
  const amazonLink =
    `https://www.amazon.com/s?k=${query}` +
    `&linkCode=ll2&tag=emilyscent-20&linkId=${linkId}` +
    `&language=en_US&ref_=as_li_ss_tl`;

  // 8) Render result
  const resultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${perfumeName} – ${target}'s Perfume</title>
  <meta name="description" content="${question} I recommend ${perfumeName}."/>
</head>
<body style="font-family:sans-serif;padding:2rem">
  <div style="max-width:600px;margin:0 auto; text-align:center;">
    <h1>Your Question</h1><p>${question}</p>
    <h2>EmilyGPT Says</h2><p>${reason}</p>
    <h3>Perfume: <em>${perfumeName}</em></h3>
    <a href="${amazonLink}" target="_blank" style="display:inline-block;margin-top:1rem;padding:.5rem 1rem;background:#C62828;color:#fff;text-decoration:none;border-radius:4px">
      Buy on Amazon
    </a>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: resultHtml
  };
};
