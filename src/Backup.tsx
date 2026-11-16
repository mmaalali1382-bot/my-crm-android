
import { useRef, useState } from 'react'
import { Download, Upload, ShieldCheck, FileText } from 'lucide-react'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import {
  exportDatabaseBackup,
  restoreDatabaseBackup
} from './db/database'

export default function Backup() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function createBackup() {
    try {
      setLoading(true)
      setMessage('')
      setError('')

      const data = await exportDatabaseBackup()
      const fileName = `CRM-Backup-${new Date().toISOString().slice(0, 10)}.json`

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      })

      await Share.share({
        title: 'نسخه پشتیبان CRM',
        text: 'فایل پشتیبان اطلاعات CRM',
        url: savedFile.uri,
        dialogTitle: 'ذخیره فایل پشتیبان'
      })

      setMessage(
        'فایل پشتیبان آماده است. در پنجره بازشده گزینه Files یا ذخیره در دستگاه را انتخاب کن.'
      )
    } catch (e) {
      console.error(e)
      setError('تهیه یا اشتراک‌گذاری فایل پشتیبان انجام نشد. دوباره تلاش کن.')
    } finally {
      setLoading(false)
    }
  }

  async function restoreBackup(file?: File) {
    if (!file) return

    const confirmed = window.confirm(
      'توجه: بازیابی، اطلاعات فعلی CRM را با اطلاعات فایل پشتیبان جایگزین می‌کند. ادامه می‌دهی؟'
    )

    if (!confirmed) {
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    try {
      setLoading(true)
      setMessage('')
      setError('')

      const content = await file.text()
      await restoreDatabaseBackup(content)

      setMessage(
        'بازیابی اطلاعات با موفقیت انجام شد. برنامه را یک بار ببند و دوباره باز کن.'
      )
    } catch (e) {
      console.error(e)
      setError(
        'بازیابی انجام نشد. فایل پشتیبان معتبر نیست یا مشکلی در دیتابیس وجود دارد.'
      )
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <main style={{ padding: 16, direction: 'rtl' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>
          امنیت اطلاعات کسب‌وکار
        </div>
        <h2 style={{ color: '#172b4d', margin: '8px 0' }}>
          پشتیبان‌گیری اطلاعات
        </h2>
        <p style={{ color: '#667085', lineHeight: 1.9 }}>
          از اطلاعات مشتریان، محصولات، سفارش‌ها، پرداخت‌ها و هزینه‌ها نسخه پشتیبان تهیه کن.
        </p>
      </div>

      <section style={{
        background: '#f2f6ff',
        padding: 18,
        borderRadius: 14,
        marginBottom: 16
      }}>
        <ShieldCheck size={30} color="#244b85" />
        <h3 style={{ color: '#172b4d' }}>تهیه نسخه پشتیبان</h3>
        <p style={{ color: '#52627a', lineHeight: 1.8 }}>
          فایل پشتیبان ساخته می‌شود و پنجره ذخیره یا اشتراک‌گذاری اندروید باز می‌شود.
        </p>
        <button
          onClick={createBackup}
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            border: 0,
            borderRadius: 10,
            background: '#193b70',
            color: 'white',
            fontWeight: 700
          }}
        >
          <Download size={17} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          {loading ? 'لطفاً صبر کن...' : 'تهیه نسخه پشتیبان'}
        </button>
      </section>

      <section style={{
        background: '#f7f8fa',
        padding: 18,
        borderRadius: 14
      }}>
        <FileText size={30} color="#244b85" />
        <h3 style={{ color: '#172b4d' }}>بازیابی نسخه پشتیبان</h3>
        <p style={{ color: '#52627a', lineHeight: 1.8 }}>
          فایل JSON پشتیبان قبلی را انتخاب کن تا اطلاعات آن بازیابی شود.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          disabled={loading}
          onChange={e => restoreBackup(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            border: '1px solid #193b70',
            borderRadius: 10,
            background: 'white',
            color: '#193b70',
            fontWeight: 700
          }}
        >
          <Upload size={17} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          انتخاب فایل پشتیبان
        </button>
      </section>

      {message && (
        <p style={{ color: '#18794e', marginTop: 16, lineHeight: 1.8 }}>
          {message}
        </p>
      )}

      {error && (
        <p style={{ color: '#b42318', marginTop: 16, lineHeight: 1.8 }}>
          {error}
        </p>
      )}

      <p style={{ color: '#8a5360', fontSize: 12, lineHeight: 1.9, marginTop: 20 }}>
        فایل پشتیبان حاوی اطلاعات محرمانه کسب‌وکار است. آن را در جای امن نگهداری کن.
      </p>
    </main>
  )
}
