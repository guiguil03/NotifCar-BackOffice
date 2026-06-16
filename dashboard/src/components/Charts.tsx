import React from 'react'
import {
  VictoryArea,
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryPie,
  VictoryTooltip,
} from 'victory'

const COLOR = '#2633E1'
const LIGHT = '#EEF0FD'

const axisStyle = {
  axis: { stroke: 'none' },
  ticks: { stroke: 'none' },
  grid: { stroke: '#F1F5F9', strokeDasharray: '4' },
  tickLabels: { fill: '#94A3B8', fontSize: 11, fontFamily: 'inherit', padding: 6 },
}

const tooltip = (
  <VictoryTooltip
    style={{ fontSize: 11, fontFamily: 'inherit', fill: '#0F172A' }}
    flyoutStyle={{ fill: 'white', stroke: '#E2E8F0', strokeWidth: 1 }}
    flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
    cornerRadius={6}
  />
)

const EmptyState = ({ title }: { title: string }) => (
  <div className="chart-container">
    <h3>{title}</h3>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: '#CBD5E1', fontSize: '0.9rem' }}>
      Aucune donnée disponible
    </div>
  </div>
)

/* ─── Signalisations : courbe lissée ─── */
export const SignalizationsChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) return <EmptyState title="Signalisations — 7 derniers jours" />

  const series = data.map((d, i) => ({ x: i + 1, y: d.total, label: `${d.dayName}\n${d.total} signalisations` }))

  return (
    <div className="chart-container">
      <h3>Signalisations — 7 derniers jours</h3>
      <VictoryChart height={260} padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
        <VictoryAxis tickValues={data.map((_, i) => i + 1)} tickFormat={(_, i) => data[i]?.dayName ?? ''} style={axisStyle} />
        <VictoryAxis dependentAxis style={axisStyle} />
        <VictoryArea
          data={series}
          interpolation="monotoneX"
          style={{
            data: { stroke: COLOR, strokeWidth: 2.5, fill: LIGHT },
          }}
          labelComponent={tooltip}
        />
      </VictoryChart>
    </div>
  )
}

/* ─── Types de signalisations : barres ─── */
export const SignalizationTypesChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) return <EmptyState title="Types de signalisations" />

  const series = data.map((d, i) => ({ x: i + 1, y: d.total, label: `${d.type}\n${d.total}` }))

  return (
    <div className="chart-container">
      <h3>Types de signalisations</h3>
      <VictoryChart height={260} domainPadding={20} padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
        <VictoryAxis tickValues={data.map((_, i) => i + 1)} tickFormat={(_, i) => data[i]?.type ?? ''} style={{ ...axisStyle, tickLabels: { ...axisStyle.tickLabels, fontSize: 10 } }} />
        <VictoryAxis dependentAxis style={axisStyle} />
        <VictoryBar
          data={series}
          style={{ data: { fill: COLOR } }}
          cornerRadius={{ top: 4 }}
          barWidth={28}
          labelComponent={tooltip}
        />
      </VictoryChart>
    </div>
  )
}

/* ─── Marques : donut minimaliste ─── */
export const BrandsPieChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) return <EmptyState title="Répartition des marques" />

  const top = data.slice(0, 6)
  const shades = ['#2633E1', '#4A56E8', '#6E79EE', '#929CF4', '#B6BCF9', '#DADCFC']
  const pieData = top.map((d) => ({ x: d.brand, y: d.count, label: `${d.brand}\n${d.count}` }))

  return (
    <div className="chart-container">
      <h3>Répartition des marques</h3>
      <VictoryPie
        data={pieData}
        colorScale={shades}
        height={260}
        padding={50}
        innerRadius={70}
        padAngle={2}
        style={{ labels: { fontSize: 0 } }}
        labelComponent={tooltip}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: -8 }}>
        {top.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#64748B' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: shades[i], flexShrink: 0 }} />
            {d.brand}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Engagement : courbe ─── */
export const EngagementChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) return <EmptyState title="Activité par heure" />

  const series = data.map((d, i) => ({ x: i + 1, y: d.messages, label: `${d.hour}\n${d.messages} messages` }))

  return (
    <div className="chart-container">
      <h3>Activité par heure</h3>
      <VictoryChart height={260} padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
        <VictoryAxis tickValues={data.map((_, i) => i + 1)} tickFormat={(_, i) => data[i]?.hour ?? ''} style={{ ...axisStyle, tickLabels: { ...axisStyle.tickLabels, fontSize: 9 } }} />
        <VictoryAxis dependentAxis style={axisStyle} />
        <VictoryArea
          data={series}
          interpolation="monotoneX"
          style={{ data: { stroke: COLOR, strokeWidth: 2.5, fill: LIGHT } }}
          labelComponent={tooltip}
        />
      </VictoryChart>
    </div>
  )
}

/* ─── Croissance : cartes métriques ─── */
export const GrowthChart: React.FC<{ data: any }> = ({ data }) => {
  const weekVal  = data?.vehiclesThisWeek  ?? 0
  const monthVal = data?.vehiclesThisMonth ?? 0
  const weekG    = data?.weeklyGrowth      ?? 0
  const monthG   = data?.monthlyGrowth     ?? 0

  const items = [
    { label: 'Cette semaine', sublabel: '7 derniers jours',  value: weekVal,  growth: weekG  },
    { label: 'Ce mois',       sublabel: '30 derniers jours', value: monthVal, growth: monthG },
  ]

  return (
    <div className="chart-container">
      <h3>Croissance des véhicules</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
        {items.map((item, i) => {
          const isPositive = item.growth >= 0
          const pct = Math.min(Math.abs(item.growth), 100)
          return (
            <div key={i} style={{
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#CBD5E1', marginTop: 2 }}>{item.sublabel}</div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '3px 9px', borderRadius: 100,
                  fontSize: '0.75rem', fontWeight: 700,
                  background: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  color: isPositive ? '#10B981' : '#EF4444',
                  border: `1px solid ${isPositive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  {isPositive ? '↑' : '↓'} {Math.abs(item.growth)}%
                </span>
              </div>

              <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {item.value}
                <span style={{ fontSize: '1rem', fontWeight: 500, color: '#94A3B8', marginLeft: 6 }}>véhicules</span>
              </div>

              <div style={{ width: '100%', height: 4, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: isPositive ? COLOR : '#EF4444',
                  borderRadius: 99,
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
