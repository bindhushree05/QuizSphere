import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { promises as fs } from 'node:fs'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { promisify } from 'node:util'
import jwt from 'jsonwebtoken'

type Question = { prompt: string; choices: string[]; answer: number }
type User = { id: number; email: string; passwordHash: string; role: 'user' | 'admin'; firstName?: string; lastName?: string; mobile?: string }
type AuthUser = { id: number; email: string; role: User['role'] }
type Quiz = { id: number; title: string; description: string; category: string; difficulty: string; items: Question[]; ownerId?: number }
type Score = { id: number; userId: number; quizId: number; score: number; total: number; createdAt: string }
type AuthRequest = Request & { user?: AuthUser }

const app = express()
const port = Number(process.env.PORT || 8787)
const root = path.join(process.cwd(), 'server', 'data')
const jwtSecret = process.env.JWT_SECRET || 'quizsphere-development-secret-change-me'
const scrypt = promisify(scryptCallback)

app.use(cors())
app.use(express.json({ limit: '100kb' }))

async function readJson<T>(name: string): Promise<T> { return JSON.parse(await fs.readFile(path.join(root, name), 'utf8')) as T }
async function writeJson(name: string, value: unknown) { await fs.writeFile(path.join(root, name), JSON.stringify(value, null, 2) + '\n', 'utf8') }
async function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); const key = await scrypt(password, salt, 64) as Buffer; return `${salt}:${key.toString('hex')}` }
async function verifyPassword(password: string, stored: string) { const [salt, hex] = stored.split(':'); if (!salt || !hex) return false; const key = await scrypt(password, salt, 64) as Buffer; const saved = Buffer.from(hex, 'hex'); return saved.length === key.length && timingSafeEqual(saved, key) }
function tokenFor(user: AuthUser) { return jwt.sign(user, jwtSecret, { expiresIn: '2h' }) }
function requireAuth(request: AuthRequest, response: Response, next: NextFunction) { const header = request.header('authorization'); const token = header?.startsWith('Bearer ') ? header.slice(7) : null; if (!token) return response.status(401).json({ error: 'Authentication required' }); try { request.user = jwt.verify(token, jwtSecret) as AuthUser; return next() } catch { return response.status(401).json({ error: 'Invalid or expired token' }) } }
function requireAdmin(request: AuthRequest, response: Response, next: NextFunction) { if (request.user?.role !== 'admin') return response.status(403).json({ error: 'Administrator access required' }); return next() }

app.get('/api/health', (_request, response) => response.json({ status: 'ok', service: 'quizsphere-api' }))
app.post('/api/auth/register', async (request, response) => {
  const firstName = String(request.body.firstName || '').trim(); const lastName = String(request.body.lastName || '').trim(); const mobile = String(request.body.mobile || '').trim(); const email = String(request.body.email || '').trim().toLowerCase(); const password = String(request.body.password || '')
  if (!firstName || !lastName || !/^[0-9 +()\-]{7,}$/.test(mobile) || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return response.status(400).json({ error: 'First name, last name, valid mobile number, email, and a password of at least 8 characters are required' })
  const users = await readJson<User[]>('users.json'); if (users.some((user) => user.email === email)) return response.status(409).json({ error: 'An account with that email already exists' })
  const user: User = { id: Date.now(), firstName, lastName, mobile, email, passwordHash: await hashPassword(password), role: 'user' }; users.push(user); await writeJson('users.json', users)
  const authUser: AuthUser = { id: user.id, email: user.email, role: user.role }; return response.status(201).json({ user: { ...authUser, firstName, lastName, mobile }, token: tokenFor(authUser) })
})
app.post('/api/auth/login', async (request, response) => {
  const email = String(request.body.email || '').trim().toLowerCase(); const password = String(request.body.password || ''); const user = (await readJson<User[]>('users.json')).find((item) => item.email === email)
  if (!user || !(await verifyPassword(password, user.passwordHash))) return response.status(401).json({ error: 'Invalid email or password' })
  const authUser: AuthUser = { id: user.id, email: user.email, role: user.role }; return response.json({ user: authUser, token: tokenFor(authUser) })
})
app.get('/api/auth/me', requireAuth, (request: AuthRequest, response) => response.json({ user: request.user }))
app.get('/api/quizzes', async (_request, response) => response.json(await readJson<Quiz[]>('quizzes.json')))
app.get('/api/quizzes/:id', async (request, response) => { const quiz = (await readJson<Quiz[]>('quizzes.json')).find((item) => item.id === Number(request.params.id)); if (!quiz) return response.status(404).json({ error: 'Quiz not found' }); return response.json(quiz) })
app.post('/api/quizzes', requireAuth, async (request: AuthRequest, response) => {
  const { title, description, category, difficulty, items } = request.body as Partial<Quiz>
  if (!title || !description || !category || !difficulty || !Array.isArray(items) || items.length === 0) return response.status(400).json({ error: 'title, description, category, difficulty, and items are required' })
  const quiz: Quiz = { id: Date.now(), title, description, category, difficulty, items, ownerId: request.user!.id }; const quizzes = await readJson<Quiz[]>('quizzes.json'); quizzes.push(quiz); await writeJson('quizzes.json', quizzes); return response.status(201).json(quiz)
})
app.put('/api/quizzes/:id', requireAuth, async (request: AuthRequest, response) => {
  const quizzes = await readJson<Quiz[]>('quizzes.json'); const index = quizzes.findIndex((item) => item.id === Number(request.params.id)); if (index < 0) return response.status(404).json({ error: 'Quiz not found' })
  const quiz = quizzes[index]; if (request.user!.role !== 'admin' && quiz.ownerId !== request.user!.id) return response.status(403).json({ error: 'You can only edit quizzes you own' })
  quizzes[index] = { ...quiz, ...request.body, id: quiz.id, ownerId: quiz.ownerId }; await writeJson('quizzes.json', quizzes); return response.json(quizzes[index])
})
app.post('/api/scores', requireAuth, async (request: AuthRequest, response) => {
  const { quizId, score, total } = request.body as Partial<Score>; if (typeof quizId !== 'number' || typeof score !== 'number' || typeof total !== 'number' || !Number.isInteger(quizId) || !Number.isInteger(score) || !Number.isInteger(total) || score < 0 || total <= 0 || score > total) return response.status(400).json({ error: 'quizId, score, and total must be valid numbers' })
  const result: Score = { id: Date.now(), userId: request.user!.id, quizId, score, total, createdAt: new Date().toISOString() }; const scores = await readJson<Score[]>('scores.json'); scores.push(result); await writeJson('scores.json', scores); return response.status(201).json(result)
})
app.get('/api/scores', requireAuth, async (request: AuthRequest, response) => { const scores = await readJson<Score[]>('scores.json'); return response.json(request.user!.role === 'admin' ? scores : scores.filter((score) => score.userId === request.user!.id)) })
app.get('/api/admin/users', requireAuth, requireAdmin, async (_request, response) => response.json((await readJson<User[]>('users.json')).map(({ passwordHash: _passwordHash, ...user }) => user)))
app.listen(port, () => console.log(`QuizSphere API listening on http://localhost:${port}`))