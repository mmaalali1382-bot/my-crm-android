
import { useEffect, useState } from 'react'
import {
  addCustomer,
  addOrder,
  addPayment,
  getCustomers,
  getProducts,
  type CustomerRecord,
  type ProductRecord
} from './db/database'
import {
  getCustomerDetails,
  saveCustomerDetails
} from './db/customerDetails'
import { addCustomOrder } from './db/customOrders'

const digits = (s: string) =>
  s.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
   .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))

const money = (s: string) =>
  Number(digits(s).replace(/[^0-9]/g, '')) || 0

export default function SmartEntry() {
  const [raw, setRaw] = useState('')
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [productId, setProductId] = useState('')
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [paid, setPaid] = useState('0')
  const [method, setMethod] = useState('کارت‌به‌کارت')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const [c, p] = await Promise.all([
      getCustomers(),
      getProducts()
    ])
    setCustomers(c)
    setProducts(p)
  }

  useEffect(() => {
    load().catch(e => setMessage(String(e)))
  }, [])

  const isCustom = productId === 'custom'

  const selectedProduct = products.find(
    p => String(p.id) === productId
  )

  const existing = customers.find(
    c => c.phone === digits(phone.trim())
  )

  const qty = Number(quantity) || 0

  const unitPrice = isCustom
    ? money(customPrice)
    : selectedProduct?.price || 0

  const total = unitPrice * qty

  function analyze() {
    const t = digits(raw)
    const mobile = t.match(/09\d{9}/)?.[0] || ''

    setPhone(mobile)

    const amount = t.match(
      /(?:پرداخت|واریز|بیعانه|نقدی)\D{0,12}([\d,]+)/ 
    )

    if (amount) setPaid(String(money(amount[1])))

    const q = t.match(/(\d+)\s*(?:عدد|تا|بسته)/)
    if (q) setQuantity(q[1])

const addressMatch = t.match(
  /(?:آدرس|نشانی)\s*[:：]?\s*(.+?)(?=\s*(?:پرداخت|واریز|بیعانه|موبایل|تلفن|شماره|محصول|سفارش)(?:\s|[:：]|$)|$)/i
)

    if (addressMatch) {
      setAddress(addressMatch[1].trim().replace(/[،,]+$/, ''))
    }

    const found = products.find(p => t.includes(p.name))

    if (found) {
      setProductId(String(found.id))
    }

    const withoutPhone = t.replace(/09\d{9}/, '').trim()
    const first = withoutPhone.split(/[،,\n]/)[0].trim()

    if (first && !products.some(p => first.includes(p.name))) {
      setName(first.slice(0, 45))
    }

    setMessage('اطلاعات استخراج شد؛ موارد را بررسی کن.')
  }

  async function submit() {
    const count = Number(quantity)
    const payment = money(paid)

    if (!name.trim() && !existing) {
      setMessage('نام مشتری را وارد کن.')
      return
    }

    if (!/^09\d{9}$/.test(digits(phone))) {
      setMessage('شماره موبایل معتبر نیست.')
      return
    }

    if (!Number.isInteger(count) || count < 1) {
      setMessage('تعداد باید حداقل یک باشد.')
      return
    }

    if (isCustom) {
      if (!customName.trim()) {
        setMessage('نام پک یا محصول متفرقه را وارد کن.')
        return
      }

      if (unitPrice <= 0) {
        setMessage('قیمت هر عدد را وارد کن.')
        return
      }
    } else {
      if (!selectedProduct) {
        setMessage('محصول را انتخاب کن.')
        return
      }

      if (count > selectedProduct.stock) {
        setMessage('موجودی محصول کافی نیست.')
        return
      }
    }

    if (
      !Number.isFinite(payment) ||
      payment < 0 ||
      payment > total
    ) {
      setMessage('مبلغ پرداخت معتبر نیست.')
      return
    }

    const customerName = existing?.name || name.trim()
    const itemName = isCustom
      ? customName.trim()
      : selectedProduct!.name

    const confirmed = window.confirm(
      `تأیید ثبت اطلاعات؟\n` +
      `مشتری: ${customerName}\n` +
      `شماره: ${phone}\n` +
      `آدرس: ${address.trim() || 'ثبت نشده'}\n` +
      `نوع: ${isCustom ? 'پک یا محصول متفرقه' : 'محصول انبار'}\n` +
      `نام: ${itemName}\n` +
      `تعداد: ${count}\n` +
      `قیمت هر عدد: ${unitPrice.toLocaleString('fa-IR')} تومان\n` +
      `مبلغ سفارش: ${total.toLocaleString('fa-IR')} تومان\n` +
      `پرداخت: ${payment.toLocaleString('fa-IR')} تومان`
    )

    if (!confirmed) return

    setBusy(true)
    setMessage('')

    try {
      if (!existing) {
        await addCustomer(name.trim(), digits(phone))
      }

      const freshCustomers = await getCustomers()
      const customer = freshCustomers.find(
        c => c.phone === digits(phone)
      )

      if (!customer) {
        throw new Error('مشتری پیدا نشد.')
      }

      if (address.trim()) {
        const oldDetails = await getCustomerDetails(customer.id)

        await saveCustomerDetails(customer.id, {
          alternatePhone: oldDetails?.alternatePhone || '',
          city: oldDetails?.city || '',
          job: oldDetails?.job || '',
          customerType: oldDetails?.customerType || '',
          leadSource: oldDetails?.leadSource || '',
          preferredContact: oldDetails?.preferredContact || '',
          interests: oldDetails?.interests || '',
          productsWanted: oldDetails?.productsWanted || '',
          budget: oldDetails?.budget || 0,
          lastContact: oldDetails?.lastContact || '',
          negotiationResult: oldDetails?.negotiationResult || '',
          priority: oldDetails?.priority || '',
          followUpDate: oldDetails?.followUpDate || '',
          address: address.trim()
        })
      }

      if (isCustom) {
        await addCustomOrder(
          customer.id,
          customName.trim(),
          count,
          unitPrice,
          0,
          notes
        )
      } else {
        await addOrder(
          customer.id,
          [{
            productId: selectedProduct!.id,
            quantity: count
          }],
          0,
          notes
        )
      }

      if (payment > 0) {
        await addPayment(
          customer.id,
          payment,
          method,
          'پرداخت ثبت‌شده از دستیار ورود'
        )
      }

      setMessage('اطلاعات مشتری، آدرس، سفارش و پرداخت با موفقیت ثبت شد.')

      setRaw('')
      setName('')
      setPhone('')
      setAddress('')
      setProductId('')
      setCustomName('')
      setCustomPrice('')
      setQuantity('1')
      setPaid('0')
      setNotes('')

      await load()
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'خطا در ثبت اطلاعات'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main dir="rtl" style={{
      padding: 16,
      maxWidth: 680,
      margin: '0 auto'
    }}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ثبت سریع و هوشمند</div>
          <h2>دستیار ورود مشتری و سفارش</h2>
        </div>
      </div>

      <section className="card" style={{
        padding: 16,
        display: 'grid',
        gap: 12
      }}>
        <label>
          اطلاعات مشتری و سفارش را بنویس یا با میکروفون کیبورد دیکته کن
        </label>

        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          rows={4}
          placeholder="مثلاً: علی رضایی 09123456789 آدرس: تهران، خیابان ولیعصر، پرداخت ۵۰۰۰۰۰ تومان"
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 10,
            border: '1px solid #ccd2dc',
            font: 'inherit'
          }}
        />

        <button className="primary-btn" onClick={analyze}>
          استخراج اطلاعات
        </button>

        <label>نام مشتری</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="نام و نام خانوادگی"
        />

        <label>شماره موبایل</label>
        <input
          value={phone}
          onChange={e => setPhone(digits(e.target.value))}
          inputMode="tel"
          placeholder="09xxxxxxxxx"
        />

        {existing && (
          <small>
            این شماره قبلاً با نام «{existing.name}» ثبت شده است.
          </small>
        )}

        <label>آدرس مشتری</label>
        <textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          rows={2}
          placeholder="آدرس کامل مشتری"
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 10,
            border: '1px solid #ccd2dc',
            font: 'inherit'
          }}
        />

        <label>نوع سفارش</label>
        <select
          value={productId}
          onChange={e => setProductId(e.target.value)}
        >
          <option value="">انتخاب محصول</option>

          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.price.toLocaleString('fa-IR')} تومان
              (موجودی {p.stock})
            </option>
          ))}

          <option value="custom">
            پک یا محصول متفرقه (بدون انبار)
          </option>
        </select>

        {isCustom && (
          <>
            <label>نام پک یا محصول متفرقه</label>
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="مثلاً پک اقتصادی پاییزه"
            />

            <label>قیمت فروش هر عدد (تومان)</label>
            <input
              value={customPrice}
              onChange={e =>
                setCustomPrice(
                  digits(e.target.value).replace(/[^0-9]/g, '')
                )
              }
              inputMode="numeric"
              placeholder="قیمت هر پک"
            />

            <small>
              این سفارش از موجودی انبار کم نمی‌کند.
            </small>
          </>
        )}

        <label>تعداد</label>
        <input
          value={quantity}
          onChange={e => setQuantity(digits(e.target.value))}
          inputMode="numeric"
        />

        <label>مبلغ پرداخت (تومان)</label>
        <input
          value={paid}
          onChange={e =>
            setPaid(digits(e.target.value).replace(/[^0-9]/g, ''))
          }
          inputMode="numeric"
        />

        <label>روش پرداخت</label>
        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
        >
          {[
            'نقدی',
            'کارت‌به‌کارت',
            'کارت‌خوان',
            'واریز بانکی',
            'سایر'
          ].map(x => <option key={x}>{x}</option>)}
        </select>

        <label>توضیحات</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="اختیاری"
        />

        <div style={{
          background: 'var(--drawer-active,#f2f5fa)',
          padding: 12,
          borderRadius: 10
        }}>
          مبلغ سفارش: <b>{total.toLocaleString('fa-IR')} تومان</b>
        </div>

        <button
          className="primary-btn"
          disabled={busy}
          onClick={submit}
        >
          {busy ? 'در حال ثبت...' : 'تأیید و ثبت مشتری، سفارش و پرداخت'}
        </button>

        {message && <p role="status">{message}</p>}
      </section>
    </main>
  )
}
