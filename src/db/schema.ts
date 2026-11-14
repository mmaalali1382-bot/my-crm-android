export type Customer = {
  id: string
  name: string
  mobile: string
  company?: string
  source?: string
  stage: string
  notes?: string
  createdAt: string
}

export type Product = {
  id: string
  name: string
  code: string
  price: number
  cost: number
  stock: number
  minStock: number
}

export type Order = {
  id: string
  customerId: string
  items: {
    productId: string
    quantity: number
    price: number
  }[]
  total: number
  paid: number
  status: string
  createdAt: string
}

export type Payment = {
  id: string
  orderId: string
  amount: number
  method: string
  createdAt: string
}

export type Expense = {
  id: string
  title: string
  amount: number
  category: string
  createdAt: string
}

export const CUSTOMER_STAGES = [
  'مشتری جدید',
  'تماس گرفته شد',
  'مشاوره انجام شد',
  'در انتظار خرید',
  'مشتری خریدار',
  'مشتری وفادار'
] as const

export const CURRENCY = 'تومان'
