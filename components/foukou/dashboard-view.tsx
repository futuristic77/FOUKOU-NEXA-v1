'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  FileCheck2,
  GraduationCap,
  Megaphone,
  MessageCircle,
  TrendingUp,
  UserPlus,
  UsersRound,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  demoActivities,
  enrollmentByYear,
  levelDistribution,
} from './data'
import type { ViewKey } from './types'
import { BrandMaskArt } from './brand-mark'
import { DemoNotice } from './shared'

const enrollmentConfig = {
  students: { label: 'Élèves', color: 'var(--chart-1)' },
} satisfies ChartConfig

const distributionConfig = {
  sixth: { label: '6e', color: 'var(--chart-1)' },
  fifth: { label: '5e', color: 'var(--chart-2)' },
  fourth: { label: '4e', color: 'var(--chart-3)' },
  third: { label: '3e', color: 'var(--chart-4)' },
  second: { label: '2nde', color: 'var(--chart-5)' },
  first: { label: '1ère', color: 'var(--chart-6)' },
  final: { label: 'Tle', color: 'var(--chart-7)' },
} satisfies ChartConfig

const distribution = levelDistribution.map((level, index) => ({
  ...level,
  fill: `var(--color-${['sixth', 'fifth', 'fourth', 'third', 'second', 'first', 'final'][index]})`,
}))

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
  detail,
  emphasis = false,
}: {
  icon: typeof UsersRound
  label: string
  value: string
  delta: string
  detail: string
  emphasis?: boolean
}) {
  return (
    <Card className={`metric-card${emphasis ? ' metric-card-emphasis' : ''}`}>
      <CardHeader className="metric-card-header">
        <span className="metric-icon"><Icon aria-hidden="true" /></span>
        <span className="metric-label">{label}</span>
      </CardHeader>
      <CardContent className="metric-card-content">
        <strong className="metric-value">{value}</strong>
        <div className="metric-foot">
          <span className="metric-delta"><TrendingUp aria-hidden="true" /> {delta}</span>
          <span className="metric-detail">{detail}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardView({
  onNavigate,
  studentTotal,
  classTotal,
  teacherTotal,
}: {
  onNavigate: (view: ViewKey) => void
  studentTotal: number
  classTotal: number
  teacherTotal: number
}) {
  const [year, setYear] = useState<keyof typeof enrollmentByYear>('2026–2027')
  const chartData = useMemo(() => enrollmentByYear[year], [year])
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const shortcuts: { label: string; icon: typeof UserPlus; view: ViewKey }[] = [
    { label: 'Élèves et classes', icon: UserPlus, view: 'students' },
    { label: 'Saisir une note', icon: FileCheck2, view: 'grades' },
    { label: 'Espace enseignants', icon: GraduationCap, view: 'teachers' },
    { label: 'Présences et planning', icon: CalendarDays, view: 'schedule' },
  ]

  return (
    <div className="dashboard-view">
      <Card className="welcome-panel">
        <div className="welcome-panel-shade" aria-hidden="true" />
        <div className="welcome-copy">
          <p className="welcome-eyebrow">BONJOUR, M. KONÉ</p>
          <h1>Bienvenue sur <span className="welcome-brand-name">FOUKOU-NEXA</span></h1>
          <p className="welcome-description">Voici un aperçu de la vie de votre établissement.</p>
          <div className="welcome-date">
            <CalendarDays aria-hidden="true" />
            <span>{dateLabel} <span className="welcome-date-separator">·</span> Année scolaire 2026–2027</span>
          </div>
          <span className="welcome-demo-label">DÉMONSTRATION · DONNÉES EXEMPLES</span>
        </div>
        <BrandMaskArt className="welcome-mask" />
        <div className="welcome-signature" aria-hidden="true">
          <span>APPRENDRE</span>
          <span>GRANDIR</span>
          <span>DEMAIN</span>
          <i />
        </div>
      </Card>

      <div className="dashboard-metrics" aria-label="Indicateurs scolaires de démonstration">
        <MetricCard icon={UsersRound} label="Élèves inscrits" value={studentTotal.toLocaleString('fr-FR')} delta="+12 %" detail="vs. l’année précédente" emphasis />
        <MetricCard icon={GraduationCap} label="Classes" value={String(classTotal)} delta="+2" detail="nouvelles classes" />
        <MetricCard icon={UserPlus} label="Enseignants" value={String(teacherTotal)} delta="+3" detail="sur l’année" />
        <MetricCard icon={Check} label="Taux de présence" value="96 %" delta="+4 %" detail="vs. le mois dernier" />
      </div>

      <DemoNotice>Jeu de données fictif fourni pour illustrer l’interface. Aucune statistique ne provient d’un établissement connecté.</DemoNotice>

      <div className="dashboard-grid">
        <Card className="dashboard-panel activity-panel">
          <CardHeader className="panel-heading">
            <div className="panel-title-wrap">
              <span className="panel-title-icon"><Clock3 aria-hidden="true" /></span>
              <CardTitle>Activité récente</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('communication')}>
              Voir tout <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="activity-list" role="list">
            {demoActivities.map((activity) => {
              const Icon = activity.kind === 'student'
                ? UserPlus
                : activity.kind === 'grade'
                  ? FileCheck2
                  : activity.kind === 'absence'
                    ? Clock3
                    : activity.kind === 'message'
                      ? MessageCircle
                      : CalendarDays
              return (
                <div className="activity-row" role="listitem" key={activity.id}>
                  <span className={`activity-icon activity-icon-${activity.kind}`}><Icon aria-hidden="true" /></span>
                  <div className="activity-description">
                    <strong>{activity.title}</strong>
                    <span>{activity.detail}</span>
                  </div>
                  <time>{activity.time}</time>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="analytics-stack">
          <Card className="dashboard-panel enrollment-panel">
            <CardHeader className="panel-heading">
              <div className="panel-title-wrap">
                <span className="panel-title-icon"><TrendingUp aria-hidden="true" /></span>
                <CardTitle>Évolution des effectifs</CardTitle>
              </div>
              <label className="visually-hidden" htmlFor="dashboard-year">Période du graphique</label>
              <select id="dashboard-year" className="compact-select" value={year} onChange={(event) => setYear(event.target.value as keyof typeof enrollmentByYear)}>
                {Object.keys(enrollmentByYear).map((option) => <option key={option}>{option}</option>)}
              </select>
            </CardHeader>
            <CardContent>
              <ChartContainer config={enrollmentConfig} className="enrollment-chart" role="img" aria-label={`Courbe de démonstration de l’évolution des effectifs pour ${year}`}>
                <AreaChart accessibilityLayer data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="enrollment-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-students)" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="var(--color-students)" stopOpacity={0.015} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 5" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={9} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={6} width={46} domain={[800, 'dataMax + 80']} tickFormatter={(value) => `${(Number(value) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}k`} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Area dataKey="students" type="monotone" stroke="var(--color-students)" strokeWidth={2.5} fill="url(#enrollment-fill)" activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ChartContainer>
              <p className="chart-caption">Effectifs mensuels · valeurs fictives</p>
            </CardContent>
          </Card>

          <Card className="dashboard-panel distribution-panel">
            <CardHeader className="panel-heading compact-panel-heading">
              <div className="panel-title-wrap">
                <span className="panel-title-icon"><GraduationCap aria-hidden="true" /></span>
                <CardTitle>Répartition par niveau</CardTitle>
              </div>
              <span className="small-demo-tag">DÉMO</span>
            </CardHeader>
            <CardContent className="distribution-content">
              <div className="donut-wrap">
                <ChartContainer config={distributionConfig} className="donut-chart" role="img" aria-label="Répartition fictive des élèves par niveau scolaire">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={distribution} dataKey="students" nameKey="level" innerRadius={53} outerRadius={76} paddingAngle={2} stroke="none" />
                  </PieChart>
                </ChartContainer>
                <div className="donut-center" aria-hidden="true">
                  <strong>{studentTotal.toLocaleString('fr-FR')}</strong>
                  <span>élèves</span>
                </div>
              </div>
              <ul className="distribution-legend">
                {distribution.map((item) => (
                  <li key={item.level}>
                    <span className="legend-dot" style={{ backgroundColor: item.fill }} aria-hidden="true" />
                    <span>{item.level}</span>
                    <strong>{Math.round((item.students / 1248) * 100)} %</strong>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <aside className="dashboard-aside" aria-label="Raccourcis et informations">
          <Card className="dashboard-panel shortcuts-panel">
            <CardHeader className="panel-heading">
              <div className="panel-title-wrap">
                <span className="panel-title-icon"><Zap aria-hidden="true" /></span>
                <CardTitle>Raccourcis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="shortcuts-grid">
              {shortcuts.map(({ label, icon: Icon, view }) => (
                <button type="button" key={label} className="shortcut-button" onClick={() => onNavigate(view)}>
                  <span><Icon aria-hidden="true" /></span>
                  <strong>{label}</strong>
                  <ArrowRight aria-hidden="true" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="brand-note-card">
            <div className="brand-note-content">
              <span className="brand-note-kicker">FOUKOU-NEXA · ESPACE SCOLAIRE</span>
              <p>Une éducation connectée<br />à vos ambitions.</p>
              <span className="brand-note-rule" aria-hidden="true" />
              <span className="brand-note-slogan">APPRENDRE · GRANDIR · DEMAIN</span>
            </div>
            <div className="brand-note-orbit" aria-hidden="true" />
          </Card>

          <Card className="dashboard-panel information-panel">
            <CardHeader className="panel-heading">
              <div className="panel-title-wrap">
                <span className="panel-title-icon"><Megaphone aria-hidden="true" /></span>
                <CardTitle>Informations</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('communication')}>
                Voir tout <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent className="information-list">
              <div className="information-item">
                <span className="information-icon"><CalendarDays aria-hidden="true" /></span>
                <div>
                  <strong>Réunion parents-professeurs</strong>
                  <span>Samedi 7 novembre · 08h00</span>
                  <span className="event-pill">Événement · démo</span>
                </div>
              </div>
              <div className="information-item information-item-secondary">
                <span className="information-icon"><Clock3 aria-hidden="true" /></span>
                <div>
                  <strong>Conseil de classe · 6e A</strong>
                  <span>Jeudi 5 novembre · 16h30</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
