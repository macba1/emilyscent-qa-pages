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
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  // 3) Extract parameters from query or path
  let { target, gender, personality, mood, budget } = event.queryStringParameters || {};
  if ((!target || !gender || !personality || !mood || !budget) && event.path && event.path !== "/") {
    const parts = decodeURIComponent(event.path.slice(1)).split("-");
    if (parts.length >= 5) {
      [target, gender, personality, mood, budget] = parts;
    }
  }

  // 4) Serve quiz form if any missing
  if (!target || !gender || !personality || !mood || !budget) {
    const formHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EmilyGPT Perfume Quiz</title>
  <style>
    :root { --primary:#C62828; --bg:#F9F5F0; --text:#222; --card-bg:#FFF; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { width:100%; height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg); font-family:sans-serif; color:var(--text); }
    .quiz-wrapper { width:90%; max-width:600px; background:var(--card-bg); border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.1); padding:3rem; display:flex; flex-direction:column; }
    .progress { height:5px; background:#eee; border-radius:3px; overflow:hidden; margin-bottom:2rem; }
    .progress-bar { height:100%; width:0; background:var(--primary); transition:width .4s ease; }
    .step { display:none; flex-direction:column; gap:1.5rem; text-align:left; }
    .step.active { display:flex; }
    label { font-size:1.125rem; margin-bottom:.5rem; }
    input, select { width:100%; padding:1rem; font-size:1rem; border:1px solid #ccc; border-radius:8px; background:#fdfdfd; }
    input:focus, select:focus { border-color:var(--primary); outline:none; }
    .nav { display:flex; justify-content:space-between; margin-top:2.5rem; }
    button { font-size:1rem; padding:.75rem 1.5rem; border:none; border-radius:8px; cursor:pointer; transition:background .3s ease; }
    button#prev { background:#ddd; color:var(--text); }
    button#prev:hover { background:#ccc; }
    button#next { background:var(--primary); color:#fff; }
    button#next:hover { background:#a82020; }
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
    // auto-resize parent iframe
    function notifyHeight() { parent.postMessage({ type:'quiz-height', height: document.documentElement.scrollHeight }, '*'); }
    new ResizeObserver(notifyHeight).observe(document.body);
    window.addEventListener('load', notifyHeight);

    // quiz step logic
    const steps = Array.from(document.querySelectorAll('.step'));
    const progress = document.getElementById('progress');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    let idx = 0;
    function updateProgress() { progress.style.width = ((idx/(steps.length-1))*100)+'%'; }
    function updateUI() { steps.forEach((s,i)=>s.classList.toggle('active',i===idx)); prevBtn.disabled = idx===0; nextBtn.textContent= idx===steps.length-1?'Submit':'Next'; updateProgress(); }
    prevBtn.onclick = ()=>{ if(idx>0) idx--; updateUI(); };
    nextBtn.onclick = ()=>{
      const f = steps[idx].querySelector('input,select');
      if(!f.value.trim()){ alert('Please fill in the field.'); return; }
      if(idx<steps.length-1){ idx++; updateUI(); }
      else {
        const t=slugify(document.getElementById('target').value);
        const g=slugify(document.getElementById('gender').value);
        const p=slugify(document.getElementById('personality').value);
        const m=slugify(document.getElementById('mood').value);
        const b=slugify(document.getElementById('budget').value);
        document.querySelector('.quiz-wrapper').innerHTML='<p>Cooking your sassy recommendation… 🍾</p>';
        setTimeout(()=>window.location.href=`/${t}-${g}-${p}-${m}-${b}`, 500);
      }
    };
    updateUI();

    // helper slugify
    function slugify(str){ return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  </script>
</body>
</html>`;
    return { statusCode:200, headers:{'Content-Type':'text/html'}, body: formHtml };
  }

  // 5) Build SEO question
  const question =
    `Which ${gender} perfume should I gift to ${target}, who is ${personality}, to evoke a ${mood} mood within a budget of ${budget}?`;

  // 6) Prompt GPT for recommendation
  const prompt = `You are EmilyGPT, an irreverent perfume guru. Answer in JSON with keys: "perfumeName","reason". Now answer: ${question}`;
  const resp = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model:'gpt-3.5-turbo', messages:[{ role:'system',content:'You are EmilyGPT, irreverent perfume guru.'},{ role:'user',content:prompt }], temperature:0.9, max_tokens:300 })
  });
  if(!resp.ok) throw new Error(`OpenAI error (${resp.status})`);
  const { choices } = await resp.json();
  const raw = choices[0].message.content;
  const jsonText = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}')+1);
  let data;
  try{ data = JSON.parse(jsonText); } catch(e){ throw new Error('Invalid JSON from GPT:\n'+raw); }
  const { perfumeName, reason } = data;

  // 7) Build affiliate search link
  const linkId = '29d49a9185b1f48a905c292658d3be8a';
  const query = encodeURIComponent(perfumeName + ' perfume');
  const amazonLink =
    `https://www.amazon.com/s?k=${query}`+
    `&linkCode=ll2&tag=emilyscent-20&linkId=${linkId}&language=en_US&ref_=as_li_ss_tl`;

  // 8) Log to Google Sheets
  await fetch('https://script.google.com/macros/s/AKfycbwiKWpt3Hqxr65JlIRft5o_8H05uwHmMv063sQRjCd3HhFBZ8_enyhYrhoiq56Oxka8OA/exec',{ method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ slug:`${target}-${gender}-${personality}-${mood}-${budget}`, question, perfumeName, reason, amazonLink, timestamp:new Date().toISOString() })
  });

  // 9) Render result page
  const resultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${perfumeName} – ${target}'s Perfume</title>
  <meta name="description" content="${question} I recommend ${perfumeName}." />
</head>
<body style="font-family:sans-serif;padding:2rem;background:#F9F5F0;">
  <div style="max-width:600px;margin:0 auto;text-align:center;background:#fff;padding:2rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <h1>Your Question</h1>
    <p>${question}</p>
    <h2>EmilyGPT Says</h2>
    <p>${reason}</p>
    <h3>Perfume: <em>${perfumeName}</em></h3>
    <a href="${amazonLink}" target="_blank" style="display:inline-block;margin-top:1rem;padding:.75rem 1.5rem;background:#C62828;color:#fff;text-decoration:none;border-radius:4px;">
      Buy on Amazon
    </a>
  </div>
</body>
</html>`;

  return { statusCode:200, headers:{'Content-Type':'text/html'}, body: resultHtml };
};
