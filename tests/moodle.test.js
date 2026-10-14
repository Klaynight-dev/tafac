import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDemoMoodleCourseContentsPayload,
  buildDemoMoodleCoursesPayload,
} from '../src/demoAccount.js'
import { getRouteFromPath } from '../src/appRoute.js'

test('buildDemoMoodleCoursesPayload returns formatted enrolled courses', () => {
  const payload = buildDemoMoodleCoursesPayload()
  assert.ok(Array.isArray(payload.courses))
  assert.ok(payload.courses.length >= 5)

  const firstCourse = payload.courses[0]
  assert.ok(Number.isFinite(firstCourse.id))
  assert.ok(typeof firstCourse.fullname === 'string' && firstCourse.fullname.length > 0)
  assert.ok(typeof firstCourse.shortname === 'string' && firstCourse.shortname.length > 0)
  assert.ok(typeof firstCourse.category === 'string')
})

test('buildDemoMoodleCourseContentsPayload returns sections and modules with file items', () => {
  const payload = buildDemoMoodleCourseContentsPayload(101)
  assert.equal(payload.courseId, 101)
  assert.ok(Array.isArray(payload.sections))
  assert.ok(payload.sections.length > 0)

  const firstSection = payload.sections[0]
  assert.ok(firstSection.name)
  assert.ok(Array.isArray(firstSection.modules))

  const fileModule = payload.sections
    .flatMap((s) => s.modules)
    .find((m) => m.contents && m.contents.length > 0)

  assert.ok(fileModule)
  const file = fileModule.contents[0]
  assert.ok(file.filename.endsWith('.pdf') || file.filename.endsWith('.zip'))
  assert.ok(Number.isFinite(file.filesize) && file.filesize > 0)
  assert.ok(file.fileurl)
})

test('routing recognizes moodle and its alias', () => {
  assert.equal(getRouteFromPath('/moodle'), 'moodle')
  assert.equal(getRouteFromPath('/cours'), 'moodle')
})

