import { initializeDatabase } from './database'

export type GoalSettings = {
  monthlyTarget: number
  dailyTarget: number
}

async function ensureGoalsTable() {
  const db = await initializeDatabase()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    )
  `)

  await db.run(
    `INSERT OR IGNORE INTO app_settings (setting_key, setting_value)
     VALUES (?, ?)`,
    ['monthly_target', '500000000']
  )

  await db.run(
    `INSERT OR IGNORE INTO app_settings (setting_key, setting_value)
     VALUES (?, ?)`,
    ['daily_target', '0']
  )

  return db
}

export async function getGoalSettings(): Promise<GoalSettings> {
  const db = await ensureGoalsTable()

  const result = await db.query(
    `SELECT setting_key, setting_value
     FROM app_settings
     WHERE setting_key IN ('monthly_target', 'daily_target')`
  )

  const values = result.values || []

  const monthly = values.find(
    item => item.setting_key === 'monthly_target'
  )

  const daily = values.find(
    item => item.setting_key === 'daily_target'
  )

  return {
    monthlyTarget: Math.max(
      0,
      Number(monthly?.setting_value || 500000000)
    ),
    dailyTarget: Math.max(
      0,
      Number(daily?.setting_value || 0)
    )
  }
}

export async function saveGoalSettings(
  monthlyTarget: number,
  dailyTarget: number
): Promise<void> {
  if (
    !Number.isFinite(monthlyTarget) ||
    !Number.isFinite(dailyTarget) ||
    monthlyTarget < 0 ||
    dailyTarget < 0
  ) {
    throw new Error('مبلغ هدف‌ها معتبر نیست.')
  }

  const db = await ensureGoalsTable()

  await db.run(
    `INSERT OR REPLACE INTO app_settings (setting_key, setting_value)
     VALUES (?, ?)`,
    ['monthly_target', String(Math.floor(monthlyTarget))]
  )

  await db.run(
    `INSERT OR REPLACE INTO app_settings (setting_key, setting_value)
     VALUES (?, ?)`,
    ['daily_target', String(Math.floor(dailyTarget))]
  )
}
