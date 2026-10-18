/* global __UNIVERSITY_ID__ */
import { useState } from 'react'
import { Icon } from '@iconify/react'
import universityConfig from '@university'
import universityShowcase from '../../universities/showcase.js'
import lentLogo from '../assets/lent-logo.svg'
import loginClouds from '../assets/login/login-clouds.webp'
import loginIsland from '../assets/login/login-island.webp'
import loginSky from '../assets/login/login-sky.webp'
import loginLogo from '../assets/login/login-logo.webp'
import LentButton from './LentButton'
import AboutModal from './AboutModal'
import RenameNotice from './RenameNotice'
import { APP_NAME } from '../seo'

const universityLogo = universityConfig.branding.logo
const universityLogoAlt = universityConfig.branding.logoAlt ?? universityConfig.university?.name ?? ''
const passwordNote = universityConfig.branding.loginPasswordNote ?? null
const repoUrl = universityConfig.branding.about?.repoUrl ?? null
const loginLinks = universityConfig.links ?? {}
// Width of the login page's left panel, matching its flex-basis.
const PANEL_WIDTH = 'min(529px, 47vw)'

const activeUniversityId = typeof __UNIVERSITY_ID__ !== 'undefined' ? __UNIVERSITY_ID__ : universityConfig.id
const otherUniversities = universityShowcase.filter(
  (entry) => entry.id !== activeUniversityId && (!entry.devOnly || import.meta.env.DEV),
)

// Subdomain labels of every tenant we know about client-side, used to strip
// an existing tenant label from the hostname before adding the target's.
const tenantLabels = new Set(
  [activeUniversityId, ...universityShowcase.map((entry) => entry.id)].map((id) => id.replace(/-/g, '')),
)

// Login URL of another tenant. Tenants live on `<id-without-dashes>.<root>`
// (see server.js); the root domain is the current host, minus its leading
// tenant label when we're already on a tenant subdomain.
function universityLoginUrl(entry) {
  if (entry.url) return entry.url

  const targetLabel = entry.id.replace(/-/g, '')

  // The dev server serves a single baked university: /<label> asks it to
  // restart on that tenant (see the switcher middleware in vite.config.js).
  if (import.meta.env.DEV) return `/${targetLabel}`

  const { protocol, hostname, port } = window.location
  const labels = hostname.split('.')
  const rootDomain = labels.length > 1 && tenantLabels.has(labels[0]) ? labels.slice(1).join('.') : hostname

  return `${protocol}//${targetLabel}.${rootDomain}${port ? `:${port}` : ''}`
}

function LoginPage({
  credentials,
  checking,
  errorMessage,
  onCredentialsChange,
  onDemoLogin,
  onSubmit,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [renameNoticeOpen, setRenameNoticeOpen] = useState(false)

  function handleDemoLinkClick() {
    setAboutOpen(false)
    onDemoLogin?.()
  }

  return (
    <section className="flex w-full min-h-screen bg-bg" aria-label="Page de connexion">
      <div
        className="login-left-panel relative flex flex-[0_0_min(529px,47vw)] flex-col max-w-[529px] min-w-0 min-h-screen overflow-hidden bg-[#5688af] max-4xl:hidden max-3xl:flex-[0_0_44vw] max-3xl:max-w-[529px]"
      >
        <img
          className="absolute inset-0 block h-full w-full max-w-none object-cover"
          src={loginSky}
          alt=""
          aria-hidden="true"
        />

        <div className="relative z-10 ml-10 flex w-[381px] max-w-[calc(100%_-_80px)] shrink-0 flex-col items-start gap-5 pt-10 max-3xl:ml-8 max-3xl:max-w-[calc(100%_-_64px)]">
          {/* The flower and butterfly overflow the 195×85 logo box. */}
          <div className="relative h-[85px] w-[195px] shrink-0">
            <img
              className="absolute left-[-21px] top-[-15px] block h-[110px] w-[247px] max-w-none"
              src={loginLogo}
              alt={APP_NAME}
              width="247"
              height="110"
            />
          </div>
          <div className="flex w-full flex-col items-start gap-[10px] text-white">
            <h1 className="m-0 w-full text-[clamp(40px,6.7vh,60px)] font-bold leading-[0.9]">Cours, notes et services de ton université</h1>
            <p className="m-0 w-full text-[20px] font-semibold leading-[0.9] font-body">Une solution alternative, libre et ouverte</p>
          </div>
        </div>

        {/* The island shrinks to the space left under the text, so it never
            covers it on short screens. Its clouds are a separate layer sized
            on the panel width, so they always run edge to edge. Geometry
            (in island units, 529 × 488.5): clouds 779 × 524, top 93.5,
            centre 32 right of the island's. */}
        <div className="relative z-0 mt-6 min-h-0 flex-1">
          <div className="absolute inset-x-0 bottom-0 mx-auto aspect-[1058/977] max-h-full">
            <img
              className="absolute top-[19.14%] left-[56.07%] block h-auto max-w-none -translate-x-1/2"
              style={{ width: `calc(${PANEL_WIDTH} * 1.473)` }}
              src={loginClouds}
              alt=""
              aria-hidden="true"
              width="1558"
              height="1048"
            />
            <img
              className="absolute inset-0 block h-full w-full"
              src={loginIsland}
              alt=""
              aria-hidden="true"
              width="1058"
              height="977"
            />
          </div>
        </div>
      </div>

      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        demoLinkLabel="Accéder à la démo"
        onDemoLinkClick={handleDemoLinkClick}
      />

      <RenameNotice visible={renameNoticeOpen} onDismiss={() => setRenameNoticeOpen(false)} />

      <div className="relative isolate flex min-h-screen min-w-0 flex-[1_1_auto] items-stretch justify-center bg-[#f5f3ed] dark:bg-bg max-4xl:w-full max-md:justify-start">
        <button
          type="button"
          className="absolute top-[27px] left-6 z-30 inline-flex h-8 items-center gap-[6px] rounded-full border border-border/70 bg-widget-bg/60 px-3 text-[13px] font-medium leading-none font-body transition-colors duration-120 hover:bg-widget-bg max-3xl:top-[23px] max-3xl:left-5 max-md:top-[19px] max-md:left-4"
          onClick={() => setRenameNoticeOpen(true)}
        >
          <Icon icon="carbon:star" className="h-[14px] w-[14px] shrink-0 text-text-muted" aria-hidden="true" />
          <span
            className="bg-[linear-gradient(90deg,var(--color-text-muted)_0%,var(--color-text)_50%,var(--color-text-muted)_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer"
            style={{ animationDuration: '3s' }}
          >
            l'ent devient Tafac !
          </span>
        </button>

        <button
          type="button"
          className="absolute top-6 right-6 z-30 inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-transparent text-text-muted transition-colors duration-120 hover:text-text max-3xl:top-5 max-3xl:right-5 max-md:top-4 max-md:right-4"
          onClick={() => setAboutOpen(true)}
          aria-label="À propos"
        >
          <Icon icon="carbon:information" className="h-[18px] w-[18px]" />
        </button>

        <div className="relative z-10 box-border flex min-h-screen w-[min(720px,100%)] flex-col gap-[clamp(14px,calc(6vh_-_26px),25px)] px-[88px] pb-[clamp(56px,calc(30vh_-_150px),120px)] max-4xl:w-[min(640px,100%)] max-4xl:gap-[clamp(14px,calc(6vh_-_26px),24px)] max-4xl:px-10 max-4xl:pb-[clamp(24px,calc(30vh_-_170px),48px)] max-3xl:w-[min(600px,100%)] max-3xl:px-8 max-3xl:pb-9 max-md:w-full max-md:gap-5 max-md:px-5 max-md:pb-6">
          <header className="relative flex shrink-0 justify-center text-center">
            <div className="flex w-[337px] max-w-full flex-col items-center gap-5 pt-[clamp(66px,calc(30vh_-_153px),117px)] max-4xl:pt-[66px] max-md:pt-[62px]">
              {/* The left panel (its app logo and tagline) is hidden below
                  4xl: both here instead. The university's logo isn't the
                  form's header (Tafac isn't the university's): it says what
                  Tafac works with, under the form. */}
              <div className="hidden flex-col items-center gap-3 max-4xl:flex">
                <img className="h-11 w-auto object-contain" src={lentLogo} alt={APP_NAME} />
                <p className="m-0 text-[15px] font-semibold leading-[1.2] text-text-muted font-body">Cours, notes et services de ton université</p>
              </div>

              <div className="flex w-full flex-col items-center gap-[10px] text-text">
                <h2 className="m-0 w-full text-[40px] leading-[0.9] max-md:text-[36px]">Connexion</h2>
                <p className="m-0 w-full text-[16px] font-medium leading-4 font-body max-md:text-[15px]">
                  Utilise tes codes fournis par ton établissement d'enseignement supérieur
                </p>
              </div>
            </div>
          </header>

          {/* Real form with labelled username/current-password fields and a
              submit button, so password managers recognize and offer to save
              the login (the labels are visually hidden: the placeholders do
              the job on screen). */}
          <form className="grid gap-[18px]" onSubmit={onSubmit}>
            <label htmlFor="login-username" className="sr-only">Identifiant</label>
            <input
              id="login-username"
              name="username"
              className="w-full min-h-[56px] py-[17px] px-[18px] login-field border border-white rounded-[53px] bg-widget-bg text-text font-inherit text-base leading-none box-border placeholder:text-text-muted placeholder:opacity-100 focus-visible:border-brand font-body"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              type="text"
              placeholder="Identifiant"
              value={credentials.username}
              onChange={(event) => onCredentialsChange('username', event.target.value)}
            />

            <div className="relative">
              <label htmlFor="login-password" className="sr-only">Mot de passe</label>
              <input
                id="login-password"
                name="password"
                className="w-full min-h-[56px] py-[17px] px-[18px] pr-[52px] login-field border border-white rounded-[53px] bg-widget-bg text-text font-inherit text-base leading-none box-border placeholder:text-text-muted placeholder:opacity-100 focus-visible:border-brand font-body"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={credentials.password}
                onChange={(event) => onCredentialsChange('password', event.target.value)}
              />
              <button
                type="button"
                className="absolute right-[6px] top-1/2 -translate-y-1/2 w-[42px] h-[42px] flex items-center justify-center rounded-full border-0 bg-transparent text-text-muted cursor-pointer transition-colors duration-120 hover:text-text hover:bg-bg-subtle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                tabIndex={-1}
              >
                <Icon icon={showPassword ? 'carbon:view-off' : 'carbon:view'} className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${errorMessage ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl bg-error-bg border border-error/20 transition-opacity duration-200 ${errorMessage ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="m-0 text-error text-sm font-semibold font-body">{errorMessage}</p>
                </div>
              </div>
            </div>

            <LentButton type="submit" className="w-full justify-self-stretch font-bold!" loading={checking}>
              Se connecter
            </LentButton>
          </form>

          {loginLinks.forgotPassword || loginLinks.activateAccount ? (
            <div className="flex justify-center items-start gap-[30px] max-md:flex-wrap max-md:gap-[14px_24px]">
              {loginLinks.forgotPassword ? (
                <a
                  className="p-0 border-0 bg-transparent text-text font-inherit text-base font-medium leading-[1.06] underline underline-offset-2 font-body max-md:text-[15px]"
                  href={loginLinks.forgotPassword}
                >
                  Mot de passe oublié
                </a>
              ) : null}
              {loginLinks.activateAccount ? (
                <a
                  className="p-0 border-0 bg-transparent text-text font-inherit text-base font-medium leading-[1.06] underline underline-offset-2 font-body max-md:text-[15px]"
                  href={loginLinks.activateAccount}
                >
                  Activer mon compte
                </a>
              ) : null}
            </div>
          ) : null}

          {/* What Tafac works with, and what happens to the password. */}
          <div className="flex flex-col items-center gap-[10px] text-center">
            <span className="inline-flex items-center gap-2 text-[13px] font-medium leading-none text-text-muted font-body">
              Compatible avec
              <img
                className="h-6 w-auto max-w-[110px] object-contain opacity-70 grayscale dark:invert"
                src={universityLogo}
                alt={universityLogoAlt}
              />
            </span>
            {passwordNote ? (
              <p className="m-0 max-w-[400px] text-[13px] font-medium leading-[1.35] text-text-muted font-body">{passwordNote}</p>
            ) : null}
          </div>

          {otherUniversities.length > 0 ? (
            <div
              className="mt-auto flex flex-col items-center gap-4 pt-[clamp(12px,calc(10vh_-_50px),40px)] max-md:mt-0 max-md:pt-3 max-md:gap-3"
              aria-label="Autres universités disponibles"
            >
              <p className="m-0 text-[13px] font-medium leading-[1.1] text-text-muted font-body">
                {APP_NAME} est aussi disponible pour
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
                {otherUniversities.map((entry) => (
                  <a
                    key={entry.id}
                    className="opacity-35 transition-opacity duration-120 hover:opacity-70 focus-visible:opacity-70"
                    href={universityLoginUrl(entry)}
                    title={`Se connecter — ${entry.name}`}
                  >
                    <img
                      className="h-8 w-auto max-w-[150px] object-contain grayscale dark:invert max-md:h-7"
                      src={entry.logo}
                      alt={entry.name}
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="absolute bottom-8 left-12 right-12 flex flex-wrap justify-end gap-[8px_18px] text-text-muted text-[13px] font-medium leading-[1.1] font-body max-3xl:left-8 max-3xl:right-8 max-3xl:bottom-6 max-md:left-5 max-md:right-5 max-md:bottom-5 max-md:justify-center max-md:text-center" aria-label="Copyright">
          <span>{universityConfig.branding.loginFooterLine}</span>
          {repoUrl ? (
            <a className="text-text-muted underline underline-offset-2 hover:text-text" href={repoUrl} target="_blank" rel="noreferrer">Code source</a>
          ) : null}
        </footer>
      </div>
    </section>
  )
}

export default LoginPage
