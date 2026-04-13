'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Tag,
  Box,
  Calendar,
  DollarSign,
  Loader2,
  Star
} from 'lucide-react'
import api from '../../../lib/api'
import { cn } from '@/lib/utils'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'

interface Product {
  id: string
  name: string
  slug: string
  sku: string
  short_description: string | null
  description: string | null
  price: number
  discount_price: number | null
  cost_price: number | null
  stock_quantity: number
  low_stock_threshold: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'
  status: 'active' | 'draft' | 'archived'
  featured: boolean
  images: string[]
  thumbnail: string | null
  specifications: Record<string, any>
  weight_kg: number | null
  dimensions_cm: any
  shipping_class: string | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
  categories?: Array<{
    category: {
      id: string
      name: string
      slug: string
    }
  }>
  _count?: {
    reviews: number
  }
}

export default function ViewProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchProduct()
  }, [params.id])

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/admin/products/${params.id}`)
      setProduct(response.data.product)
      setSelectedImage(response.data.product.thumbnail || response.data.product.images[0] || null)
    } catch (error) {
      console.error('Failed to fetch product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      await api.delete(`/admin/products/${params.id}`)
      router.push('/products/list')
    } catch (error) {
      console.error('Failed to delete product:', error)
      alert('Failed to delete product')
    }
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'out_of_stock':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
      case 'archived':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </LayoutWrapper>
    )
  }

  if (!product) {
    return (
      <LayoutWrapper>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Product not found</p>
          </div>
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Product ID: {product.id}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/products/${product.id}/edit`)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Edit size={18} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              {/* Main Image */}
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 mb-4">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={48} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {product.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(image)}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2",
                        selectedImage === image
                          ? "border-blue-500"
                          : "border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Information</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">SKU</p>
                    <p className="text-gray-900 dark:text-white font-mono">{product.sku}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Slug</p>
                    <p className="text-gray-900 dark:text-white">{product.slug}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.categories?.map((cat) => (
                      <span
                        key={cat.category.id}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm"
                      >
                        {cat.category.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Short Description</p>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {product.short_description || 'No short description'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Full Description</p>
                  <div className="text-gray-900 dark:text-white mt-1 prose dark:prose-invert max-w-none">
                    {product.description || 'No description'}
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing & Inventory</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{product.price.toLocaleString()}
                  </p>
                </div>
                
                {product.discount_price && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Discount Price</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ₹{product.discount_price.toLocaleString()}
                    </p>
                  </div>
                )}
                
                {product.cost_price && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cost Price</p>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      ₹{product.cost_price.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Stock Quantity</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {product.stock_quantity}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Threshold</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {product.low_stock_threshold}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Stock Status</p>
                  <span className={cn(
                    "inline-block px-3 py-1 rounded-full text-sm font-medium mt-1",
                    getStockStatusColor(product.stock_status)
                  )}>
                    {product.stock_status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Status & Flags */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status & Settings</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <span className={cn(
                    "inline-block px-3 py-1 rounded-full text-sm font-medium mt-1",
                    getStatusColor(product.status)
                  )}>
                    {product.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Featured</p>
                  <span className={cn(
                    "inline-block px-3 py-1 rounded-full text-sm font-medium mt-1",
                    product.featured
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {product.featured ? 'YES' : 'NO'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reviews</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-gray-900 dark:text-white">
                      {product._count?.reviews || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Specifications</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex border-b border-gray-200 dark:border-gray-700 pb-2">
                      <span className="w-1/3 text-sm text-gray-500 dark:text-gray-400">{key}</span>
                      <span className="w-2/3 text-sm text-gray-900 dark:text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping Info */}
            {(product.weight_kg || product.dimensions_cm || product.shipping_class) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shipping Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {product.weight_kg && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Weight</p>
                      <p className="text-gray-900 dark:text-white">{product.weight_kg} kg</p>
                    </div>
                  )}
                  {product.dimensions_cm && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Dimensions (L×W×H)</p>
                      <p className="text-gray-900 dark:text-white">
                        {product.dimensions_cm.length} × {product.dimensions_cm.width} × {product.dimensions_cm.height} cm
                      </p>
                    </div>
                  )}
                  {product.shipping_class && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Shipping Class</p>
                      <p className="text-gray-900 dark:text-white">{product.shipping_class}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(product.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(product.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}