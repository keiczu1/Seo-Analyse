import re

with open('d:\\Git\\Keiczu1\\Seo Analyse\\Gemini\\footer-showcase.html', 'r', encoding='utf-8') as f:
    content = f.read()

v1_grid = '''<div class="lawyers-v1-grid">
          <!-- Card 1 -->
          <div class="lawyer-v1-card">
            <div class="v1-photo-wrap">
              <img src="dmitry-nosikov.png" alt="Дмитрий Носиков">
              <span class="v1-online-badge"></span>
            </div>
            <div class="v1-info">
              <div class="v1-name-row">
                <h3>Дмитрий Носиков</h3>
                <svg class="v1-verified-icon" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <span class="v1-role">Адвокат • г. Москва</span>
              <div class="v1-specs">
                <span class="v1-spec-tag">Семейные споры</span>
                <span class="v1-spec-tag">Раздел имущества</span>
                <span class="v1-spec-tag">Наследство</span>
              </div>
              <div class="v1-stats">
                <span><svg viewBox="0 0 24 24"><path fill="#fbbf24" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> 4.9 (190)</span>
                <span><svg viewBox="0 0 24 24"><path fill="#94a3b8" d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z"/></svg> 14 лет стажа</span>
              </div>
            </div>
            <div class="v1-actions">
              <button class="v1-btn-primary">Задать вопрос</button>
              <a href="#" class="v1-link-profile">Перейти в профиль</a>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="lawyer-v1-card">
            <div class="v1-photo-wrap">
              <img src="elena-smirnova.png" alt="Елена Смирнова">
            </div>
            <div class="v1-info">
              <div class="v1-name-row">
                <h3>Елена Смирнова</h3>
                <svg class="v1-verified-icon" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <span class="v1-role">Юрист • г. Санкт-Петербург</span>
              <div class="v1-specs">
                <span class="v1-spec-tag">Жилищное право</span>
                <span class="v1-spec-tag">Земля</span>
                <span class="v1-spec-tag">Договоры купли-продажи</span>
              </div>
              <div class="v1-stats">
                <span><svg viewBox="0 0 24 24"><path fill="#fbbf24" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> 4.8 (142)</span>
                <span><svg viewBox="0 0 24 24"><path fill="#94a3b8" d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z"/></svg> 9 лет стажа</span>
              </div>
            </div>
            <div class="v1-actions">
              <button class="v1-btn-primary">Задать вопрос</button>
              <a href="#" class="v1-link-profile">Перейти в профиль</a>
            </div>
          </div>

          <!-- Card 3 -->
          <div class="lawyer-v1-card">
            <div class="v1-photo-wrap">
              <img src="aleksey-petrov.png" alt="Алексей Петров">
              <span class="v1-online-badge"></span>
            </div>
            <div class="v1-info">
              <div class="v1-name-row">
                <h3>Алексей Петров</h3>
                <svg class="v1-verified-icon" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <span class="v1-role">Адвокат • г. Екатеринбург</span>
              <div class="v1-specs">
                <span class="v1-spec-tag">Уголовные дела</span>
                <span class="v1-spec-tag">ДТП</span>
                <span class="v1-spec-tag">Споры с ГИБДД</span>
              </div>
              <div class="v1-stats">
                <span><svg viewBox="0 0 24 24"><path fill="#fbbf24" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> 4.9 (118)</span>
                <span><svg viewBox="0 0 24 24"><path fill="#94a3b8" d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z"/></svg> 11 лет стажа</span>
              </div>
            </div>
            <div class="v1-actions">
              <button class="v1-btn-primary">Задать вопрос</button>
              <a href="#" class="v1-link-profile">Перейти в профиль</a>
            </div>
          </div>

          <!-- Card 4 -->
          <div class="lawyer-v1-card">
            <div class="v1-photo-wrap">
              <img src="tatiana-kozlova.png" alt="Татьяна Козлова">
            </div>
            <div class="v1-info">
              <div class="v1-name-row">
                <h3>Татьяна Козлова</h3>
                <svg class="v1-verified-icon" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
              <span class="v1-role">Юрист • г. Новосибирск</span>
              <div class="v1-specs">
                <span class="v1-spec-tag">Кредитные споры</span>
                <span class="v1-spec-tag">Банкротство</span>
                <span class="v1-spec-tag">МФО, коллекторы</span>
              </div>
              <div class="v1-stats">
                <span><svg viewBox="0 0 24 24"><path fill="#fbbf24" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> 4.7 (94)</span>
                <span><svg viewBox="0 0 24 24"><path fill="#94a3b8" d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z"/></svg> 7 лет стажа</span>
              </div>
            </div>
            <div class="v1-actions">
              <button class="v1-btn-primary">Задать вопрос</button>
              <a href="#" class="v1-link-profile">Перейти в профиль</a>
            </div>
          </div>
        </div>'''

v2_grid = '''<div class="lawyers-v2-grid">
          <!-- Card 1 -->
          <div class="lawyer-v2-card">
            <div class="v2-header">
               <div class="v2-avatar" style="background-image:url('dmitry-nosikov.png'); background-size:cover; background-position:center;"></div>
               <div class="v2-title">
                 <h3>Дмитрий Носиков</h3>
                 <span class="v2-role">Адвокат</span>
               </div>
            </div>
            <div class="v2-stats-row">
              <span title="Рейтинг">? 4.9</span>
              <span title="Стаж">?? 14 лет</span>
              <span title="Ответов">?? 4120</span>
            </div>
            <p class="v2-desc">Семейные споры, раздел имущества, наследство. г. Москва.</p>
            <div class="v2-hover-action">
              <button class="v2-btn">Спросить юриста</button>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="lawyer-v2-card">
            <div class="v2-header">
               <div class="v2-avatar" style="background-image:url('elena-smirnova.png'); background-size:cover; background-position:center;"></div>
               <div class="v2-title">
                 <h3>Елена Смирнова</h3>
                 <span class="v2-role">Юрист</span>
               </div>
            </div>
            <div class="v2-stats-row">
              <span title="Рейтинг">? 4.8</span>
              <span title="Стаж">?? 9 лет</span>
              <span title="Ответов">?? 2890</span>
            </div>
            <p class="v2-desc">Жилищное право, земля, договоры купли-продажи. г. Санкт-Петербург.</p>
            <div class="v2-hover-action">
              <button class="v2-btn">Спросить юриста</button>
            </div>
          </div>

          <!-- Card 3 -->
          <div class="lawyer-v2-card">
            <div class="v2-header">
               <div class="v2-avatar" style="background-image:url('aleksey-petrov.png'); background-size:cover; background-position:center;"></div>
               <div class="v2-title">
                 <h3>Алексей Петров</h3>
                 <span class="v2-role">Адвокат</span>
               </div>
            </div>
            <div class="v2-stats-row">
              <span title="Рейтинг">? 4.9</span>
              <span title="Стаж">?? 11 лет</span>
              <span title="Ответов">?? 3400</span>
            </div>
            <p class="v2-desc">Уголовные дела, ДТП, споры с ГИБДД. г. Екатеринбург.</p>
            <div class="v2-hover-action">
              <button class="v2-btn">Спросить юриста</button>
            </div>
          </div>

          <!-- Card 4 -->
          <div class="lawyer-v2-card">
            <div class="v2-header">
               <div class="v2-avatar" style="background-image:url('tatiana-kozlova.png'); background-size:cover; background-position:center;"></div>
               <div class="v2-title">
                 <h3>Татьяна Козлова</h3>
                 <span class="v2-role">Юрист</span>
               </div>
            </div>
            <div class="v2-stats-row">
              <span title="Рейтинг">? 4.7</span>
              <span title="Стаж">?? 7 лет</span>
              <span title="Ответов">?? 1950</span>
            </div>
            <p class="v2-desc">Кредитные споры, банкротство, МФО, коллекторы. г. Новосибирск.</p>
            <div class="v2-hover-action">
              <button class="v2-btn">Спросить юриста</button>
            </div>
          </div>
        </div>'''

v3_list = '''<div class="lawyers-v3-list">
          <!-- Row 1 -->
          <div class="lawyer-v3-row">
            <div class="v3-col-user">
              <img src="dmitry-nosikov.png" alt="Дмитрий Носиков" class="v3-photo">
              <div class="v3-user-info">
                <h3>Дмитрий Носиков <svg class="v1-verified-icon" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></h3>
                <span class="v3-role">Адвокат</span>
              </div>
            </div>
            <div class="v3-col-desc">
              <div class="v3-location">?? г. Москва</div>
              <p class="v3-spec">Семейные споры, раздел имущества, наследство.</p>
            </div>
            <div class="v3-col-stats">
              <div class="v3-stat"><span class="v3-val">4.9</span> ? Рейтинг</div>
              <div class="v3-stat"><span class="v3-val">14</span> ?? Лет стажа</div>
            </div>
            <div class="v3-col-action">
              <button class="v3-btn">Задать вопрос</button>
            </div>
          </div>

          <!-- Row 2 -->
          <div class="lawyer-v3-row">
            <div class="v3-col-user">
              <img src="elena-smirnova.png" alt="Елена Смирнова" class="v3-photo">
              <div class="v3-user-info">
                <h3>Елена Смирнова <svg class="v1-verified-icon" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></h3>
                <span class="v3-role">Юрист</span>
              </div>
            </div>
            <div class="v3-col-desc">
              <div class="v3-location">?? г. Санкт-Петербург</div>
              <p class="v3-spec">Жилищное право, земля, договоры купли-продажи.</p>
            </div>
            <div class="v3-col-stats">
              <div class="v3-stat"><span class="v3-val">4.8</span> ? Рейтинг</div>
              <div class="v3-stat"><span class="v3-val">9</span> ?? Лет стажа</div>
            </div>
            <div class="v3-col-action">
              <button class="v3-btn">Задать вопрос</button>
            </div>
          </div>

          <!-- Row 3 -->
          <div class="lawyer-v3-row">
            <div class="v3-col-user">
              <img src="aleksey-petrov.png" alt="Алексей Петров" class="v3-photo">
              <div class="v3-user-info">
                <h3>Алексей Петров <svg class="v1-verified-icon" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></h3>
                <span class="v3-role">Адвокат</span>
              </div>
            </div>
            <div class="v3-col-desc">
              <div class="v3-location">?? г. Екатеринбург</div>
              <p class="v3-spec">Уголовные дела, ДТП, споры с ГИБДД.</p>
            </div>
            <div class="v3-col-stats">
              <div class="v3-stat"><span class="v3-val">4.9</span> ? Рейтинг</div>
              <div class="v3-stat"><span class="v3-val">11</span> ?? Лет стажа</div>
            </div>
            <div class="v3-col-action">
              <button class="v3-btn">Задать вопрос</button>
            </div>
          </div>

          <!-- Row 4 -->
          <div class="lawyer-v3-row">
            <div class="v3-col-user">
              <img src="tatiana-kozlova.png" alt="Татьяна Козлова" class="v3-photo">
              <div class="v3-user-info">
                <h3>Татьяна Козлова <svg class="v1-verified-icon" viewBox="0 0 24 24" fill="#10b981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></h3>
                <span class="v3-role">Юрист</span>
              </div>
            </div>
            <div class="v3-col-desc">
              <div class="v3-location">?? г. Новосибирск</div>
              <p class="v3-spec">Кредитные споры, банкротство, МФО, коллекторы.</p>
            </div>
            <div class="v3-col-stats">
              <div class="v3-stat"><span class="v3-val">4.7</span> ? Рейтинг</div>
              <div class="v3-stat"><span class="v3-val">7</span> ?? Лет стажа</div>
            </div>
            <div class="v3-col-action">
              <button class="v3-btn">Задать вопрос</button>
            </div>
          </div>
        </div>'''

content = re.sub(r'<div class="lawyers-v1-grid">.*?(?=</div>\s*</div>\s*<!-- VARIANT 2)', v1_grid, content, flags=re.DOTALL)
content = re.sub(r'<div class="lawyers-v2-grid">.*?(?=</div>\s*</div>\s*<!-- VARIANT 3)', v2_grid, content, flags=re.DOTALL)
content = re.sub(r'<div class="lawyers-v3-list">.*?(?=</div>\s*</div>\s*<!-- VARIANT 4)', v3_list, content, flags=re.DOTALL)

with open('d:\\Git\\Keiczu1\\Seo Analyse\\Gemini\\footer-showcase.html', 'w', encoding='utf-8') as f:
    f.write(content)
