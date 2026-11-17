
import { useState } from 'react'
import {
  Menu, X, Home, Users, Package, ClipboardList,
  CalendarDays, Wallet, ShieldCheck, ChevronLeft
} from 'lucide-react'

type NavigationDrawerProps = {
  activeTab: string
  onNavigate: (tab: string) => void
}

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

  function selectPage(tab: string) {
    onNavigate(tab)
    setOpen(false)
  }

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
