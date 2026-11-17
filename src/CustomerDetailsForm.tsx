
import type { CustomerDetails } from './db/customerDetails'

type Props = {
  value: CustomerDetails
  onChange: (details: CustomerDetails) => void
  disabled?: boolean
}

export default function CustomerDetailsForm({
  value,
  onChange,
  disabled = false
}: Props) {
  function update<K extends keyof CustomerDetails>(
    field: K,
    newValue: CustomerDetails[K]
  ) {
    onChange({
      ...value,
      [field]: newValue
    })
  }

  return (
    <div className="customer-details-form">
      <h3>اطلاعات تکمیلی مشتری</h3>

      <label>
        شماره تماس دوم
        <input
          type="tel"
          value={value.alternatePhone}
          onChange={e => update('alternatePhone', e.target.value)}
          placeholder="شماره جایگزین"
          disabled={disabled}
        />
      </label>

      <label>
        شهر محل سکونت یا فعالیت
        <input
          value={value.city}
          onChange={e => update('city', e.target.value)}
          placeholder="مثلاً تهران"
          disabled={disabled}
        />
      </label>

      <label>
        شغل مشتری
        <input
          value={value.job}
          onChange={e => update('job', e.target.value)}
          placeholder="شغل یا زمینه فعالیت"
          disabled={disabled}
        />
      </label>

      <label>
        نوع مشتری
        <select
          value={value.customerType}
          onChange={e => update('customerType', e.target.value)}
          disabled={disabled}
        >
          <option value="عادی">عادی</option>
          <option value="VIP">VIP</option>
          <option value="عمده">عمده‌فروش</option>
          <option value="همکار">همکار</option>
        </select>
      </label>

      <label>
        منبع آشنایی با مشتری
        <select
          value={value.leadSource}
          onChange={e => update('leadSource', e.target.value)}
          disabled={disabled}
        >
          <option value="">انتخاب کنید</option>
          <option value="اینستاگرام">اینستاگرام</option>
          <option value="واتساپ">واتساپ</option>
          <option value="معرفی مشتری">معرفی مشتری</option>
          <option value="وب‌سایت">وب‌سایت</option>
          <option value="تبلیغات">تبلیغات</option>
          <option value="تماس مستقیم">تماس مستقیم</option>
          <option value="سایر">سایر</option>
        </select>
      </label>

      <label>
        روش ارتباط ترجیحی
        <select
          value={value.preferredContact}
          onChange={e => update('preferredContact', e.target.value)}
          disabled={disabled}
        >
          <option value="">انتخاب کنید</option>
          <option value="تماس تلفنی">تماس تلفنی</option>
          <option value="واتساپ">واتساپ</option>
          <option value="پیامک">پیامک</option>
          <option value="حضوری">حضوری</option>
        </select>
      </label>

      <label>
        علایق و نیازهای مشتری
        <textarea
          value={value.interests}
          onChange={e => update('interests', e.target.value)}
          placeholder="مثلاً علاقه‌مند به محصولات مراقبت پوست..."
          rows={3}
          disabled={disabled}
        />
      </label>

      <label>
        محصولات موردنظر مشتری
        <textarea
          value={value.productsWanted}
          onChange={e => update('productsWanted', e.target.value)}
          placeholder="نام محصولات موردنیاز"
          rows={3}
          disabled={disabled}
        />
      </label>

      <label>
        بودجه تقریبی مشتری (تومان)
        <input
          type="number"
          min="0"
          value={value.budget}
          onChange={e =>
            update('budget', Math.max(0, Number(e.target.value) || 0))
          }
          placeholder="مبلغ به تومان"
          disabled={disabled}
        />
      </label>

      <label>
        آخرین تاریخ ارتباط
        <input
          type="date"
          value={value.lastContact}
          onChange={e => update('lastContact', e.target.value)}
          disabled={disabled}
        />
      </label>

      <label>
        نتیجه مذاکره
        <textarea
          value={value.negotiationResult}
          onChange={e => update('negotiationResult', e.target.value)}
          placeholder="نتیجه آخرین مذاکره با مشتری"
          rows={3}
          disabled={disabled}
        />
      </label>

      <label>
        اولویت پیگیری
        <select
          value={value.priority}
          onChange={e => update('priority', e.target.value)}
          disabled={disabled}
        >
          <option value="کم">کم</option>
          <option value="متوسط">متوسط</option>
          <option value="زیاد">زیاد</option>
          <option value="فوری">فوری</option>
        </select>
      </label>

      <label>
        تاریخ پیگیری بعدی
        <input
          type="date"
          value={value.followUpDate}
          onChange={e => update('followUpDate', e.target.value)}
          disabled={disabled}
        />
      </label>
    </div>
  )
}
