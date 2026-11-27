import { readdir, readFile } from 'node:fs/promises'

const folder = new URL('../content/quizzes/', import.meta.url)
const files = (await readdir(folder)).filter(name => name.endsWith('.json'))
const categories = new Set(['生活', '工作', '感情', '家庭', '娛樂', '政治'])
const text = value => typeof value === 'string' && value.trim().length > 0
if (!files.length) throw new Error('題庫至少需要一期')
for (const name of files) {
  const quiz = JSON.parse(await readFile(new URL(name, folder), 'utf8'))
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(quiz.date) && !Number.isNaN(Date.parse(quiz.date))
    && new Date(quiz.date).toISOString().slice(0, 10) === quiz.date
  const validQuestions = quiz.questions?.length === 3 && quiz.questions.every(q =>
    text(q.prompt) && q.options?.length === 4 && q.options.every(text))
  const validResults = quiz.results?.length === 4 && quiz.results.every(r => text(r.title) && text(r.body))
  if (!/^\d{4}-\d{2}$/.test(quiz.id) || name !== quiz.id + '.json' || !validDate || !text(quiz.title)
      || !categories.has(quiz.category) || !Array.isArray(quiz.tags) || !quiz.tags.every(text)
      || !validQuestions || !validResults) throw new Error('題庫格式錯誤：' + name)
}
