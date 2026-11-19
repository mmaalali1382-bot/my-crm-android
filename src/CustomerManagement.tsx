
import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Pencil,
  Trash2,
  Building2,
  FileText,
  CalendarDays,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

import {
  getCustomerDetails,
  type CustomerDetails
} from './db/customerDetails'

type Customer = {
  id: number
  name: string
  mobile: string
  company: string
  stage: string
  notes: string
}

type Props = {
  customers: Customer[]
  query: string
  onQueryChange: (value: string) => void
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

const today = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const money = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(value)

const priorityRank: Record<string, number> = {
  فوری: 0,
  زیاد: 1,
  متوسط: 2,
  کم: 3
}

export default function CustomerManagement({
  customers,
  query,
  onQueryChange,
  onEdit,
  onDelete
}: Props) {
  const [details, setDetails] = useState<
    Record<number, CustomerDetails>
  >({})

  const [filterType, setFilterType] = useState('همه')
  const [sortBy, setSortBy] = useState('priority')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadDetails() {
      setDetailsLoading(true)

      try {
        const results = await Promise.all(
          customers.map(async customer => ({
            id: customer.id,
            details: await getCustomerDetails(customer.id)
          }))
        )

        if (!active) return

        const next: Record<number, CustomerDetails> = {}

        results.forEach(item => {
          if (item.details) {
            next[item.id] = item.details
          }
        })

        setDetails(next)
      } catch (error) {
        console.error(error)
      } finally {
        if (active) {
          setDetailsLoading(false)
        }
      }
    }

    loadDetails()

    return () => {
      active = false
    }
  }, [customers])

  const filteredCustomers = useMemo(() => {
    const result = customers.filter(customer => {
      const customerType =
        details[customer.id]?.customerType || 'عادی'

      const matchesType =
        filterType === 'همه' || customerType === filterType

      const searchText = (
        customer.name +
        customer.mobile +
        customer.company
      ).toLowerCase()

      const matchesSearch =
        searchText.includes(query.toLowerCase())

      return matchesType && matchesSearch
    })

    result.sort((a, b) => {
      const aDetails = details[a.id]
      const bDetails = details[b.id]

      if (sortBy === 'priority') {
        return (
          (priorityRank[aDetails?.priority || 'متوسط'] ?? 2) -
          (priorityRank[bDetails?.priority || 'متوسط'] ?? 2)
        )
      }

      if (sortBy === 'followUp') {
        const aDate =
          aDetails?.followUpDate || '9999-12-31'

        const bDate =
          bDetails?.followUpDate || '9999-12-31'

        return aDate.localeCompare(bDate)
      }

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'fa')
      }

      return b.id - a.id
    })

    return result
  }, [customers, details, filterType, sortBy, query])

  const overdue = customers.filter(customer => {
    const date = details[customer.id]?.followUpDate

    return Boolean(date && date < today())
  })

  const dueToday = customers.filter(customer =>
    details[customer.id]?.followUpDate === today()
  )

  function dateLabel(value: string) {
    if (!value) return 'تعیین نشده'

    if (value < today()) return 'عقب‌افتاده'

    if (value === today()) return 'امروز'

    return new Date(
      `${value}T12:00:00`
    ).toLocaleDateString('fa-IR')
  }

  function lastContactLabel(value: string) {
    if (!value) return 'ثبت نشده'

    return new Date(
      `${value}T12:00:00`
    ).toLocaleDateString('fa-IR')
  }

  return (
    <section className="customer-management">

      {(overdue.length > 0 || dueToday.length > 0) && (
        <div className="customer-reminder">
          <AlertTriangle size={20} />

          <div>
            <b>یادآوری پیگیری مشتریان</b>

            <p>
              {overdue.length > 0 &&
                `${money(overdue.length)} پیگیری عقب‌افتاده`}

              {overdue.length > 0 &&
                dueToday.length > 0 && ' • '}

              {dueToday.length > 0 &&
                `${money(dueToday.length)} پیگیری برای امروز`}
            </p>
          </div>
        </div>
      )}

      <label className="search">
        <Search size={18} />

        <input
          value={query}
          onChange={event =>
            onQueryChange(event.target.value)
          }
          placeholder="جستجوی نام، موبایل یا شرکت"
        />
      </label>

      <div className="customer-filters">

        <label>
          نوع مشتری

          <select
            value={filterType}
            onChange={event =>
              setFilterType(event.target.value)
            }
          >
            <option value="همه">همه مشتریان</option>
            <option value="عادی">عادی</option>
            <option value="VIP">VIP</option>
            <option value="عمده">عمده‌فروش</option>
            <option value="همکار">همکار</option>
          </select>
        </label>

        <label>
          مرتب‌سازی

          <select
            value={sortBy}
            onChange={event =>
              setSortBy(event.target.value)
            }
          >
            <option value="priority">اولویت پیگیری</option>
            <option value="followUp">تاریخ پیگیری</option>
            <option value="name">نام مشتری</option>
            <option value="newest">جدیدترین ثبت</option>
          </select>
        </label>

      </div>

      <div className="customer-list-summary">
        {money(filteredCustomers.length)} مشتری

        {detailsLoading &&
          ' • در حال دریافت جزئیات...'}
      </div>

      {filteredCustomers.map(customer => {
        const detail = details[customer.id]

        const isExpanded =
          expandedId === customer.id

        const followUpDate =
          detail?.followUpDate || ''

        const isOverdue = Boolean(
          followUpDate && followUpDate < today()
        )

        const isDueToday =
          followUpDate === today()

        return (
          <article
            className="customer customer-expanded"
            key={customer.id}
          >

            <button
              className="customer-main"
              onClick={() =>
                setExpandedId(
                  isExpanded ? null : customer.id
                )
              }
            >

              <div className="avatar">
                {customer.name.slice(0, 1)}
              </div>

              <div className="customer-info">

                <b>{customer.name}</b>

                <small>{customer.mobile}</small>

                {customer.company && (
                  <small>
                    <Building2 size={12} />
                    {' '}{customer.company}
                  </small>
                )}

                <small>
                  نوع مشتری: {detail?.customerType || 'عادی'}
                </small>

                <small>
                  اولویت: {detail?.priority || 'متوسط'}
                  {' • '}
                  پیگیری: {dateLabel(followUpDate)}
                </small>

              </div>

              <span>
                {isOverdue
                  ? 'عقب‌افتاده'
                  : isDueToday
                    ? 'امروز'
                    : customer.stage}
              </span>

              {isExpanded
                ? <ChevronUp size={17} />
                : <ChevronDown size={17} />}

            </button>

            {isExpanded && (
              <div className="customer-detail-panel">

                <h4>جزئیات مشتری</h4>

                <p>
                  <b>شماره دوم:</b>{' '}
                  {detail?.alternatePhone || 'ثبت نشده'}
                </p>

                <p>
                  <b>شهر:</b>{' '}
                  {detail?.city || 'ثبت نشده'}
                </p>

                <p>
                  <b>شغل:</b>{' '}
                  {detail?.job || 'ثبت نشده'}
                </p>

                <p>
                  <b>منبع آشنایی:</b>{' '}
                  {detail?.leadSource || 'ثبت نشده'}
                </p>

                <p>
                  <b>روش ارتباط:</b>{' '}
                  {detail?.preferredContact || 'ثبت نشده'}
                </p>

                <p>
                  <b>بودجه:</b>{' '}
                  {money(detail?.budget || 0)} تومان
                </p>

                <p>
                  <b>آخرین ارتباط:</b>{' '}
                  {lastContactLabel(detail?.lastContact || '')}
                </p>

                <p>
                  <b>تاریخ پیگیری بعدی:</b>{' '}
                  {dateLabel(followUpDate)}
                </p>

                <p>
                  <b>علایق و نیازها:</b>{' '}
                  {detail?.interests || 'ثبت نشده'}
                </p>

                <p>
                  <b>محصولات موردنظر:</b>{' '}
                  {detail?.productsWanted || 'ثبت نشده'}
                </p>

                <p>
                  <b>نتیجه مذاکره:</b>{' '}
                  {detail?.negotiationResult || 'ثبت نشده'}
                </p>

                {customer.notes && (
                  <p>
                    <FileText size={14} />
                    {' '}{customer.notes}
                  </p>
                )}

                <div className="customer-actions">

                  <button onClick={() => onEdit(customer)}>
                    <Pencil size={16} />
                    ویرایش اطلاعات
                  </button>

                  <button onClick={() => onDelete(customer)}>
                    <Trash2 size={16} />
                    حذف مشتری
                  </button>

                </div>

              </div>
            )}

            {!isExpanded && (
              <div className="customer-actions">

                <button onClick={() => onEdit(customer)}>
                  <Pencil size={16} />
                  ویرایش
                </button>

                <button onClick={() => onDelete(customer)}>
                  <Trash2 size={16} />
                  حذف
                </button>

              </div>
            )}

          </article>
        )
      })}

      {!filteredCustomers.length && (
        <p className="empty">
          مشتری‌ای با این مشخصات پیدا نشد.
        </p>
      )}

      <div className="customer-list-footer">
        <CalendarDays size={15} />
        تاریخ‌ها بر اساس تقویم دستگاه نمایش داده می‌شوند.
      </div>

    </section>
  )
}
