import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { deactivateTestUsers } from './cleanup'
import { adminEmail, adminPassword, emailDomain } from './env'

/**
 * Full product walkthrough on the live Firebase project.
 *
 * Setup steps (login, department, employees) are hard requirements — if they fail the run stops.
 * Every other area is checked independently: a failure is recorded and the run continues,
 * so one report shows everything that is broken.
 */

const runId = Date.now().toString(36).slice(-6)
const password = `Qa!${runId}${Math.random().toString(36).slice(2, 8)}`
const deptName = `QA Test ${runId}`

type Role = 'department_admin' | 'member'
type TestUser = { key: string; name: string; email: string; role: Role }

const users: Record<'lead' | 'alice' | 'bob', TestUser> = {
  lead: { key: 'lead', name: `QA Lead ${runId}`, email: `qa-lead-${runId}@${emailDomain}`, role: 'department_admin' },
  alice: { key: 'alice', name: `QA Alice ${runId}`, email: `qa-alice-${runId}@${emailDomain}`, role: 'member' },
  bob: { key: 'bob', name: `QA Bob ${runId}`, email: `qa-bob-${runId}@${emailDomain}`, role: 'member' },
}

type Session = { context: BrowserContext; page: Page; errors: string[] }

const results: { area: string; ok: boolean; detail?: string }[] = []
const notes: string[] = []

async function openSession(browser: Browser, label: string): Promise<Session> {
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`[${label}] ${err.message}`))
  page.on('dialog', (d) => void d.accept())
  return { context, page, errors }
}

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(pass)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible()
}

/** Run one checked area; record pass/fail and keep going. */
async function area(name: string, fn: () => Promise<void>) {
  await test.step(name, async () => {
    try {
      await fn()
      results.push({ area: name, ok: true })
      console.log(`PASS  ${name}`)
    } catch (err) {
      const detail = (err instanceof Error ? err.message : String(err)).split('\n').slice(0, 4).join(' ')
      results.push({ area: name, ok: false, detail })
      console.log(`FAIL  ${name} -> ${detail}`)
    }
  })
}

/** Hard requirement: fail the whole run. */
async function required(name: string, fn: () => Promise<void>) {
  await test.step(name, async () => {
    try {
      await fn()
      results.push({ area: name, ok: true })
    } catch (err) {
      results.push({ area: name, ok: false, detail: err instanceof Error ? err.message : String(err) })
      throw err
    }
  })
}

test('full Zuvius Internal flow', async ({ browser }) => {
  test.skip(!adminEmail || !adminPassword, 'Fill E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD in .env.e2e.local')

  const sessions: Session[] = []
  const created: string[] = []
  let taskUrl = ''
  const taskTitle = `QA task ${runId}`

  try {
    // ───────────────────────── Setup (hard requirements) ─────────────────────────
    const admin = await openSession(browser, 'admin')
    sessions.push(admin)

    await required('Admin can sign in', async () => {
      await login(admin.page, adminEmail, adminPassword)
    })

    await required('Admin creates a department', async () => {
      const p = admin.page
      await p.goto('/departments')
      await p.getByRole('button', { name: 'Add department' }).first().click()
      await p.locator('#dept-name').fill(deptName)
      await p.locator('#dept-desc').fill('Temporary department created by the automated test')
      await p.getByRole('dialog').locator('button[type="submit"]').click()
      await expect(p.getByRole('dialog')).toBeHidden()
      await expect(p.getByText(deptName).filter({ visible: true }).first()).toBeVisible()
    })

    for (const u of Object.values(users)) {
      await required(`Admin creates employee: ${u.role} (${u.key})`, async () => {
        const p = admin.page
        await p.goto('/team')
        await p.getByRole('button', { name: 'Create employee' }).first().click()
        const dialog = p.getByRole('dialog')
        const inputs = dialog.locator('input')
        await inputs.nth(0).fill(u.name)
        await inputs.nth(1).fill(u.email)
        await inputs.nth(2).fill(password)
        await dialog.locator('select').nth(0).selectOption(u.role)
        await dialog.locator('select').nth(1).selectOption({ label: deptName })
        await dialog.getByRole('button', { name: 'Save employee' }).click()
        await expect(p.getByText(`${u.name} was created`).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 })
        created.push(u.email)
      })
    }

    const lead = await openSession(browser, 'lead')
    const alice = await openSession(browser, 'alice')
    const bob = await openSession(browser, 'bob')
    sessions.push(lead, alice, bob)

    await required('New employees can sign in', async () => {
      await login(lead.page, users.lead.email, password)
      await login(alice.page, users.alice.email, password)
      await login(bob.page, users.bob.email, password)
    })

    // ───────────────────────── Tasks ─────────────────────────
    await required('Admin creates a task for Alice (with attachment)', async () => {
      const p = admin.page
      await p.goto('/tasks/new')
      await p.locator('#task-title').fill(taskTitle)
      const assignee = p.getByPlaceholder(/Assignee \(3\+\)/)
      await assignee.fill(users.alice.name)
      await p.getByRole('button', { name: new RegExp(users.alice.name) }).filter({ visible: true }).first().click()
      await p.selectOption('#priority', 'high')
      await p
        .locator('#create-task-form input[type="file"]')
        .setInputFiles({ name: `qa-brief-${runId}.txt`, mimeType: 'text/plain', buffer: Buffer.from('QA attachment') })
      await p.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(p).toHaveURL(/\/tasks\/(?!new$)[^/]+$/, { timeout: 45_000 })
      taskUrl = new URL(p.url()).pathname
      await expect(p.getByText('Task created successfully')).toBeVisible()
    })

    await area('Task shows a business ID (ZVS-…) and the attachment', async () => {
      const p = admin.page
      await expect(p.getByText(/ZVS-[A-Z0-9]+-\d{6}/).filter({ visible: true }).first()).toBeVisible()
      await expect(p.getByText(`qa-brief-${runId}.txt`).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Alice sees the new task on her dashboard', async () => {
      await alice.page.goto('/')
      await expect(alice.page.getByText(taskTitle).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Alice gets a notification for the new task', async () => {
      await alice.page.goto('/notifications')
      await expect(alice.page.getByText(taskTitle).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Task chat: Alice posts a message', async () => {
      const p = alice.page
      await p.goto(taskUrl)
      await p.getByRole('button', { name: 'Chat' }).click()
      const panel = p.getByLabel('Task chat')
      await panel.getByPlaceholder('Message…').fill(`Started on it ${runId}`)
      await panel.locator('button[type="submit"]').click()
      await expect(panel.getByText(`Started on it ${runId}`).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Alice forwards the task to Bob with a handover note', async () => {
      const p = alice.page
      await p.goto(taskUrl)
      await p.getByRole('button', { name: 'Forward' }).first().click()
      await p.getByPlaceholder('Search by name, department, or role…').fill(users.bob.name)
      await p.getByRole('button', { name: new RegExp(users.bob.name) }).filter({ visible: true }).first().click()
      await p.locator('#handover-note').fill(`Half done, Bob please finish ${runId}`)
      await p.getByRole('button', { name: 'Review handover' }).click()
      await p.getByRole('dialog').getByRole('button').last().click()
      await expect(p.getByText('You previously owned this task')).toBeVisible({ timeout: 30_000 })
    })

    await area('Bob gets a "forwarded" notification', async () => {
      await bob.page.goto('/notifications')
      await expect(bob.page.getByText(taskTitle).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Bob sees Alice\'s earlier task-chat message', async () => {
      const p = bob.page
      await p.goto(taskUrl)
      await p.getByRole('button', { name: 'Chat' }).click()
      await expect(p.getByLabel('Task chat').getByText(`Started on it ${runId}`).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Bob marks the task complete', async () => {
      const p = bob.page
      await p.goto(taskUrl)
      await p.getByRole('button', { name: 'Mark complete' }).first().click()
      await expect(p.getByText('You marked this task as completed.')).toBeVisible()
    })

    await area('Admin sees the task as completed', async () => {
      const p = admin.page
      await p.goto(taskUrl)
      await expect(p.getByText(/^completed$/i).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Admin is notified that the task was completed', async () => {
      await admin.page.goto('/notifications')
      await expect(admin.page.getByText(taskTitle).filter({ visible: true }).first()).toBeVisible()
    })

    // ───────────────────────── Projects ─────────────────────────
    await area('Admin creates a project with one task for Bob', async () => {
      const p = admin.page
      await p.goto('/projects/new')
      await p.getByPlaceholder('Project title').fill(`QA project ${runId}`)
      await p.locator('#task-title').fill(`QA project task ${runId}`)
      await p.getByPlaceholder(/Assignee \(3\+\)/).fill(users.bob.name)
      await p.getByRole('button', { name: new RegExp(users.bob.name) }).filter({ visible: true }).first().click()
      await p.getByRole('button', { name: 'Add task to project' }).click()
      await p.locator('button[type="submit"]:visible').first().click()
      await expect(p).toHaveURL(/\/projects\/[^/]+$/, { timeout: 45_000 })
      await expect(p.getByText(`QA project task ${runId}`).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Bob sees the project task', async () => {
      await bob.page.goto('/?scope=yours&tab=mine')
      await expect(bob.page.getByText(`QA project task ${runId}`).filter({ visible: true }).first()).toBeVisible()
    })

    // ───────────────────────── Messaging ─────────────────────────
    let dmUrl = ''
    await area('Direct message: Alice → Bob', async () => {
      const p = alice.page
      await p.goto('/messages')
      await p.getByRole('button', { name: 'New chat' }).click()
      await p.getByPlaceholder('Search name, role, or department…').fill(users.bob.name)
      await p.getByRole('button', { name: new RegExp(users.bob.name) }).filter({ visible: true }).first().click()
      await expect(p).toHaveURL(/\/messages\/[^/]+$/)
      dmUrl = new URL(p.url()).pathname
      const box = p.getByPlaceholder('Type a message…')
      await box.fill(`Hi Bob ${runId}`)
      await box.press('Enter')
      await expect(p.getByText(`Hi Bob ${runId}`).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Bob sees an unread chat in his inbox', async () => {
      await bob.page.goto('/messages')
      const row = bob.page.getByText(users.alice.name).filter({ visible: true }).first()
      await expect(row).toBeVisible()
      await expect(bob.page.getByText('New', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Bob receives the message and replies; Alice sees it live', async () => {
      await bob.page.goto(dmUrl)
      await expect(bob.page.getByText(`Hi Bob ${runId}`).filter({ visible: true }).first()).toBeVisible()
      const box = bob.page.getByPlaceholder('Type a message…')
      await box.fill(`Hey Alice ${runId}`)
      await box.press('Enter')
      await expect(alice.page.getByText(`Hey Alice ${runId}`).filter({ visible: true }).first()).toBeVisible() // no reload
    })

    await area('Chat file attachment upload', async () => {
      const p = alice.page
      await p.goto(dmUrl)
      await p
        .locator('input[type="file"]')
        .first()
        .setInputFiles({ name: `qa-chat-${runId}.txt`, mimeType: 'text/plain', buffer: Buffer.from('chat file') })
      await p.getByPlaceholder('Add a caption (optional)…').press('Enter')
      await expect(p.getByText(`qa-chat-${runId}.txt`).filter({ visible: true }).first()).toBeVisible({ timeout: 45_000 })
    })

    await area('Bob gets a notification for the direct message', async () => {
      await bob.page.goto('/notifications')
      await expect(bob.page.getByText(`${users.alice.name}: Hi Bob ${runId}`).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Department channel: lead posts, Alice reads', async () => {
      await lead.page.goto('/messages')
      await lead.page.getByRole('button', { name: /^Department/ }).first().click()
      await lead.page.getByText(deptName).filter({ visible: true }).first().click()
      const box = lead.page.getByPlaceholder('Type a message…')
      await box.fill(`Team update ${runId}`)
      await box.press('Enter')
      await expect(lead.page.getByText(`Team update ${runId}`).filter({ visible: true }).first()).toBeVisible()

      await alice.page.goto('/messages')
      await alice.page.getByRole('button', { name: /^Department/ }).first().click()
      await alice.page.getByText(deptName).filter({ visible: true }).first().click()
      await expect(alice.page.getByText(`Team update ${runId}`).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Group chat: Alice creates a group with Bob and Lead', async () => {
      const p = alice.page
      await p.goto('/messages')
      await p.getByRole('button', { name: 'New chat' }).click()
      await p.getByText('Message several people at once').click()
      await p.getByPlaceholder('Group name').fill(`QA group ${runId}`)
      const search = p.getByPlaceholder('Search people to add…')
      await search.fill(users.bob.name)
      await p.getByLabel(users.bob.name).check()
      await search.fill(users.lead.name)
      await p.getByLabel(users.lead.name).check()
      await p.getByRole('button', { name: 'Start group' }).click()
      await expect(p).toHaveURL(/\/messages\/[^/]+$/)
      const box = p.getByPlaceholder('Type a message…')
      await box.fill(`Group hello ${runId}`)
      await box.press('Enter')
      await expect(p.getByText(`Group hello ${runId}`).filter({ visible: true }).first()).toBeVisible()
    })

    // ───────────────────────── Roles & pages ─────────────────────────
    await area('Member cannot open admin pages (Departments / Team)', async () => {
      await alice.page.goto('/departments')
      await expect(alice.page).toHaveURL(/\/$|\/\?/)
      await expect(alice.page.getByRole('link', { name: 'Departments' })).toHaveCount(0)
    })

    await area('Department admin sees Reports', async () => {
      await lead.page.goto('/reports')
      await expect(lead.page).toHaveURL(/\/reports/)
      await expect(lead.page.getByText(/something went wrong|failed to load/i)).toHaveCount(0)
    })

    for (const path of ['/', '/reports', '/activity', '/departments', '/team', '/notifications', '/settings']) {
      await area(`Admin page loads without errors: ${path}`, async () => {
        const before = admin.errors.length
        await admin.page.goto(path)
        await admin.page.waitForTimeout(1500) // let live data arrive
        await expect(admin.page.getByText(/something went wrong|missing or insufficient permissions/i)).toHaveCount(0)
        expect(admin.errors.slice(before), 'uncaught JS errors').toEqual([])
      })
    }

    await area('Employee profile page opens', async () => {
      await admin.page.goto('/team')
      await admin.page.getByPlaceholder('Search employees…').fill(users.alice.name)
      await admin.page.getByRole('link', { name: 'View' }).first().click()
      await expect(admin.page.getByText(users.alice.name).filter({ visible: true }).first()).toBeVisible()
    })

    await area('Dark mode toggle', async () => {
      const p = alice.page
      await p.goto('/')
      const html = p.locator('html')
      const wasDark = ((await html.getAttribute('class')) ?? '').includes('dark')
      await p.getByRole('button', { name: 'Toggle theme' }).click()
      if (wasDark) await expect(html).not.toHaveClass(/dark/)
      else await expect(html).toHaveClass(/dark/)
      await p.getByRole('button', { name: 'Toggle theme' }).click()
    })

    await area('Admin deletes the test task', async () => {
      const p = admin.page
      await p.goto(taskUrl)
      await p.getByRole('button', { name: 'Delete task' }).click()
      await expect(p).not.toHaveURL(new RegExp(`${taskUrl}$`), { timeout: 30_000 })
    })

    await area('Admin deactivates an employee; they are locked out', async () => {
      const p = admin.page
      await p.goto('/team')
      await p.getByPlaceholder('Search employees…').fill(users.alice.name)
      await p.getByRole('link', { name: 'Edit' }).filter({ visible: true }).first().click()
      await p.getByRole('button', { name: 'Deactivate employee' }).click()
      await expect(p.getByRole('dialog')).toBeHidden()
      await alice.page.goto('/')
      await expect(alice.page.getByText('Account deactivated')).toBeVisible()
      await p.goto('/team')
      await p.getByLabel('Show deactivated').check()
      await p.getByPlaceholder('Search employees…').fill(users.alice.name)
      await expect(p.getByText('Inactive').filter({ visible: true }).first()).toBeVisible()
    })

    await area('Sign out', async () => {
      const p = bob.page
      await p.goto('/')
      await p.getByRole('button', { name: new RegExp(users.bob.name.charAt(0)) }).last().click()
      await p.getByRole('menuitem', { name: 'Sign out' }).click()
      await expect(p).toHaveURL(/\/login/)
    })

    await area('No uncaught JavaScript errors in any session', async () => {
      const all = sessions.flatMap((s) => s.errors)
      expect(all).toEqual([])
    })
  } finally {
    // ───────────────────────── Cleanup ─────────────────────────
    if (created.length) {
      try {
        const off = await deactivateTestUsers(created)
        notes.push(`Deactivated ${off.length}/${created.length} test employees.`)
      } catch (err) {
        notes.push(`Could not deactivate test employees: ${String(err)}`)
      }
    }
    notes.push(`Leftovers to remove manually if wanted: department "${deptName}", test Auth users *-${runId}@${emailDomain}, test chats/notifications.`)
    for (const s of sessions) await s.context.close().catch(() => undefined)

    const lines = results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.area}${r.detail ? `\n        ↳ ${r.detail}` : ''}`)
    console.log(`\n===== E2E summary (run ${runId}) =====\n${lines.join('\n')}\n\n${notes.join('\n')}\n`)
  }

  const failed = results.filter((r) => !r.ok)
  expect(failed.map((f) => f.area), 'failed areas').toEqual([])
})
