
import { useEffect, useState } from 'react'
import {
  Menu, X, Home, Users, Package, ClipboardList,
  CalendarDays, Wallet, ShieldCheck, ChevronLeft,
  Sun, Moon, Monitor
} from 'lucide-react'

type NavigationDrawerProps = {
  activeTab: string
  onNavigate: (tab: string) => void
}

type ThemeMode = 'light' | 'dark' | 'system'

const items = [
  { label: 'خانه', icon: Home },
  { label: 'مشتریان', icon: Users },
  { label: 'محصولات', icon: Package },
  { label: 'سفارش‌ها', icon: ClipboardList },
  { label: 'پیگیری‌ها', icon: CalendarDays },
  { label: 'پرداخت‌ها', icon: Wallet },
  { label: 'پشتیبان‌گیری', icon: ShieldCheck }
]

export default function NavigationDrawer({
  activeTab,
  onNavigate
}: NavigationDrawerProps) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('crm-theme')
    return saved === 'light' || saved === 'dark' || saved === 'system'
      ? saved
      : 'system'
  })

  useEffect(() => {
    const applyTheme = () => {
      const isDark = theme === 'dark' ||
        (theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)

      document.documentElement.setAttribute(
        'data-theme',
        isDark ? 'dark' : 'light'
      )
    }

    localStorage.setItem('crm-theme', theme)
    applyTheme()

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', applyTheme)

    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  function selectPage(tab: string) {
    onNavigate(tab)
    setOpen(false)
  }

  const themeOptions = [
    { value: 'light' as ThemeMode, label: 'روشن', icon: Sun },
    { value: 'dark' as ThemeMode, label: 'تاریک', icon: Moon },
    { value: 'system' as ThemeMode, label: 'سیستم', icon: Monitor }
  ]

  return (
    <>
      <button
        className="icon-btn"
        aria-label="باز کردن منو"
        onClick={() => setOpen(true)}
      >
        <Menu size={23} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,18,35,.55)',
            zIndex: 20
          }}
        >
          <aside
            dir="rtl"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 'min(300px, 85vw)',
              height: '100%',
              background: 'var(--drawer-bg, #fff)',
              color: 'var(--drawer-text, #17233e)',
              padding: 18,
              boxShadow: '-5px 0 25px rgba(0,0,0,.15)',
              overflowY: 'auto'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 20,
              borderBottom: '1px solid var(--drawer-border, #e8ebf1)'
            }}>
              <div>
                <b style={{fontSize: 18}}>CRM شخصی</b>
                <small style={{display:'block', opacity:.65, marginTop:5}}>
                  منوی دسترسی سریع
                </small>
              </div>
              <button
                className="icon-btn"
                aria-label="بستن منو"
                onClick={() => setOpen(false)}
              >
                <X size={21}/>
              </button>
            </div>

            <div style={{display:'grid', gap:7, marginTop:18}}>
              {items.map(({label, icon: Icon}) => (
                <button
                  key={label}
                  onClick={() => selectPage(label)}
                  style={{
                    display:'flex',
                    alignItems:'center',
                    gap:12,
                    width:'100%',
                    padding:'13px 12px',
                    border:0,
                    borderRadius:12,
                    background: activeTab === label
                      ? 'var(--drawer-active, #e9eef9)'
                      : 'transparent',
                    color: activeTab === label
                      ? 'var(--drawer-active-text, #1b315c)'
                      : 'var(--drawer-text, #344054)',
                    font: 'inherit',
                    fontWeight: activeTab === label ? 700 : 500,
                    textAlign:'right'
                  }}
                >
                  <Icon size={20}/>
                  <span style={{flex:1}}>{label}</span>
                  <ChevronLeft size={17}/>
                </button>
              ))}
            </div>

            <div style={{
              marginTop:24,
              paddingTop:18,
              borderTop:'1px solid var(--drawer-border, #e8ebf1)'
            }}>
              <b style={{fontSize:14}}>نمایش برنامه</b>
              <small style={{display:'block',opacity:.65,marginTop:5}}>
                حالت دلخواه خودت را انتخاب کن
              </small>

              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(3, 1fr)',
                gap:7,
                marginTop:12
              }}>
                {themeOptions.map(({value,label,icon:Icon}) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    style={{
                      display:'grid',
                      justifyItems:'center',
                      gap:6,
                      padding:'12px 4px',
                      borderRadius:10,
                      border: theme === value
                        ? '2px solid #5278b8'
                        : '1px solid var(--drawer-border, #e8ebf1)',
                      background: theme === value
                        ? 'var(--drawer-active, #e9eef9)'
                        : 'transparent',
                      color:'var(--drawer-text, #344054)',
                      font:'inherit',
                      fontSize:12
                    }}
                  >
                    <Icon size={19}/>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              marginTop:25,
              padding:12,
              borderRadius:12,
              background:'var(--drawer-active, #f4f6fa)',
              fontSize:11,
              opacity:.75,
              lineHeight:2
            }}>
              مدیریت مشتریان، فروش و ارتباط با مشتری
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
