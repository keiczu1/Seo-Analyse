import fs from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/score-brief.mjs <brief.md>");
  process.exit(2);
}

const text = await fs.readFile(file, "utf8");
const requiredSections = [
  /query passport|паспорт запроса/i,
  /executive production decision|итоговое решение по странице/i,
  /serp interpretation|serp evidence|serp analysis|интерпретация выдачи|анализ выдачи/i,
  /serp features|особенности выдачи|фичи выдачи/i,
  /entity map|semantic layer|семантический слой|карта сущностей/i,
  /query cluster|кластер запроса/i,
  /page decision|решение по странице/i,
  /meta suggestions|metadata|meta description|title и description|мета/i,
  /source plan|план источников/i,
  /source refresh|source verification|checked official URLs|проверка источников|проверка официальных/i,
  /publication review|publication candidate|ready_for_publication|публикационная проверка/i,
  /implementation contract|контракт разработки/i,
  /outline|структура страницы|план страницы/i,
  /editor brief|редакторский бриф/i,
  /frontend brief|бриф для разработки|frontend-бриф/i,
  /trust|доверие/i,
  /schema|structured data|структурированн/i,
  /qa checklist|quality checks|чеклист качества|qa-чеклист/i,
];

const criticalFails = [
  [/guaranteed (ranking|growth)/i, "guaranteed ranking claim"],
  [/(?:use|add|implement|generate|создать|добавить|использовать)\s+.{0,120}(?:schema|structured data|структурированн).{0,120}(?:invisible|невидим)/i, "schema for invisible content"],
  [/knowledge_draft[\s\S]{0,80}(parsed|full serp|rendered_dom)/i, "offline draft mixed with parsed SERP"],
  [/meta suggestions?[\s\S]{0,400}(keyword stuffing|keyword list only)/i, "metadata without visible-content basis"],
  [/source-sensitive[\s\S]{0,160}without source plan/i, "source-sensitive page without source plan"],
  [/source refresh required[\s\S]{0,240}(final|ready_for_publication)/i, "required source refresh called final"],
  [/(medically reviewed|проверено врач)[\s\S]{0,160}(without real reviewer|без реального)/i, "fake medical review claim"],
  [/(lawyer reviewed|attorney reviewed|legal reviewed|\u043f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043e\s+\u044e\u0440\u0438\u0441\u0442|\u043f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043e\s+\u0430\u0434\u0432\u043e\u043a\u0430\u0442)[\s\S]{0,160}(without real reviewer|\u0431\u0435\u0437\s+\u0440\u0435\u0430\u043b)/i, "fake legal review claim"],
];

function sectionBetween(startPattern, endPattern) {
  const start = text.search(startPattern);
  if (start < 0) return "";
  const rest = text.slice(start);
  const end = rest.slice(1).search(endPattern);
  return end < 0 ? rest : rest.slice(0, end + 1);
}

const metaSection = sectionBetween(/##\s+Meta Suggestions|##\s+Title и Description|##\s+Metadata/i, /\n##\s+/i);
const clusterSection = sectionBetween(/##\s+Query Cluster|##\s+Кластер запроса/i, /\n##\s+Page Decision|\n##\s+Решение по странице/i);
const outlineSection = sectionBetween(/##\s+Outline|##\s+Структура страницы/i, /\n##\s+Editor Brief|\n##\s+Редакторский бриф/i);
const sourcePlanSection = sectionBetween(/##\s+Source Plan|##\s+План источников/i, /\n##\s+Source Refresh|\n##\s+Проверка источников/i);
const implementationSection = sectionBetween(/##\s+Implementation Contract|##\s+Контракт разработки/i, /\n##\s+Outline|\n##\s+Структура страницы/i);
const editorSection = sectionBetween(/##\s+Editor Brief|##\s+Редакторский бриф/i, /\n##\s+Frontend Brief|\n##\s+Бриф для разработки/i);
const frontendSection = sectionBetween(/##\s+Frontend Brief|##\s+Бриф для разработки/i, /\n##\s+Trust|\n##\s+Доверие/i);

const qualityFails = [
  [/\b[a-z]+(?:_[a-z0-9]+){1,}\b/.test(metaSection), "internal module id in meta section"],
  [/\.\.\./.test(metaSection), "truncated ellipsis in meta section"],
  [/method_or_source/.test(sourcePlanSection), "generic method_or_source source plan"],
  [/source refresh required[\s\S]{0,240}ready_for_publication/i.test(text), "source-required brief marked publication-ready"],
  [/Raw SERP signals[\s\S]{0,500}\|\s*(?:[^|\n]+\|){2}/i.test(clusterSection) && !/not normalized keywords/i.test(clusterSection), "raw SERP signals not labeled as non-keywords"],
  [/\b[a-z]+(?:_[a-z0-9]+){1,}\b/.test(outlineSection), "internal module id in outline"],
  [!/Рабочая структура|Actionable outline/i.test(outlineSection), "outline is not actionable"],
  [!/Цель блока|Section job|What to cover|Что раскрыть/i.test(outlineSection), "outline lacks section goals and coverage instructions"],
  [!/Факты для проверки|Facts to verify|Source gate/i.test(outlineSection), "outline lacks source-verification prompts"],
  [!/Критерий приемки|Acceptance/i.test(outlineSection), "outline lacks acceptance criteria"],
  [!/Спецификация компонентов|Component specs/i.test(implementationSection), "implementation contract lacks component specs"],
  [!/Проверить перед публикацией|Verify before publication/i.test(sourcePlanSection), "source plan lacks publication verification checklist"],
  [!/Задача автора|Author task/i.test(editorSection), "editor brief lacks author task"],
  [!/Секционные инструкции|Section instructions/i.test(editorSection), "editor brief lacks section-level instructions"],
  [!/Задача разработки|Development task/i.test(frontendSection), "frontend brief lacks development task"],
  [!/Компоненты и UI-ожидания|Components and UI expectations/i.test(frontendSection), "frontend brief lacks component UI expectations"],
];

const missing = requiredSections.filter((pattern) => !pattern.test(text)).length;
const critical = criticalFails
  .filter(([pattern]) => pattern.test(text))
  .map(([, label]) => label)
  .concat(qualityFails.filter(([failed]) => failed).map(([, label]) => label));
const sectionScore = Math.max(0, requiredSections.length - missing);
const maxScore = 40;
const score = Math.min(maxScore, Math.round((sectionScore / requiredSections.length) * 34) + (critical.length ? 0 : 6));

const result = {
  file,
  score,
  max: maxScore,
  missingSections: missing,
  criticalFails: critical,
  pass: score >= 38 && critical.length === 0,
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exit(1);
