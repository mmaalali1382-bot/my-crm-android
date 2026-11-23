
import { LocalNotifications } from '@capacitor/local-notifications'

export type FollowUpNotification = {
  id: number
  customerName: string
  topic: string
  dueDate: string
  status: string
}

export async function syncFollowUpNotifications(
  items: FollowUpNotification[]
): Promise<void> {
  try {
    let permission = await LocalNotifications.checkPermissions()

    if (permission.display !== 'granted') {
      permission = await LocalNotifications.requestPermissions()
    }

    if (permission.display !== 'granted') {
      console.warn('اجازه نمایش اعلان داده نشد.')
      return
    }

    const pending = await LocalNotifications.getPending()

const crmNotifications = pending.notifications.filter(
  item => item.title === 'یادآوری پیگیری مشتری'
)

if (crmNotifications.length > 0) {
  await LocalNotifications.cancel({
    notifications: crmNotifications.map(item => ({
      id: item.id
    }))
  })
}

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const notifications = items
      .filter(item => item.status === 'pending' && item.dueDate)
      .map(item => {
        const [year, month, day] = item.dueDate
          .split('-')
          .map(Number)

        const at = new Date(year, month - 1, day, 9, 0, 0)

        if (Number.isNaN(at.getTime()) || at < today) {
          return null
        }

        if (at.getTime() <= Date.now()) {
          at.setTime(Date.now() + 60 * 1000)
        }

        return {
          id: item.id,
          title: 'یادآوری پیگیری مشتری',
          body: `${item.customerName || 'مشتری'}: ${item.topic}`,
          schedule: { at },
          smallIcon: 'ic_launcher'
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch (error) {
    console.error('خطا در تنظیم اعلان‌های پیگیری:', error)
  }
}
