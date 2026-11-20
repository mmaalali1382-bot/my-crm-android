
import Payments from './Payments'
import CustomerCreditUsage from './CustomerCreditUsage'

export default function PaymentsPage() {
  return (
    <>
      <Payments />
      <CustomerCreditUsage onSaved={async () => {}} />
    </>
  )
}
