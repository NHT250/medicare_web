export const mockCategories = [
  {
    _id: 'cat-immune',
    name: 'Immune Support',
    slug: 'immune-support',
    icon: 'fas fa-shield-virus'
  },
  {
    _id: 'cat-pain',
    name: 'Pain Relief',
    slug: 'pain-relief',
    icon: 'fas fa-pills'
  },
  {
    _id: 'cat-sleep',
    name: 'Sleep & Calm',
    slug: 'sleep-calm',
    icon: 'fas fa-moon'
  },
  {
    _id: 'cat-heart',
    name: 'Heart Health',
    slug: 'heart-health',
    icon: 'fas fa-heartbeat'
  }
];

export const mockProducts = [
  {
    _id: 'prod-1',
    name: 'Omega-3 Fish Oil 1200mg',
    description: 'Heart and brain support with triple distilled fish oil capsules.',
    price: 24.99,
    discount: 10,
    rating: 4.8,
    stock: 42,
    is_active: true,
    category: 'heart-health',
    images: [
      'https://images.unsplash.com/photo-1582719478125-5f72a1a4fe27?auto=format&fit=crop&w=600&q=80'
    ],
    brand: 'Nordic Naturals',
    tags: ['supplement', 'omega-3', 'heart'],
    specs: {
      servings: '60 softgels',
      dosage: '2 softgels daily after meals'
    }
  },
  {
    _id: 'prod-2',
    name: 'Vitamin C + Zinc Chewables',
    description: 'Immune boosting chewable tablets with natural orange flavor.',
    price: 14.5,
    discount: 0,
    rating: 4.6,
    stock: 120,
    is_active: true,
    category: 'immune-support',
    images: [
      'https://images.unsplash.com/photo-1612214070475-1d76e870469f?auto=format&fit=crop&w=600&q=80'
    ],
    brand: 'Emergen-C',
    tags: ['immune', 'vitamin'],
    specs: {
      servings: '100 tablets',
      dosage: '1 tablet daily'
    }
  },
  {
    _id: 'prod-3',
    name: 'Melatonin 5mg Gummies',
    description: 'Sugar-free sleep support gummies for calm, restful nights.',
    price: 18.0,
    discount: 5,
    rating: 4.7,
    stock: 64,
    is_active: true,
    category: 'sleep-calm',
    images: [
      'https://images.unsplash.com/photo-1584367369853-8b966cf223f1?auto=format&fit=crop&w=600&q=80'
    ],
    brand: 'Natrol',
    tags: ['sleep', 'gummy'],
    specs: {
      servings: '60 gummies',
      dosage: '2 gummies 30 minutes before bed'
    }
  },
  {
    _id: 'prod-4',
    name: 'Rapid Relief Pain Cream',
    description: 'Topical menthol cream for quick muscular pain relief.',
    price: 12.99,
    discount: 0,
    rating: 4.4,
    stock: 88,
    is_active: true,
    category: 'pain-relief',
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'
    ],
    brand: 'BioFreeze',
    tags: ['pain', 'topical'],
    specs: {
      size: '120ml',
      usage: 'Apply thin layer to affected area up to 4 times daily'
    }
  }
];

export const mockOrders = [
  {
    _id: 'order-1001',
    orderId: 'ORD-1001',
    status: 'Delivered',
    createdAt: '2024-03-10T10:30:00Z',
    updatedAt: '2024-03-11T08:45:00Z',
    subtotal: 57.49,
    shippingFee: 5,
    tax: 4.6,
    total: 67.09,
    shipping: {
      full_name: 'Admin Demo',
      phone: '+1 (555) 987-6543',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
      country: 'USA',
      note: 'Leave at front desk'
    },
    payment: {
      method: 'card',
      status: 'paid'
    },
    items: [
      {
        productId: 'prod-1',
        name: 'Omega-3 Fish Oil 1200mg',
        image: mockProducts[0].images[0],
        price: 24.99,
        quantity: 2,
        subtotal: 49.98
      },
      {
        productId: 'prod-2',
        name: 'Vitamin C + Zinc Chewables',
        image: mockProducts[1].images[0],
        price: 14.5,
        quantity: 1,
        subtotal: 14.5
      }
    ]
  },
  {
    _id: 'order-1002',
    orderId: 'ORD-1002',
    status: 'Processing',
    createdAt: '2024-04-02T14:10:00Z',
    updatedAt: '2024-04-02T16:00:00Z',
    subtotal: 18,
    shippingFee: 5,
    tax: 1.44,
    total: 24.44,
    shipping: {
      full_name: 'Admin Demo',
      phone: '+1 (555) 987-6543',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
      country: 'USA',
      note: ''
    },
    payment: {
      method: 'card',
      status: 'paid'
    },
    items: [
      {
        productId: 'prod-3',
        name: 'Melatonin 5mg Gummies',
        image: mockProducts[2].images[0],
        price: 18,
        quantity: 1,
        subtotal: 18
      }
    ]
  }
];

export const mockCartResponse = {
  items: mockProducts.slice(0, 2).map((product, index) => ({
    productId: product._id,
    name: product.name,
    price: product.price,
    quantity: index + 1,
    subtotal: product.price * (index + 1),
    image: product.images?.[0]
  })),
  subtotal: mockProducts[0].price + mockProducts[1].price * 2,
  shipping_fee: 5,
  total: mockProducts[0].price + mockProducts[1].price * 2 + 5
};
