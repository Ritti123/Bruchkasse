declare global {
  interface Article {
    ean: string
    articleNumber?: string
    name: string
    unit: string
    price: number
  }

  interface CartItem extends Article {
    quantity: number
  }

  interface Sale {
    id?: number
    date: string
    personnelNumber: string
    items: CartItem[]
    total: number
    paid: boolean
  }
}

export {}
