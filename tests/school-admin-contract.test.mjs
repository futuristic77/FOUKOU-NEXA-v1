import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const settingsView = await readFile(new URL('../components/foukou/settings-view.tsx', import.meta.url), 'utf8')
const platformDashboard = await readFile(new URL('../components/foukou/platform-dashboard.tsx', import.meta.url), 'utf8')
const actions = await readFile(new URL('../app/actions.ts', import.meta.url), 'utf8')
const auth = await readFile(new URL('../lib/auth.ts', import.meta.url), 'utf8')
const homePage = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8')
const schoolData = await readFile(new URL('../lib/school-data.ts', import.meta.url), 'utf8')
const actionForm = await readFile(new URL('../components/foukou/action-form.tsx', import.meta.url), 'utf8')
const schoolQueries = await readFile(new URL('../lib/school-admin-data.mjs', import.meta.url), 'utf8')

test('les formulaires de paramètres affichent les droits réels et envoient les champs attendus', () => {
  assert.match(settingsView, /const canSchool = hasPermission\(data\.user\.role, 'school:update'\)/)
  assert.match(settingsView, /const canSettings = hasPermission\(data\.user\.role, 'settings:write'\)/)
  assert.match(settingsView, /name="address"[\s\S]*disabled=\{!canSchool\}/)
  assert.match(settingsView, /name="phone"[\s\S]*disabled=\{!canSchool\}/)
  assert.match(settingsView, /name="email"[\s\S]*disabled=\{!canSchool\}/)
  assert.match(settingsView, /key=\{JSON\.stringify\(data\.school\)\} resetOnSuccess/)
  assert.match(settingsView, /type="reset" variant="outline">Annuler/)
  assert.match(settingsView, /key=\{JSON\.stringify\(account\)\} onSuccess=\{onDone\} resetOnSuccess/)
  assert.doesNotMatch(settingsView, /deleteSchool|Zone de suppression/)

  const profileAction = actions.split('export async function saveSchool')[1].split('export async function deleteSchool')[0]
  assert.match(profileAction, /perform\('school:update', async \(user, schoolId\)/)
  assert.match(profileAction, /await db\(\)\.begin\(async \(tx\) => \{[\s\S]*updateSchoolProfile\(tx, schoolId, profile\)[\s\S]*logActivity\(tx, schoolId, user\.id/)
  assert.doesNotMatch(profileAction, /form\.get\(['"]schoolId/)

  const settingsAction = actions.split('export async function saveSettings')[1].split('export async function saveSchool')[0]
  assert.match(settingsAction, /perform\('settings:write', async \(user, schoolId\)/)
  assert.match(settingsAction, /await db\(\)\.begin\(async \(tx\) => \{[\s\S]*updateSchoolSettings\(tx, schoolId,[\s\S]*logActivity\(tx, schoolId, user\.id/)
})

test('les coordonnées disponibles à la création sont validées et persistées', () => {
  for (const name of ['address', 'phone', 'email']) assert.match(platformDashboard, new RegExp(`name="${name}"`))
  const createAction = actions.split('export async function createSchool')[1].split('function teacherProfileLinkMessage')[0]
  assert.match(createAction, /optionalText\(form, 'address', 240\)/)
  assert.match(createAction, /optionalText\(form, 'phone', 40\)/)
  assert.match(createAction, /optionalEmail\(form, 'email'\)/)
  assert.match(createAction, /INSERT INTO schools \(name, city, country, address, phone, email\)/)
})

test('la suppression plateforme envoie un identifiant validé et une confirmation exacte', () => {
  assert.match(platformDashboard, /name="schoolId"/)
  assert.match(platformDashboard, /name="confirmation"/)
  assert.match(platformDashboard, /confirm=\{`Confirmez-vous la suppression définitive de \$\{school\.name\}/)
  assert.match(actions, /const schoolId = id\(form, 'schoolId'\)!/)
  assert.match(actions, /matchesSchoolDeletionConfirmation\(confirmation, rows\[0\]\.name\)/)
  assert.match(actions, /requirePlatformAdmin\('school:delete'\)/)
})

test('les formulaires partagés gèrent les erreurs réseau et bloquent un second envoi', () => {
  assert.match(actionForm, /tryStartSubmission\(submissionLock\)/)
  assert.match(actionForm, /catch \{/)
  assert.match(actionForm, /finally \{/)
  assert.match(actionForm, /setResult\(\{ ok: false, message:/)
})

test('les écritures administratives dérivent leur portée de la session authentifiée', () => {
  assert.match(auth, /return assertPermission\(await getCurrentUser\(\), permission\)/)
  assert.match(auth, /return requireSchoolId\(user\)/)
  assert.match(actions, /const schoolId = requireSchool\(user\)/)
  assert.match(schoolData, /const schoolId = requireSchool\(user\)/)
  assert.match(homePage, /getHomeDestination\(user\)/)
  assert.match(schoolQueries, /WHERE id = \$\{schoolId\}/)
  assert.match(schoolQueries, /WHERE school_id = \$\{schoolId\}/)
})
