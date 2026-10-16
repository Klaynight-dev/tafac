import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDemoGradesPayload, buildDemoSemesterGradesPayload } from '../src/demoAccount.js'
import { buildAbsenceReport, hasJuryDecision, parseGradeNumber } from '../src/gradesReport.js'
import { readSemesterUes } from '../src/semesterUes.js'

const SEMESTER_IDS = buildDemoGradesPayload().semestres.map((semester) => semester.formsemestre_id)
const releves = Object.fromEntries(SEMESTER_IDS.map((id) => [id, buildDemoSemesterGradesPayload(id)['relevé']]))
const ueAverage = (id, code) => parseGradeNumber(releves[id].ues[code].moyenne.value)

function assertStats(label, { value, min, moy, max }) {
  const [v, lo, mean, hi] = [value, min, moy, max].map(parseGradeNumber)
  if (lo == null) return
  assert.ok(lo <= mean && mean <= hi, `${label}: min ≤ moy ≤ max`)
  if (v != null) assert.ok(lo <= v && v <= hi, `${label}: ${v} within [${lo}, ${hi}]`)
}

test('the demo serves five semesters, the current one by default', () => {
  assert.deepEqual(SEMESTER_IDS, [9101, 9102, 9103, 9104, 9105])
  assert.equal(buildDemoGradesPayload()['relevé'].formsemestre_id, 9105)
  assert.equal(buildDemoSemesterGradesPayload('9999'), null)
  for (const id of SEMESTER_IDS) assert.equal(releves[id].formsemestre_id, id)
})

test('demo relevés are internally consistent', () => {
  const evaluationIds = new Set()

  for (const [id, releve] of Object.entries(releves)) {
    const { semestre } = releve
    assertStats(`${id} semester`, semestre.notes)
    assert.ok(Number.parseInt(semestre.rang.value, 10) <= semestre.rang.total)

    for (const [code, ue] of Object.entries(releve.ues)) {
      assertStats(`${id} ${code}`, ue.moyenne)
      assert.ok(Number.parseInt(ue.moyenne.rang, 10) <= ue.moyenne.total, `${id} ${code} rank`)
    }

    for (const module of [...Object.values(releve.ressources), ...Object.values(releve.saes)]) {
      for (const evaluation of module.evaluations) {
        assert.ok(!evaluationIds.has(evaluation.id), `evaluation ${evaluation.id} is unique`)
        evaluationIds.add(evaluation.id)
        assertStats(`${id} ${evaluation.id}`, evaluation.note)
      }
    }

    // The absence list adds up to the semester's summary (hours).
    const payload = buildDemoSemesterGradesPayload(id)
    let unjustified = 0
    let total = 0
    for (const list of Object.values(payload.absences)) {
      for (const absence of list.filter((entry) => entry.statut === 'absent')) {
        total += absence.fin - absence.debut
        if (!absence.justifie) unjustified += absence.fin - absence.debut
      }
    }
    assert.deepEqual([unjustified, total], [semestre.absences.injustifie, semestre.absences.total], `${id} absences`)
    assert.equal(buildAbsenceReport(payload, releve, payload.config).visible, true)
  }
})

test('the demo history covers compensation, a missing UE and the current semester', () => {
  // UE1.3 under 10, made up by UE2.3 over the year: its ECTS are awarded.
  assert.ok(ueAverage(9101, 'UE1.3') < 10)
  assert.ok((ueAverage(9101, 'UE1.3') + ueAverage(9102, 'UE2.3')) / 2 >= 10)
  assert.equal(releves[9101].semestre.ECTS.acquis, 30)
  // UE3.1 under 10 and not made up by UE4.1: 24 ECTS out of 30.
  assert.ok((ueAverage(9103, 'UE3.1') + ueAverage(9104, 'UE4.1')) / 2 < 10)
  assert.deepEqual(releves[9103].semestre.ECTS, { acquis: 24, total: 30 })

  for (const id of [9101, 9102, 9103, 9104]) assert.equal(hasJuryDecision(releves[id]), true)
  assert.equal(hasJuryDecision(releves[9105]), false)
  assert.equal(releves[9105].semestre.ECTS.acquis, 0)
})

test('the "UE validées" ring reads compensation and capitalisation from the demo relevés', () => {
  const states = (id) => Object.fromEntries(readSemesterUes(releves[id]).map((ue) => [ue.code, [ue.state, ue.validatedBy]]))
  // S1: UE1.3 under 10 but compensated (jury code CMP, ECTS awarded): 5/5,
  // as the 30/30 ECTS say.
  assert.deepEqual(states(9101)['UE1.3'], ['validated', 'compensation'])
  assert.equal(Object.values(states(9101)).filter(([state]) => state === 'validated').length, 5)
  // S2: UE2.5 capitalised.
  assert.deepEqual(states(9102)['UE2.5'], ['validated', 'capitalization'])
  // S3: UE3.1 not made up (AJ, no ECTS): 4/5.
  assert.deepEqual(states(9103)['UE3.1'], ['below', null])
  // S5, before the jury: the averages alone.
  assert.ok(Object.values(states(9105)).every(([, by]) => by === 'average'))
})
